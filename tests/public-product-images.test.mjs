import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, isAbsolute, relative, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoots = ["app", "components", "lib"].map((path) => resolve(projectRoot, path));

function collectCodeFiles(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = resolve(directory, name);
    if (statSync(path).isDirectory()) return collectCodeFiles(path);
    return /\.(?:[cm]?[jt]sx?)$/i.test(name) ? [path] : [];
  });
}

const imageReferences = sourceRoots.flatMap(collectCodeFiles).flatMap((path) => {
  const source = readFileSync(path, "utf8");
  return [...source.matchAll(/["'](\/images\/ornova\/[^"']+)["']/g)].map((match) => ({
    source: relative(projectRoot, path),
    url: match[1],
  }));
});

function expectedSignature(extension) {
  switch (extension.toLowerCase()) {
    case ".jpg":
    case ".jpeg":
      return { offset: 0, bytes: [0xff, 0xd8, 0xff] };
    case ".png":
      return { offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] };
    case ".webp":
      return { offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] };
    case ".webm":
      return { offset: 0, bytes: [0x1a, 0x45, 0xdf, 0xa3] };
    default:
      return null;
  }
}

test("every Ornova media reference resolves to a real image or WebM video with a matching signature", () => {
  assert.ok(imageReferences.length > 0, "expected to find image references in application source");

  for (const { source, url } of imageReferences) {
    const assetPath = resolve(projectRoot, "public", `.${url}`);
    const imageRoot = resolve(projectRoot, "public/images/ornova");
    const relativeAssetPath = relative(imageRoot, assetPath);
    assert.ok(relativeAssetPath && !relativeAssetPath.startsWith("..") && !isAbsolute(relativeAssetPath), `${source} contains an unsafe image path: ${url}`);
    assert.ok(statSync(assetPath, { throwIfNoEntry: false })?.isFile(), `${source} references missing asset ${url}`);

    const signature = expectedSignature(extname(assetPath));
    assert.ok(signature, `${source} uses an unsupported image extension: ${url}`);

    const bytes = readFileSync(assetPath);
    assert.deepEqual(
      [...bytes.subarray(signature.offset, signature.offset + signature.bytes.length)],
      signature.bytes,
      `${source} has an extension/content mismatch for ${url}`,
    );
  }
});

test("JPEG aliases preserve the original Ornova image bytes", () => {
  const imageDirectory = resolve(projectRoot, "public/images/ornova");
  const aliases = readdirSync(imageDirectory).filter((name) => name.endsWith(".jpg"));

  assert.ok(aliases.length > 0, "expected JPEG aliases with an image/jpeg extension");

  for (const alias of aliases) {
    const original = resolve(imageDirectory, `${alias.slice(0, -4)}.jfif`);
    assert.ok(statSync(original, { throwIfNoEntry: false })?.isFile(), `missing original asset for ${alias}`);
    assert.deepEqual(readFileSync(resolve(imageDirectory, alias)), readFileSync(original), `${alias} must be a byte-identical extension alias`);
  }
});
