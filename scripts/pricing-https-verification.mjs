// Opt-in fixture only: local TLS proxy and unchanged native service, no public DNS/host change.
import assert from "node:assert/strict";
import {createServer as createHttpsServer} from "node:https";
import {createConnection} from "node:net";
import {readFileSync,writeFileSync,mkdtempSync,existsSync} from "node:fs";
import {join,resolve} from "node:path";
import {tmpdir} from "node:os";
import {pathToFileURL,fileURLToPath} from "node:url";
import {spawnSync} from "node:child_process";
import {createHash} from "node:crypto";
import {withNativePricing} from "./pricing-native-verification.mjs";
import {dotnetEnvironment} from "./pcs-engine-verification.mjs";
import {startFixtureProcess,readFixtureJson} from "./lib/fixture-process.mjs";

const hostname="pricing.example.com",other="wrong-pricing.example.com";
const cost={schema_version:1,request_id:"48a422dd-a532-4a8d-bb65-49b1a97550ee",method:"cost-plus",policy_version:"synthetic-v1",input:{true_cost_rial:"1000000",mandatory_buffer_rial:"100000",profit_method:"markup",profit_bp:2500,rounding:"none",rounding_step_rial:"0",tax_bp:900,override_pre_tax_rial:null,override_reason:null}};
const gram={...cost,method:"gram-sale",input:{weight_mg:"1500",rate_per_gram_rial:"1000000",under_2g_fee_rial:"4000000",under_4g_fee_rial:"2500000",stone_total_rial:"200000",stone_count:2,setting_per_stone_rial:"100000",packaging_rial:"1500000",logistics_rial:"0",design_rial:"500000"}};
const socketClosed=port=>new Promise(done=>{const socket=createConnection({host:"127.0.0.1",port});let settled=false;const finish=value=>{if(settled)return;settled=true;socket.destroy();done(value);};socket.setTimeout(1000,()=>finish(false));socket.once("connect",()=>finish(false));socket.once("error",error=>finish(error.code==="ECONNREFUSED"));});

