import assert from "node:assert/strict";
import test from "node:test";
import {existsSync,mkdtempSync,writeFileSync,rmSync,rmdirSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
const path=new URL("../scripts/lib/portable-postgres-fixture.mjs",import.meta.url),api=existsSync(path)?await import(path.href):{};
test("portable fixture child environment cannot inherit a real DB/service/provider configuration",()=>{
 assert.equal(typeof api.fixturePostgresEnv,"function");const env=api.fixturePostgresEnv({SystemRoot:"C:/Windows",PATH:"test-path",PGHOST:"real-host",PGPORT:"5432",PGSERVICE:"real",PGPASSWORD:"real-secret",DATABASE_URL:"real",PROVIDER_KEY:"private",APPDATA:"profile"},"synthetic-only");
 assert.equal(env.PGPASSWORD,"synthetic-only");assert.equal(env.PGHOST,undefined);assert.equal(env.PGPORT,undefined);assert.equal(env.PGSERVICE,undefined);assert.equal(env.DATABASE_URL,undefined);assert.equal(env.PROVIDER_KEY,undefined);assert.equal(env.APPDATA,undefined);assert.equal(env.PGCLIENTENCODING,"UTF8");assert.equal(env.SystemRoot,"C:/Windows");
});
test("portable cleanup accepts only a fresh child directory with its matching ownership marker",()=>{
 assert.equal(typeof api.assertOwnedFixtureDirectory,"function");const root=mkdtempSync(join(tmpdir(),"ornova-pg-safety-")),owned=mkdtempSync(join(root,"ornova-pg-fixture-")),other=mkdtempSync(join(root,"unrelated-"));
 try{writeFileSync(join(owned,"fixture-owner.json"),JSON.stringify({kind:"ornova-portable-postgres-test",token:"test-owned"}));assert.equal(api.assertOwnedFixtureDirectory(root,owned,"test-owned"),owned);assert.throws(()=>api.assertOwnedFixtureDirectory(root,owned,"wrong"),/ownership/);assert.throws(()=>api.assertOwnedFixtureDirectory(root,root,"test-owned"),/target/);assert.throws(()=>api.assertOwnedFixtureDirectory(root,other,"test-owned"),/target/);}finally{rmSync(owned,{recursive:true});rmSync(other,{recursive:true});rmdirSync(root);}
});
