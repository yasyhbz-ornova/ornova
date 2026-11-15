import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";
const client = loadTs("lib/pricing/client.ts", { "server-only": {} });
const config = { url: "http://127.0.0.1:31234/v1/preview", token: "a".repeat(64) };
const value = { schema_version: 1, request_id: "48a422dd-a532-4a8d-bb65-49b1a97550ee", method: "cost-plus", policy_version: "synthetic-v1", input: { true_cost_rial: "1000000", mandatory_buffer_rial: "100000", profit_method: "markup", profit_bp: 2500, rounding: "none", rounding_step_rial: "0", tax_bp: 900, override_pre_tax_rial: null, override_reason: null } };
const result = { ...value, algorithm_version: "pcs-standard-48c17189-v1", result: { cost_floor_rial: "1100000", target_rial: "1250000", pre_tax_rial: "1250000", tax_rial: "112500", total_rial: "1362500", effective_margin_bp: 2000, warnings: [] } };
async function refusesBeforeFetch(configuration){let requests=0;await assert.rejects(()=>client.requestPricingPreview(value,configuration,async()=>{requests++;throw Error("unexpected fixture dispatch");}),/Pricing unavailable/);assert.equal(requests,0,"invalid configuration must not dispatch credentials");}
test("local pricing connector is off by default and refuses unsafe destinations/secrets", async () => {
  assert.equal(client.pricingConfig({}), null);
  assert.deepEqual(client.pricingConfig({ ORNOVA_PRICING_ENABLED: "true", ORNOVA_PRICING_URL: config.url, ORNOVA_PRICING_TOKEN: config.token }), config);
  for (const url of ["https://example.com/v1/preview", "http://localhost:31234/v1/preview", "http://127.0.0.1:31234/v1/preview?token=x", "http://u:p@127.0.0.1:31234/v1/preview", "http://127.0.0.1:31234/other"]) {
    await refusesBeforeFetch({ ...config, url });
  }
  await refusesBeforeFetch({ ...config, token: "short" });
});
test("connector sends only explicit validated inputs and prevents redirect/cache", async () => {
  const actual = await client.requestPricingPreview(value, config, async (url, init) => {
    assert.equal(url, config.url); assert.equal(init.redirect, "error"); assert.equal(init.cache, "no-store");
    assert.equal(init.headers.Authorization, `Bearer ${config.token}`); assert.deepEqual(JSON.parse(init.body), value);
    assert.ok(init.signal); return Response.json(result);
  });
  assert.deepEqual(actual, result);
});
test("connector rejects swapped input, oversized/malformed/negative upstream and generic failures", async () => {
  const swapped = structuredClone(result); swapped.input.tax_bp = 0;
  for (const response of [Response.json(swapped), new Response(" ".repeat(65537)), new Response("{"), Response.json({ code: "BELOW_FLOOR" }, { status: 422 }), new Response("private internal details", { status: 500 })]) {
    await assert.rejects(() => client.requestPricingPreview(value, config, async () => response), error => !error.message.includes("private internal"));
  }
});

const hosted={url:"https://pricing.example.com/v1/preview",token:config.token,transport:"https",allowedOrigin:"https://pricing.example.com"};
test("HTTPS requires an explicit matching server origin and preserves the local connector by default",()=>{
 const env={ORNOVA_PRICING_ENABLED:"true",ORNOVA_PRICING_TRANSPORT:"https",ORNOVA_PRICING_URL:hosted.url,ORNOVA_PRICING_ALLOWED_ORIGIN:hosted.allowedOrigin,ORNOVA_PRICING_TOKEN:hosted.token};
 assert.deepEqual(client.pricingConfig(env),hosted);
 for(const patch of [{ORNOVA_PRICING_TRANSPORT:"unknown"},{ORNOVA_PRICING_ALLOWED_ORIGIN:undefined},{ORNOVA_PRICING_ALLOWED_ORIGIN:"https://other.example.com"},{ORNOVA_PRICING_ALLOWED_ORIGIN:"https://pricing.example.com/"},{ORNOVA_PRICING_ENABLED:"false"}])assert.equal(client.pricingConfig({...env,...patch}),null);
});
test("HTTPS rejects unsafe or ambiguous origins/paths before any token-bearing request",async()=>{
 for(const origin of ["http://pricing.example.com","https://127.0.0.1","https://[::1]","https://localhost","https://a.localhost","https://a.internal","https://a.local","https://metadata.google.internal","https://pricing.example.com.","https://user:password@pricing.example.com"]){
  await refusesBeforeFetch({...hosted,url:origin+"/v1/preview",allowedOrigin:origin});
 }
 for(const suffix of ["/other","/v1/preview?x=1","/v1/preview#data","/v1/preview?","/v1/preview#","/x/../v1/preview","/v1/%70review"]){await refusesBeforeFetch({...hosted,url:hosted.allowedOrigin+suffix});}
});
test("HTTPS request revalidates its pin and keeps credentials/context server-side with all existing limits",async()=>{
 await refusesBeforeFetch({...hosted,allowedOrigin:"https://other.example.com"});
 const actual=await client.requestPricingPreview(value,hosted,async(url,init)=>{assert.equal(url,hosted.url);assert.equal(init.redirect,"error");assert.equal(init.cache,"no-store");assert.equal(init.headers.Authorization,`Bearer ${hosted.token}`);assert.deepEqual(JSON.parse(init.body),value);assert.ok(init.signal);return Response.json(result);});assert.deepEqual(actual,result);
});
