import { spawn } from "node:child_process";

// Deadlines bound transport as well as database statements. Killing a client is
// best effort; checked teardown of its owned container/cluster remains mandatory.
export function startFixtureProcess(args,{timeoutMs=30000,spawnProcess=spawn,executable="docker",env}={}){
  const child=spawnProcess(executable,args,{windowsHide:true,...(env?{env}:{})});
  const result=new Promise((resolve,reject)=>{
    let out="",err="",settled=false,timer;
    const finish=(error,code)=>{
      if(settled)return;settled=true;clearTimeout(timer);
      if(error)reject(error);else resolve({code,stdout:out,stderr:err});
    };
    const fail=error=>{finish(error);try{child.kill();}catch{/* Checked container cleanup remains mandatory. */}};
    timer=setTimeout(()=>fail(Error("Fixture process deadline exceeded")),timeoutMs);
    child.stdout.on("data",value=>{out+=value;});child.stderr.on("data",value=>{err+=value;});
    child.on("error",fail);child.stdin.on("error",fail);child.on("close",code=>finish(null,code));
  });
  return{child,result};
}
export function readFixtureJson(result){
  if(result.code!==0)throw Error(result.stderr||"Fixture process failed");
  return result.stdout.trim()?JSON.parse(result.stdout.trim()):null;
}
export async function completeVerifiedFixture(body,cleanup,onSuccess){
  let failed=false,failure;
  try{await body();}catch(error){failed=true;failure=error;}
  try{await cleanup();}catch(error){if(failed)throw new AggregateError([failure,error],"Fixture and cleanup failed");throw error;}
  if(failed)throw failure;
  return onSuccess();
}
