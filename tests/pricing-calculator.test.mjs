import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { loadTs } from "./helpers/load-ts.mjs";
const require = createRequire(import.meta.url), ts = require("typescript");

function calculator({ enabled = true, inquiry, storageEnabled = false, fetcher = async () => Response.json({}, { status: 503 }) } = {}) {
  let cursor = 0, tree, requests = [];
  const hooks = [], cleanups = [];
  const react = {
    useReducer(reducer, arg, initialize) { const i = cursor++; hooks[i] ??= { value: initialize ? initialize(arg) : arg }; return [hooks[i].value, action => { hooks[i].value = reducer(hooks[i].value, action); }]; },
    useRef(initial) { const i = cursor++; hooks[i] ??= { current: initial }; return hooks[i]; },
    useEffect(effect) { const i = cursor++; if (!hooks[i]) { hooks[i] = {}; cleanups.push(effect()); } },
  };
  const jsx = { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
  const loaded = { exports: {} }, path = new URL("../components/admin/PricingCalculator.tsx", import.meta.url);
  if (existsSync(path)) {
    const compiled = ts.transpileModule(readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
    new Function("require", "exports", "fetch", "crypto", compiled)(name => name === "react" ? react : name === "react/jsx-runtime" ? jsx : name === "next/link" ? { default: "a" } : name === "./PricingCalculationRecords" ? { PricingCalculationRecords: "records-boundary" } : name.endsWith(".module.css") ? { default: new Proxy({}, { get: (_obj, key) => String(key) }) } : name.startsWith("@/") ? loadTs(name.slice(2) + ".ts") : require(name), loaded.exports, async (url, init) => { requests.push({ url, init, body: JSON.parse(init.body) }); return fetcher(url, init); }, { randomUUID });
  }
  function expand(node) {
    if (!node || typeof node !== "object") return node;
    if (Array.isArray(node)) return node.map(expand);
    if (typeof node.type === "function") return expand(node.type(node.props));
    return { ...node, props: { ...node.props, children: [node.props?.children].flat(Infinity).map(expand) } };
  }
  function render() { cursor = 0; assert.equal(typeof loaded.exports.PricingCalculator, "function"); tree = expand(loaded.exports.PricingCalculator({ enabled, inquiry, storageEnabled })); return tree; }
  function nodes(node = tree) { return !node || typeof node !== "object" ? [] : [node, ...[node.props?.children].flat(Infinity).filter(n => n != null).flatMap(n => nodes(n))]; }
  function text(node = tree) { return typeof node === "string" ? node : !node || typeof node !== "object" ? "" : [node.props?.children].flat(Infinity).filter(n => n != null).map(text).join(" "); }
  function edit(key, value) { const field = nodes().find(n => n.props?.id === `pricing-${key}`); assert.ok(field, key); field.props.onChange({ target: { value } }); render(); }
  function fill() {
    edit("method", "cost-plus"); edit("policy_version", "synthetic-v1");
    for (const [key, value] of Object.entries({ true_cost_rial: "۱٬۰۰۰٬۰۰۰", mandatory_buffer_rial: "100000", profit_method: "markup", profit_percent: "25", rounding: "none", tax_percent: "9" })) edit(key, value);
  }
  render();
  return { render, nodes, text, edit, fill, requests, submit: () => nodes().find(n => n.type === "form").props.onSubmit({ preventDefault() {} }), unmount: () => cleanups.forEach(fn => fn?.()) };
}
function ok(request) {
  return { ...request, algorithm_version: "pcs-standard-48c17189-v1", result: { cost_floor_rial: "1100000", target_rial: "1250000", pre_tax_rial: "1250000", tax_rial: "112500", total_rial: "1362500", effective_margin_bp: 2000, warnings: [] } };
}

test("calculator never contacts engine for invalid inputs or disabled configuration", async () => {
  const invalid = calculator(); await invalid.submit(); invalid.render();
  assert.equal(invalid.requests.length, 0); assert.ok(invalid.nodes().some(n => n.props?.role === "alert"));
  const off = calculator({ enabled: false }); off.fill(); await off.submit();
  assert.equal(off.requests.length, 0); assert.ok(off.nodes().find(n => n.type === "button" && n.props.type === "submit").props.disabled);
});
test("real form handler sends canonical private payload, displays valid result and clears it on edit", async () => {
  const c = calculator({ fetcher: async (_url, init) => Response.json(ok(JSON.parse(init.body))) });
  c.fill(); await c.submit(); c.render();
  assert.equal(c.requests[0].url, "/api/admin/pricing/preview");
  assert.equal(c.requests[0].body.input.true_cost_rial, "1000000"); assert.equal(c.requests[0].body.input.profit_bp, 2500);
  assert.equal(c.requests[0].init.cache, "no-store"); assert.equal(c.nodes().filter(n => n.type === "output").length, 1);
  c.edit("tax_percent", "10"); assert.equal(c.nodes().filter(n => n.type === "output").length, 0);
});

test("inquiry records remain mounted but receive only a currently valid preview/request", async () => {
  const inquiry = { id: "a1111111-abcd-4111-8111-a11111111111", label: "پرونده", closed: false };
  const c = calculator({ inquiry, storageEnabled: true, fetcher: async (_url, init) => Response.json(ok(JSON.parse(init.body))) });
  const records = () => c.nodes().find(n => n.type === "records-boundary").props;
  assert.equal(records().request, null); assert.equal(records().preview, null); assert.equal(records().storageEnabled, true);
  c.fill(); await c.submit(); c.render();
  assert.equal(records().request.request_id, c.requests[0].body.request_id); assert.deepEqual(records().preview, ok(c.requests[0].body));
  c.edit("tax_percent", "10"); assert.equal(records().request, null); assert.equal(records().preview, null); assert.deepEqual(records().inquiry, inquiry);
});
test("edit during pending aborts and late response stays discarded; unmount aborts own request", async () => {
  let resolve;
  const c = calculator({ fetcher: () => new Promise(done => { resolve = done; }) });
  c.fill(); const pending = c.submit(); c.render();
  c.edit("true_cost_rial", "2000000"); assert.equal(c.requests[0].init.signal.aborted, true);
  resolve(Response.json(ok(c.requests[0].body))); await pending; c.render();
  assert.equal(c.nodes().filter(n => n.type === "output").length, 0);
  const next = c.submit(); c.unmount(); assert.equal(c.requests[1].init.signal.aborted, true);
  resolve(Response.json(ok(c.requests[1].body))); await next;
});
test("network, malformed, expired-session and rejected errors stay safe without showing upstream messages", async () => {
  for (const response of [() => Response.json({ error: "private-token-secret" }, { status: 401 }), () => Response.json({}, { status: 422 }), () => Response.json({}, { status: 503 }), () => new Response("<private>"), () => Response.json({ unexpected: "private-token-secret" })]) {
    const c = calculator({ fetcher: async () => response() }); c.fill(); await c.submit(); c.render();
    assert.ok(c.nodes().some(n => n.props?.role === "alert")); assert.ok(!c.text().includes("private-token-secret"));
    assert.equal(c.nodes().filter(n => n.type === "output").length, 0);
  }
});

test("invalid override reveals the native collapsed disclosure instead of hiding the correction", async () => {
  const c = calculator(); c.fill(); c.edit("override_pre_tax_rial", "1.5");
  const panel = { open: false };
  const disclosure = c.nodes().find(n => n.type === "details");
  if (disclosure.props.ref) disclosure.props.ref.current = panel;
  await c.submit(); c.render();
  assert.equal(panel.open, true, "invalid override must reveal its field");
  assert.equal(c.requests.length, 0);
});