export async function verifyPricingHttps(options){
  assert.equal(process.platform,"win32","certificate fixture currently requires Windows PowerShell7");
  assert.ok(options.powerShell&&existsSync(options.powerShell),"explicit PowerShell7 path required");
  const directory=mkdtempSync(join(tmpdir(),"ornova-pricing-https-")),certPath=join(directory,"fixture-cert.pem"),keyPath=join(directory,"fixture-key.pem");
  const quote=value=>`'${value.replaceAll("'","''")}'`;
  const certificateScript=`$rsa=[System.Security.Cryptography.RSA]::Create(2048)
$request=[System.Security.Cryptography.X509Certificates.CertificateRequest]::new('CN=${hostname}',$rsa,[System.Security.Cryptography.HashAlgorithmName]::SHA256,[System.Security.Cryptography.RSASignaturePadding]::Pkcs1)
$san=[System.Security.Cryptography.X509Certificates.SubjectAlternativeNameBuilder]::new()
$san.AddDnsName('${hostname}')
[void]$request.CertificateExtensions.Add($san.Build())
[void]$request.CertificateExtensions.Add([System.Security.Cryptography.X509Certificates.X509BasicConstraintsExtension]::new($false,$false,0,$true))
$cert=$request.CreateSelfSigned([DateTimeOffset]::UtcNow.AddMinutes(-5),[DateTimeOffset]::UtcNow.AddDays(1))
[System.IO.File]::WriteAllText(${quote(certPath)},$cert.ExportCertificatePem())
[System.IO.File]::WriteAllText(${quote(keyPath)},$rsa.ExportPkcs8PrivateKeyPem())
$cert.Dispose()
$rsa.Dispose()`;
  const environment=dotnetEnvironment(process.env,resolve(options.dotnet),directory);
  const generated=spawnSync(resolve(options.powerShell),["-NoProfile","-NonInteractive","-Command",certificateScript],{env:environment,encoding:"utf8",timeout:15000,windowsHide:true});
  assert.equal(generated.status,0,generated.stderr||"synthetic certificate generation failed");
  const preload=join(directory,"fixture-dns.cjs");
  writeFileSync(preload,`const dns=require('node:dns');dns.lookup=(host,options,callback)=>{if(typeof options==='function'){callback=options;options={};}if(!${JSON.stringify([hostname,other])}.includes(host)){const error=Object.assign(Error('External fixture DNS blocked'),{code:'FIXTURE_DNS_BLOCKED'});return process.nextTick(()=>callback(error));}process.nextTick(()=>options?.all?callback(null,[{address:'127.0.0.1',family:4}]):callback(null,'127.0.0.1',4));};`);
  const runner=join(directory,"tls-client.mjs");
  writeFileSync(runner,`import assert from 'node:assert/strict';import{loadTs}from ${JSON.stringify(pathToFileURL(fileURLToPath(new URL("../tests/helpers/load-ts.mjs",import.meta.url))).href)};
const client=loadTs('lib/pricing/client.ts',{'server-only':{}}),fixture=JSON.parse(process.env.ORNOVA_FIXTURE_TLS_INPUT),config={url:fixture.origin+'/v1/preview',allowedOrigin:fixture.origin,token:fixture.token,transport:'https'};
let transportFailure=null;
const fetcher=async(url,init)=>{try{return await fetch(url,{...init,headers:{...init.headers,'X-Ornova-Fixture-Mode':fixture.mode}});}catch(error){transportFailure=error.cause?.code;throw error;}};
const calculate=(value=fixture.cost,configuration=config)=>client.requestPricingPreview(value,configuration,fetcher);
if(fixture.mode==='untrusted'){await assert.rejects(()=>calculate(),/Pricing unavailable/);assert.ok(['DEPTH_ZERO_SELF_SIGNED_CERT','SELF_SIGNED_CERT_IN_CHAIN','UNABLE_TO_VERIFY_LEAF_SIGNATURE'].includes(transportFailure),transportFailure);}
else if(fixture.mode==='wrong-host'){await assert.rejects(()=>calculate(),/Pricing unavailable/);assert.equal(transportFailure,'ERR_TLS_CERT_ALTNAME_INVALID');}
else if(fixture.mode==='normal'){assert.equal((await calculate()).result.total_rial,'1362500');assert.equal((await calculate(fixture.gram)).result.total_rial,'7900000');const big=structuredClone(fixture.cost);Object.assign(big.input,{true_cost_rial:'9007199254740993',mandatory_buffer_rial:'0',profit_bp:0,tax_bp:0});assert.equal((await calculate(big)).result.total_rial,'9007199254740993');}
else{await assert.rejects(()=>calculate(fixture.cost,fixture.mode==='wrong-token'?{...config,token:'b'.repeat(64)}:config),error=>error.message==='Pricing unavailable'&&!error.message.includes(fixture.token));}
console.log(JSON.stringify({passed:true,mode:fixture.mode,transport_failure_code:transportFailure}));`);
  const checks=[];let nativePort,proxyPort,requestCount=0,nativeRequests=0,leakRequests=0,proxyStopped=false;
  await withNativePricing(options,async native=>{
    nativePort=Number(new URL(native.url).port);
    const sockets=new Set();
    const proxy=createHttpsServer({cert:readFileSync(certPath),key:readFileSync(keyPath)},async(request,response)=>{
      requestCount++;
      if(request.url!=="/v1/preview"){leakRequests++;response.writeHead(500).end();return;}
      const mode=request.headers["x-ornova-fixture-mode"];
      if(mode==="redirect"){response.writeHead(302,{Location:`https://${hostname}:${proxyPort}/leak`}).end();return;}
      if(mode==="private-error"){response.writeHead(500).end("PRIVATE-UPSTREAM-DETAIL");return;}
      if(mode==="oversized"){response.writeHead(200,{"Content-Type":"application/json"}).end(" ".repeat(65537));return;}
      try{
        let body="";for await(const chunk of request){body+=chunk;if(Buffer.byteLength(body)>65536)throw Error("fixture body cap");}
        nativeRequests++;
        const upstream=await fetch(native.url,{method:"POST",headers:{Authorization:request.headers.authorization??"","Content-Type":"application/json"},body,redirect:"error",signal:AbortSignal.timeout(10000)});
        const text=await upstream.text();response.writeHead(upstream.status,{"Content-Type":"application/json"});
        if(mode==="swapped"){const swapped=JSON.parse(text);swapped.request_id="11111111-1111-4111-8111-111111111111";response.end(JSON.stringify(swapped));}else response.end(text);
      }catch{response.writeHead(503).end();}
    });
    proxy.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket));});
    await new Promise((done,fail)=>{proxy.once("error",fail);proxy.listen(0,"127.0.0.1",done);});proxyPort=proxy.address().port;
    try{
      for(const mode of ["normal","wrong-token","redirect","private-error","oversized","swapped","wrong-host","untrusted"]){
        const before=requestCount,origin=`https://${mode==="wrong-host"?other:hostname}:${proxyPort}`;
        const {child,result}=startFixtureProcess(["--require",preload,runner],{executable:process.execPath,env:{...environment,...(mode==="untrusted"?{}:{NODE_EXTRA_CA_CERTS:certPath}),ORNOVA_FIXTURE_TLS_INPUT:JSON.stringify({origin,token:native.token,cost,gram,mode})}});
        child.stdin.end();const value=readFixtureJson(await result);assert.equal(value.passed,true);checks.push(value);
        if(mode==="wrong-host"||mode==="untrusted")assert.equal(requestCount,before,"TLS failure must occur before any HTTP/credential-bearing request");
      }
      assert.equal(requestCount,8);assert.equal(nativeRequests,5);assert.equal(leakRequests,0);
    }finally{
      const closed=new Promise(done=>proxy.close(done));for(const socket of sockets)socket.destroy();await closed;proxyStopped=await socketClosed(proxyPort);assert.ok(proxyStopped,"owned TLS endpoint must be gone");
    }
  });
  assert.ok(await socketClosed(nativePort),"owned native endpoint must be gone");
  const evidence={passed:true,synthetic:true,completed_at:new Date().toISOString(),checks,proxy_requests:requestCount,native_requests:nativeRequests,redirect_followups:leakRequests,teardown_verified:proxyStopped,client_sha256:createHash("sha256").update(readFileSync(new URL("../lib/pricing/client.ts",import.meta.url))).digest("hex"),certificate_sha256:createHash("sha256").update(readFileSync(certPath)).digest("hex"),scope:"actual child-local CA/hostname-validated TLS proxy to unchanged native C#; no real external service/DNS/account/rate/rollout"};
  writeFileSync(join(directory,"evidence.json"),JSON.stringify(evidence,null,2));return{directory,evidence};
}
