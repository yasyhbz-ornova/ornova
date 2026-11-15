import assert from "node:assert/strict";
import test from "node:test";
import { EventEmitter } from "node:events";
import { existsSync } from "node:fs";
const path=new URL("../scripts/lib/fixture-process.mjs",import.meta.url),api=existsSync(path)?await import(path.href):{};
function fake(){const child=new EventEmitter();child.stdout=new EventEmitter();child.stderr=new EventEmitter();child.stdin=new EventEmitter();child.kill=()=>{child.killed=(child.killed??0)+1;};return child;}
test("fixture process deadline settles even when transport ignores kill and never closes",async()=>{
  assert.equal(typeof api.startFixtureProcess,"function");const child=fake(),job=api.startFixtureProcess([],{spawnProcess:()=>child,timeoutMs:15});
  await assert.rejects(job.result,/deadline/);assert.equal(child.killed,1);
});
test("fixture process handles close, transport errors and invalid JSON without uncaught callbacks",async()=>{
  assert.equal(typeof api.readFixtureJson,"function");
  const child=fake(),job=api.startFixtureProcess([],{spawnProcess:()=>child,timeoutMs:100});child.stdout.emit("data",Buffer.from('{"created":true}'));child.emit("close",0);assert.deepEqual(api.readFixtureJson(await job.result),{created:true});
  const broken=fake(),pending=api.startFixtureProcess([],{spawnProcess:()=>broken,timeoutMs:100});broken.stdin.emit("error",Error("transport broke"));await assert.rejects(pending.result,/transport broke/);
  assert.throws(()=>api.readFixtureJson({code:0,stdout:"invalid",stderr:""}),/JSON/);assert.throws(()=>api.readFixtureJson({code:1,stdout:"",stderr:"failed"}),/failed/);
});
test("fixture never reports success before checked cleanup and never masks failed teardown",async()=>{
  assert.equal(typeof api.completeVerifiedFixture,"function");const events=[];
  await api.completeVerifiedFixture(async()=>events.push("body"),async()=>events.push("cleanup"),()=>events.push("PASS"));assert.deepEqual(events,["body","cleanup","PASS"]);
  const failed=[];await assert.rejects(api.completeVerifiedFixture(async()=>failed.push("body"),async()=>{throw Error("stop failed");},()=>failed.push("PASS")),/stop failed/);assert.deepEqual(failed,["body"]);
  await assert.rejects(api.completeVerifiedFixture(async()=>{throw Error("body failed");},async()=>{throw Error("cleanup failed");},()=>assert.fail("no report")),error=>error instanceof AggregateError&&error.errors.length===2);
});

test("fixture transport can explicitly run a scoped local psql without invoking Docker",async()=>{
 const child=fake();let observed;const env={PGPASSWORD:"synthetic-only",PGCLIENTENCODING:"UTF8"};
 const job=api.startFixtureProcess(["-qAt"],{executable:"D:/fixture/psql.exe",env,spawnProcess:(command,args,options)=>{observed={command,args,options};return child;}});
 child.emit("close",0);await job.result;assert.equal(observed.command,"D:/fixture/psql.exe");assert.deepEqual(observed.args,["-qAt"]);assert.deepEqual(observed.options.env,env);assert.equal(observed.options.windowsHide,true);
});
