import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import test from "node:test";

const require = createRequire(import.meta.url);
const ts = require("typescript");
function load(path, dependencies = {}) {
  const source = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const loadedModule = { exports: {} };
  new Function("require", "exports", "module", compiled.outputText)(
    (name) => name === "server-only" ? {} : dependencies[name] ?? require(name), loadedModule.exports, loadedModule);
  return loadedModule.exports;
}
const gateway = load("lib/ai/gateway.ts");
const env = { ORNOVA_AI_ENABLED: "true", ORNOVA_AI_BASE_URL: "http://127.0.0.1:20128/v1/",
  ORNOVA_AI_API_KEY: "test-secret", ORNOVA_AI_TEXT_MODEL: "test-text", ORNOVA_AI_IMAGE_MODEL: "test-image" };
const config = gateway.getAiConfig(env);
const failure = (code) => (error) => error instanceof gateway.AiGatewayError && error.code === code;

test("AI credentials are scoped, optional capability stays disabled, and unsafe gateway URLs fail closed", () => {
  assert.throws(() => gateway.getAiConfig({}), failure("disabled"));
  assert.throws(() => gateway.getAiConfig({ ...env, ORNOVA_AI_API_KEY: "" }), failure("configuration"));
  assert.throws(() => gateway.getAiConfig({ ...env, VERCEL: "1" }), failure("configuration"));
  for (const url of ["http://provider.example/v1", "https://key@provider.example/v1", "https://provider.example/v1?key=secret", "file:///tmp/key"]) {
    assert.throws(() => gateway.getAiConfig({ ...env, ORNOVA_AI_BASE_URL: url }), failure("configuration"));
  }
  assert.equal(config.baseUrl, "http://127.0.0.1:20128/v1");
});

test("AI preview access uses trusted staff metadata or an explicit user ID, never customer-supplied claims", () => {
  assert.equal(gateway.canPreviewAi({ id: "a", app_metadata: { ornova_role: "staff" } }, {}), true);
  assert.equal(gateway.canPreviewAi({ id: "a", user_metadata: { ornova_role: "staff" } }, {}), false);
  assert.equal(gateway.canPreviewAi({ id: "a" }, { ORNOVA_AI_PREVIEW_USER_IDS: " b, a " }), true);
  assert.equal(gateway.canPreviewAi({ id: "a" }, { ORNOVA_AI_PREVIEW_USER_IDS: "aa" }), false);
});

test("the server sends only the selected idea to its configured model and refuses redirects", async () => {
  let received;
  const brief = await gateway.createAiBrief("یک انگشتر نقره", config, async (url, options) => {
    received = { url, options, body: JSON.parse(options.body) };
    return Response.json({ choices: [{ message: { content: "شرح پیشنهادی" } }] });
  });
  assert.equal(brief, "شرح پیشنهادی");
  assert.equal(received.url, "http://127.0.0.1:20128/v1/chat/completions");
  assert.equal(received.options.redirect, "error");
  assert.equal(received.options.cache, "no-store");
  assert.equal(received.body.model, "test-text");
  assert.deepEqual(received.body.messages[1], { role: "user", content: "یک انگشتر نقره" });
  assert.equal(received.body.messages.length, 2);
  assert.ok(!JSON.stringify(received.body).includes("test-secret"));
});

test("provider errors, malformed responses, empty replies and oversized bodies never become successful AI output", async () => {
  await assert.rejects(gateway.createAiBrief("ایده", config, async () => new Response("secret provider details", { status: 403 })), failure("unavailable"));
  await assert.rejects(gateway.createAiBrief("ایده", config, async () => new Response("rate details", { status: 429 })), failure("rate_limit"));
  await assert.rejects(gateway.createAiBrief("ایده", config, async () => new Response("not json")), failure("unavailable"));
  await assert.rejects(gateway.createAiBrief("ایده", config, async () => Response.json({ choices: [{ message: { content: " " } }] })), failure("invalid_response"));
  await assert.rejects(gateway.readLimitedBody(new Response("x".repeat(100)), 10), failure("invalid_response"));
});

test("image capability must be configured separately and accepts binary images rather than arbitrary provider URLs", async () => {
  let called = false;
  await assert.rejects(gateway.createAiImage("ایده", { ...config, imageModel: "" }, async () => { called = true; }), failure("configuration"));
  assert.equal(called, false);
  await assert.rejects(gateway.createAiImage("ایده", config, async () => Response.json({ data: [{ url: "http://127.0.0.1/private" }] })), failure("invalid_response"));
  const image = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a+GQAAAAASUVORK5CYII=", "base64");
  const result = await gateway.createAiImage("ایده", config, async () => Response.json({ data: [{ b64_json: image.toString("base64") }] }));
  assert.equal(result.mime, "image/png");
  assert.deepEqual(result.bytes, image);
  await assert.rejects(gateway.createAiImage("ایده", config, async () => Response.json({ data: [{ b64_json: Buffer.from("<svg>invalid</svg>").toString("base64") }] })), failure("invalid_response"));
});

function route({ user = null, allowed = false, answer = "پیشنهاد", error = null } = {}) {
  let calls = 0;
  const ai = { ...gateway, canPreviewAi: () => allowed, getAiConfig: () => config,
    createAiBrief: async () => { calls++; if (error) throw error; return answer; } };
  const result = load("app/api/ai/design/route.ts", {
    "next/server": { NextResponse: { json: (body, options) => Response.json(body, options) } },
    "@/lib/auth/authorization": { isSameOriginRequest: (request) => request.headers.get("origin") === new URL(request.url).origin },
    "@/lib/supabase/server": { createSupabaseServerClient: async () => ({ auth: { getUser: async () => ({ data: { user } }) } }) },
    "@/lib/ai/gateway": ai,
  });
  return { post: result.POST, calls: () => calls };
}
const request = (body, origin = "http://localhost:3063") => new Request("http://localhost:3063/api/ai/design", {
  method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body),
});
const body = { operation: "brief", idea: "انگشتر نقره", consent: true };

test("AI route blocks cross-origin, anonymous, non-preview and non-consensual calls before contacting the provider", async () => {
  const anonymous = route();
  assert.equal((await anonymous.post(request(body, "http://other.example"))).status, 403);
  assert.equal((await anonymous.post(request(body))).status, 401);
  assert.equal(anonymous.calls(), 0);
  const ordinary = route({ user: { id: "a" } });
  assert.equal((await ordinary.post(request(body))).status, 403);
  const preview = route({ user: { id: "a" }, allowed: true });
  for (const invalid of [{ ...body, consent: false }, { ...body, idea: "x".repeat(1501) }, { ...body, operation: "admin" }, { ...body, padding: "x".repeat(9000) }]) {
    assert.equal((await preview.post(request(invalid))).status, 400);
  }
  assert.equal(preview.calls(), 0);
});

test("AI route returns private reviewed-state output and a safe error instead of upstream details", async () => {
  const preview = route({ user: { id: "a" }, allowed: true });
  const response = await preview.post(request(body));
  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control"), /private, no-store/);
  assert.deepEqual(await response.json(), { brief: "پیشنهاد", design_state: "awaiting_review" });
  const failing = route({ user: { id: "a" }, allowed: true, error: new gateway.AiGatewayError("unavailable") });
  const failureResponse = await failing.post(request(body));
  assert.equal(failureResponse.status, 503);
  assert.ok(!(await failureResponse.text()).includes("test-secret"));
});
