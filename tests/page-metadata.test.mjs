import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = readFileSync(resolve(projectRoot, "lib/seo/page-metadata.ts"), "utf8");
const robotsSource = readFileSync(resolve(projectRoot, "app/robots.ts"), "utf8");
const sitemapSource = readFileSync(resolve(projectRoot, "app/sitemap.ts"), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const metadataModule = { exports: {} };
new Function("exports", compiled.outputText)(metadataModule.exports);

test("page metadata keeps the canonical URL on Open Graph", () => {
  const metadata = metadataModule.exports.createPageMetadata({
    title: "آرشیو Ornova",
    description: "قطعات نقره‌ی Ornova",
    canonical: "/shop",
  });

  assert.equal(metadata.alternates.canonical, "/shop");
  assert.equal(metadata.openGraph.url, "/shop");
  assert.equal("images" in metadata.openGraph, false);
});

test("page metadata preserves a real image URL and its descriptive alt text", () => {
  const image = {
    url: "/images/ornova/lajvard-shab-03.png",
    alt: "انگشتر نقره لاجورد شب روی دست",
  };
  const metadata = metadataModule.exports.createPageMetadata({
    title: "Ornova",
    description: "جواهرات نقره",
    canonical: "/",
    image,
  });

  assert.deepEqual(metadata.openGraph.images, [image]);
});

test("concept routes stay out of search indexes without blocking crawler access to noindex", () => {
  assert.doesNotMatch(robotsSource, /disallow:[^\]]*"\/concepts/);
  assert.doesNotMatch(sitemapSource, /"\/concepts/);

  for (const route of ["concepts/page.tsx", "concepts/archive/page.tsx", "concepts/ritual/page.tsx", "concepts/trace/page.tsx", "concepts/shop/page.tsx", "concepts/echo/page.tsx", "concepts/afterimage/page.tsx"]) {
    const routeSource = readFileSync(resolve(projectRoot, "app", route), "utf8");
    assert.match(routeSource, /robots\s*:\s*\{\s*index\s*:\s*false\s*,\s*follow\s*:\s*false\s*\}/, `${route} must emit noindex and nofollow`);
  }
});
