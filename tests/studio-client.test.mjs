import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
const require = createRequire(import.meta.url);
const ts = require("typescript");
function compile(path) { return ts.transpileModule(readFileSync(new URL(`../${path}`, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText; }
const conversation = { exports: {} };
new Function("exports", compile("lib/studio/conversation.ts"))(conversation.exports);
const handoff = { exports: {} };
new Function("require", "exports", compile("lib/studio/inquiry-handoff.ts"))((name) => name === "./conversation" ? conversation.exports : require(name), handoff.exports);
const id = "f228f201-fcec-40f0-b00a-02cfdb442381";
const answers = ["انگشتر", "برگ", "نقره", "اندازه بعداً"];

// Exercise the real component's handlers and state; only React rendering, browser
// storage, auth and fetch boundaries are replaced. No live account or provider.
function client({ responseStatus = 401, imageMode = "preview" } = {}) {
  let sessionId = "user-a", cursor = 0, pending = [], tree, requests = [], destination, authCalls = 0;
  const hooks = [];
  const values = new Map([[`ornova:studio:${id}`, JSON.stringify({ version: 1, id, ownerId: "user-a", answers, input: "", expiresAt: Date.now() + 600000 })]]);
  const storage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
  const tabValues = new Map();
  const tabStorage = { getItem: (key) => tabValues.get(key) ?? null, setItem: (key, value) => tabValues.set(key, value) };
  const react = {
    useState(initial) { const index = cursor++; hooks[index] ??= { value: typeof initial === "function" ? initial() : initial }; return [hooks[index].value, (value) => { hooks[index].value = typeof value === "function" ? value(hooks[index].value) : value; }]; },
    useRef(initial) { const index = cursor++; hooks[index] ??= { current: initial }; return hooks[index]; },
    useEffect(effect, deps) { const index = cursor++; if (!hooks[index] || deps.some((v, i) => v !== hooks[index][i])) { hooks[index] = deps; pending.push(effect); } },
  };
  const jsx = { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }), Fragment: "fragment" };
  const loaded = { exports: {} };
  const auth = { createSupabaseBrowserClient: () => ({ auth: { getUser: async () => { authCalls++; return { data: { user: sessionId ? { id: sessionId } : null }, error: null }; } } }) };
  const fetcher = async (_url, options) => { requests.push(JSON.parse(options.body)); return Response.json({ error: "نشست منقضی شده است" }, { status: responseStatus }); };
  new Function("require", "exports", "localStorage", "window", "fetch", compile("components/studio/DesignStudio.tsx"))((name) => {
    if (name === "react") return react;
    if (name === "react/jsx-runtime") return jsx;
    if (name === "next/link") return { default: "a" };
    if (name === "next/image") return { default: "img" };
    if (name === "next/navigation") return { useRouter: () => ({ push: (value) => { destination = value; } }) };
    if (name.endsWith(".module.css")) return { default: new Proxy({}, { get: (_obj, key) => String(key) }) };
    if (name === "@/lib/studio/conversation") return conversation.exports;
    if (name === "@/lib/studio/inquiry-handoff") return handoff.exports;
    if (name === "@/lib/supabase/client") return auth;
    return require(name);
  }, loaded.exports, storage, { localStorage: storage, sessionStorage: tabStorage, location: { assign: (value) => { destination = value; } } }, fetcher);
  function render() { cursor = 0; tree = loaded.exports.DesignStudio({ draftId: id, userId: "user-a", imageMode }); const effects = pending; pending = []; if (effects.length) { effects.forEach((effect) => effect()); return render(); } return tree; }
  function nodes(node) { if (!node || typeof node !== "object") return []; return [node, ...[node.props?.children].flat(Infinity).flatMap((child) => nodes(child))]; }
  const text = (node) => typeof node === "string" ? node : !node || typeof node !== "object" ? "" : [node.props?.children].flat(Infinity).map(text).join("");
  const button = (label) => { const found = nodes(tree).find((n) => n.type === "button" && text(n) === label); assert.ok(found, `button not found: ${label}`); return found; };
  render();
  return { render, button, hasButton: (label) => nodes(tree).some((n) => n.type === "button" && text(n) === label), authCalls: () => authCalls, handoffDraft: () => JSON.parse(tabValues.get("ornova-inquiry-draft") ?? "null"), setSession: (value) => { sessionId = value; }, consent() { nodes(tree).find((n) => n.type === "input" && n.props.type === "checkbox").props.onChange({ target: { checked: true } }); render(); }, requests: () => requests, draft: () => JSON.parse(values.get(`ornova:studio:${id}`) ?? "null"), destination: () => destination };
}

test("expired generation session never downgrades an owned draft into a guest handoff", async () => {
  const c = client();
  await c.button("ادامه برای ساخت تصویر").props.onClick(); c.render(); c.consent();
  await c.button("ساخت تصویر و ذخیره در گالری من").props.onClick(); c.render();
  c.button("ورود و نگه‌داشتن ایده برای ادامه").props.onClick();
  assert.equal(c.draft().ownerId, "user-a");
  assert.equal(conversation.exports.parseStudioDraft(JSON.stringify(c.draft()), id, "user-b"), null);
  assert.match(c.destination(), /^\/login\?next=/);
});

test("switching accounts after checking the consent gate cannot submit the previous account's idea", async () => {
  const c = client();
  await c.button("ادامه برای ساخت تصویر").props.onClick(); c.render(); c.consent(); c.setSession("user-b");
  await c.button("ساخت تصویر و ذخیره در گالری من").props.onClick(); c.render();
  assert.equal(c.requests().length, 0, "must recheck the checked owner before sending this idea");
});

test("customer can explicitly remove the restored device draft without deleting gallery data", () => {
  const c = client();
  c.button("پاک‌کردن پیش‌نویس این دستگاه").props.onClick();
  assert.equal(c.draft(), null);
  assert.equal(c.destination(), "/custom-design");
  assert.equal(c.requests().length, 0);
});

test("offline image mode does not ask for login or call a provider; reviewed idea can reach the inquiry form", () => {
  const c = client({ imageMode: "offline" });
  assert.equal(c.hasButton("ادامه برای ساخت تصویر"), false);
  assert.equal(c.authCalls(), 0); assert.equal(c.requests().length, 0);
  c.button("انتقال خلاصه به فرم درخواست ←").props.onClick();
  assert.equal(c.destination(), "/contact?from=custom-design");
  assert.equal(c.handoffDraft().message, conversation.exports.buildStudioBrief(answers));
  assert.equal(c.handoffDraft().sourceContext, "custom-design");
  assert.equal(c.requests().length, 0);
});
