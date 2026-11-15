import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
const require = createRequire(import.meta.url);
const ts = require("typescript");
const path = new URL("../lib/studio/generation.ts", import.meta.url);
const compiled = ts.transpileModule(existsSync(path) ? readFileSync(path, "utf8") : "", { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
const loaded = { exports: {} };
new Function("require", "exports", compiled.outputText)((name) => name === "server-only" ? {} : require(name), loaded.exports);
const { generateForUser } = loaded.exports;
const id = "f228f201-fcec-40f0-b00a-02cfdb442381";
const input = { requestId: id, idea: "انگشتر نقره با فرم برگ", consent: true, accountId: "user-a", user_id: "attacker" };
const access = { userId: "user-a", allowed: true };

function fixture(options = {}) {
  const events = [];
  const record = { id, user_id: "user-a", idea: input.idea, state: "generating", storage_path: null, mime: null, ...options.record };
  return { events, prepare: () => {
    events.push("prepare");
    return {
      generate: async (idea) => { events.push(["generate", idea]); if (options.providerFails) throw Error("upstream secret"); return { bytes: Buffer.from("binary"), mime: "image/png" }; },
      store: {
        reserve: async (owner, requestId, idea) => { events.push(["reserve", owner, requestId, idea]); return { record, fresh: options.fresh ?? true }; },
        upload: async (row, image) => { events.push(["upload", row.id, image.mime]); if (options.storageFails) throw Error("storage secret"); return `user-a/${id}.png`; },
        complete: async (row, path, mime) => { events.push(["complete", row.id, path, mime]); if (options.completionFails) throw Error("database secret"); },
        fail: async (row) => { events.push(["fail", row.id]); },
      },
    };
  } };
}

test("studio rejects anonymous, unauthorized, missing consent and malformed requests before preparing a provider or writer", async () => {
  assert.equal(typeof generateForUser, "function", "authenticated generation flow is missing");
  const f = fixture();
  for (const [who, body, status] of [[{ userId: null, allowed: false }, input, 401], [{ userId: "a", allowed: false }, input, 403], [access, { ...input, consent: false }, 400], [access, { ...input, requestId: "../bad" }, 400], [access, { ...input, idea: "x".repeat(1501) }, 400]]) {
    await assert.rejects(generateForUser(who, body, f.prepare), (e) => e.status === status);
  }
  assert.deepEqual(f.events, []);
});

test("successful generation reserves by the session owner and persists privately before success", async () => {
  assert.equal(typeof generateForUser, "function");
  const f = fixture();
  const result = await generateForUser(access, input, f.prepare);
  assert.deepEqual(f.events, ["prepare", ["reserve", "user-a", id, input.idea], ["generate", input.idea], ["upload", id, "image/png"], ["complete", id, `user-a/${id}.png`, "image/png"]]);
  assert.deepEqual(result, { id, state: "ready", imageUrl: `/api/studio/generations/${id}/image`, galleryUrl: "/account/gallery" });
});

test("consent checked for account A cannot generate under a later account B session", async () => {
  const f = fixture();
  await assert.rejects(generateForUser({ userId: "user-b", allowed: true }, input, f.prepare), (e) => e.status === 409);
  assert.deepEqual(f.events, []);
  await assert.rejects(generateForUser(access, { ...input, accountId: undefined }, f.prepare), (e) => e.status === 400);
});

test("idempotent ready replay never calls the provider again, mismatched or unfinished requests do not regenerate", async () => {
  assert.equal(typeof generateForUser, "function");
  const f = fixture({ fresh: false, record: { state: "ready" } });
  assert.equal((await generateForUser(access, input, f.prepare)).state, "ready");
  assert.equal(f.events.some((x) => Array.isArray(x) && x[0] === "generate"), false);
  for (const record of [{ idea: "different" }, { user_id: "other" }, { state: "failed" }, { state: "generating" }]) {
    const pending = fixture({ fresh: false, record });
    await assert.rejects(generateForUser(access, input, pending.prepare), (e) => e.status === 409);
    assert.equal(pending.events.some((x) => Array.isArray(x) && x[0] === "generate"), false);
  }
});

test("provider, upload and database failures never claim a saved image and leave a failed attempt", async () => {
  assert.equal(typeof generateForUser, "function");
  for (const options of [{ providerFails: true }, { storageFails: true }, { completionFails: true }]) {
    const f = fixture(options);
    await assert.rejects(generateForUser(access, input, f.prepare), (e) => e.status === 503 && !e.message.includes("secret"));
    assert.deepEqual(f.events.at(-1), ["fail", id]);
  }
});
