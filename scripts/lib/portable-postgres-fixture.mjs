import assert from "node:assert/strict";
import {randomBytes,createHash} from "node:crypto";
import {existsSync,mkdtempSync,readFileSync,realpathSync,writeFileSync,unlinkSync,rmSync} from "node:fs";
import {basename,isAbsolute,join,relative,resolve,sep} from "node:path";
import {createServer,createConnection} from "node:net";
import {spawnSync} from "node:child_process";
import {startFixtureProcess} from "./fixture-process.mjs";

export function fixturePostgresEnv(base,password){
  const system=new Set(["SYSTEMROOT","WINDIR","SYSTEMDRIVE","COMSPEC","TEMP","TMP","PATH","PATHEXT"]);
  return {...Object.fromEntries(Object.entries(base).filter(([key])=>system.has(key.toUpperCase()))),PGPASSWORD:password,PGCLIENTENCODING:"UTF8",PGCONNECT_TIMEOUT:"3",PGTZ:"UTC"};
}

export function assertOwnedFixtureDirectory(root,target,token){
  const base=realpathSync(root),directory=realpathSync(target),child=relative(base,directory);
  assert.ok(child&&!child.startsWith(`..${sep}`)&&child!==".."&&!isAbsolute(child)&&basename(directory).startsWith("ornova-pg-fixture-"),"unsafe portable fixture target");
  const owner=JSON.parse(readFileSync(join(directory,"fixture-owner.json"),"utf8"));
  assert.ok(owner.kind==="ornova-portable-postgres-test"&&owner.token===token,"portable fixture ownership mismatch");
  return directory;
}

function unusedLoopbackPort(){return new Promise((resolvePort,reject)=>{
  const server=createServer();server.once("error",reject);server.listen(0,"127.0.0.1",()=>{const port=server.address().port;server.close(error=>error?reject(error):resolvePort(port));});
});}
function portClosed(port){return new Promise(resolveClosed=>{
  const socket=createConnection({host:"127.0.0.1",port});let settled=false;
  const finish=value=>{if(settled)return;settled=true;socket.destroy();resolveClosed(value);};
  socket.setTimeout(2000,()=>finish(false));socket.once("connect",()=>finish(false));socket.once("error",error=>finish(error.code==="ECONNREFUSED"));
});}

/** Never attach to an existing server: create an owned cluster and explicit loopback connection. */
export function createPortablePostgresFixture({binDirectory,temporaryRoot}){
  assert.equal(process.platform,"win32","portable fixture currently supports Windows binaries only");
  assert.ok(isAbsolute(binDirectory)&&isAbsolute(temporaryRoot),"portable paths must be absolute");
  const bin=realpathSync(binDirectory),base=realpathSync(temporaryRoot),env=fixturePostgresEnv(process.env,randomBytes(32).toString("hex"));
  const executable=name=>join(bin,`${name}.exe`);
  for(const name of ["postgres","initdb","pg_ctl","psql"])assert.ok(existsSync(executable(name)),`missing portable ${name}`);
  const invoke=(name,args,input,commandEnv=env)=>spawnSync(executable(name),args,{env:commandEnv,input,encoding:"utf8",timeout:30000,windowsHide:true,maxBuffer:8*1024*1024});
  const run=(name,args,input)=>{const result=invoke(name,args,input);if(result.status!==0)throw Error(result.stderr||result.error?.message||`${name} fixture process failed`);return result.stdout.trim();};
  const version=run("postgres",["--version"]);assert.match(version,/PostgreSQL\) 18\./,"fixture requires PostgreSQL18");
  const directory=mkdtempSync(join(base,"ornova-pg-fixture-")),token=randomBytes(24).toString("hex"),data=join(directory,"data");
  writeFileSync(join(directory,"fixture-owner.json"),JSON.stringify({kind:"ornova-portable-postgres-test",token}));
  let port=null,cleaned=false,serverVersion=null;
  const args=()=>{assert.ok(port,"portable fixture has no owned endpoint");return["-X","-h","127.0.0.1","-p",String(port),"-d","postgres","-U","postgres","-qAt","-v","ON_ERROR_STOP=1"];};
  return {
    temporaryRoot:base,
    description(){return{kind:"portable-postgres",version,server_version:serverVersion,loopback_only:true,scram:true,owned_data_removed:cleaned,binary_sha256:Object.fromEntries(["postgres","initdb","pg_ctl","psql"].map(name=>[name,createHash("sha256").update(readFileSync(executable(name))).digest("hex")]))};},
    async start(){
      assertOwnedFixtureDirectory(base,directory,token);
      const passwordFile=join(directory,"init-password");writeFileSync(passwordFile,env.PGPASSWORD,{mode:0o600});
      try{run("initdb",["-D",data,"-U","postgres","--pwfile",passwordFile,"--auth=scram-sha-256","--no-locale","--encoding=UTF8"]);}finally{if(existsSync(passwordFile))unlinkSync(passwordFile);}
      port=await unusedLoopbackPort();
      run("pg_ctl",["start","-D",data,"-l",join(directory,"server.log"),"-w","-t","20","-o",`-h 127.0.0.1 -p ${port} -c max_connections=20 -c lc_messages=C`]);
      assert.equal(run("psql",args(),"select current_setting('port');"),String(port));
      assert.equal(run("psql",args(),"select current_setting('listen_addresses');"),"127.0.0.1");
      assert.equal(resolve(run("psql",args(),"show data_directory;")).toLowerCase(),resolve(data).toLowerCase(),"SQL endpoint must be this fresh cluster");
      serverVersion=run("psql",args(),"show server_version;");assert.match(serverVersion,/^18\./);
      const denied=invoke("psql",[...args(),"--no-password"],"select 1;",{...env,PGPASSWORD:"deliberately-wrong-fixture-password"});
      assert.equal(denied.status,2,"wrong fixture password must be rejected");assert.match(denied.stderr,/password authentication failed/i);
    },
    sql(query){return run("psql",args(),`set statement_timeout='10s';${query}`);},
    session(){return startFixtureProcess(args(),{executable:executable("psql"),env});},
    async cleanup(){
      if(cleaned)return;
      assertOwnedFixtureDirectory(base,directory,token);
      if(existsSync(join(data,"PG_VERSION"))){
        const status=invoke("pg_ctl",["status","-D",data]);
        if(status.status===0)run("pg_ctl",["stop","-D",data,"-m","fast","-w","-t","20"]);
        else assert.equal(status.status,3,"cannot verify owned cluster status; retained data");
        assert.equal(invoke("pg_ctl",["status","-D",data]).status,3,"owned cluster must be stopped before cleanup");
      }
      assert.ok(!existsSync(join(data,"postmaster.pid")),"owned postmaster PID file must be gone");
      if(port!==null)assert.ok(await portClosed(port),"owned loopback endpoint must be closed");
      // Only the fresh, marker-verified child above is eligible for recursive removal.
      const owned=assertOwnedFixtureDirectory(base,directory,token);assert.equal(resolve(owned),resolve(directory));
      rmSync(owned,{recursive:true});assert.ok(!existsSync(owned));cleaned=true;
    },
  };
}
