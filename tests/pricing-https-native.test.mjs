import assert from "node:assert/strict";
import test from "node:test";
import {verifyPricingHttps} from "../scripts/pricing-https-verification.mjs";
const options={dotnet:process.env.ORNOVA_TEST_DOTNET,source:process.env.ORNOVA_TEST_PCS_SOURCE,packages:process.env.ORNOVA_TEST_PACKAGES,powerShell:process.env.ORNOVA_TEST_POWERSHELL};
test("real native HTTPS: scoped TLS trust, exact methods/integers, auth, redirects and malformed responses",{skip:!Object.values(options).every(Boolean),timeout:120000},async()=>{
 const result=await verifyPricingHttps(options);assert.equal(result.evidence.passed,true);assert.equal(result.evidence.teardown_verified,true);assert.equal(result.evidence.checks.length,8);console.log(`HTTPS evidence: ${result.directory}`);
});
