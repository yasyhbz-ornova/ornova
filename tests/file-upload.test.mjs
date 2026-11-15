import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const helperPath = resolve(projectRoot, "lib/security/file-upload.ts");
let uploadHelpers = { exports: {} };

if (existsSync(helperPath)) {
  const source = readFileSync(helperPath, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  new Function("exports", compiled.outputText)(uploadHelpers.exports);
}

const { normalizeUploadMetadata, createInquiryStoragePath, isInquiryStoragePath } = uploadHelpers.exports;
const signatureSource = readFileSync(resolve(projectRoot, "lib/security/file-signature.ts"), "utf8");
const signatureCompiled = ts.transpileModule(signatureSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const signatureHelpers = { exports: {} };
new Function("exports", signatureCompiled.outputText)(signatureHelpers.exports);
const { hasAllowedFileSignature } = signatureHelpers.exports;

test("upload metadata keeps the supported formats and exact 10 MiB boundary", () => {
  assert.equal(typeof normalizeUploadMetadata, "function", "upload metadata normalization must be implemented");
  assert.deepEqual(normalizeUploadMetadata({
    original_name: "  design.png  ",
    content_type: "image/png",
    size_bytes: 10 * 1024 * 1024,
  }), {
    original_name: "design.png",
    content_type: "image/png",
    size_bytes: 10 * 1024 * 1024,
  });
});

test("upload metadata rejects unsupported, empty, fractional, and oversized values", () => {
  assert.equal(typeof normalizeUploadMetadata, "function", "upload metadata normalization must be implemented");
  for (const input of [
    { original_name: "x.svg", content_type: "image/svg+xml", size_bytes: 12 },
    { original_name: "   ", content_type: "image/png", size_bytes: 12 },
    { original_name: "x.png", content_type: "image/png", size_bytes: 1.5 },
    { original_name: "x.png", content_type: "image/png", size_bytes: 10 * 1024 * 1024 + 1 },
    null,
  ]) {
    assert.equal(normalizeUploadMetadata(input), null);
  }
});

test("private upload paths sanitize filenames and stay under the owner's inquiry", () => {
  assert.equal(typeof createInquiryStoragePath, "function", "private upload path builder must be implemented");
  assert.equal(typeof isInquiryStoragePath, "function", "private upload path validator must be implemented");
  const path = createInquiryStoragePath(
    "11111111-1111-4111-8111-111111111111",
    "22222222-2222-4222-8222-222222222222",
    "photo one.png",
    "33333333-3333-4333-8333-333333333333",
  );
  assert.equal(path, "11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222/33333333-3333-4333-8333-333333333333-photo-one.png");
  assert.equal(isInquiryStoragePath(path, "11111111-1111-4111-8111-111111111111", "22222222-2222-4222-8222-222222222222"), true);
  assert.equal(isInquiryStoragePath(path, "44444444-4444-4444-8444-444444444444", "22222222-2222-4222-8222-222222222222"), false);
  assert.equal(isInquiryStoragePath(path, "11111111-1111-4111-8111-111111111111", "55555555-5555-4555-8555-555555555555"), false);
  assert.equal(isInquiryStoragePath("../../public/attack.png", "11111111-1111-4111-8111-111111111111", "22222222-2222-4222-8222-222222222222"), false);
});

test("stored blobs are checked by their bytes rather than the caller-declared MIME type", async () => {
  const validPng = new Blob([Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)], { type: "image/png" });
  const spoofedPng = new Blob(["<script>alert(1)</script>"], { type: "image/png" });
  assert.equal(await hasAllowedFileSignature(validPng), true);
  assert.equal(await hasAllowedFileSignature(spoofedPng), false);
});
