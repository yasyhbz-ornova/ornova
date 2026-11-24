import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

function load(file, dependencies = {}) {
  const result = { exports: {} };
  const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  new Function("require", "exports", outputText)((id) => { assert.ok(Object.hasOwn(dependencies, id), id); return dependencies[id]; }, result.exports);
  return result.exports;
}

const renders = load("lib/constants/gallery-renders.ts");
const { galleryCollections } = load("lib/constants/collections.ts", { "./gallery-renders": renders });
const { birthMonths } = galleryCollections.find(({ id }) => id === "birth-months");

test("the birth-month book uses a different, matching original zodiac bracelet for all twelve months", () => {
  assert.deepEqual(birthMonths.map(({ braceletImage }) => braceletImage?.number), ["43", "45", "46", "44", "49", "47", "52", "51", "50", "53", "48", "20"]);
  for (const month of birthMonths) {
    assert.equal(month.braceletImage.categoryId, "bracelets");
    assert.ok(month.braceletImage.title.includes(month.name), month.id);
  }
});

test("month entries only show originals in their own family, without repeating the sun set under other months", () => {
  for (const [key, category] of [["flowerImage", "pendants"], ["constellationImage", "jewelry-sets"]]) {
    const images = birthMonths.flatMap((month) => month[key] ? [month[key]] : []);
    assert.equal(images.length, key === "flowerImage" ? 8 : 9);
    assert.equal(new Set(images.map(({ src }) => src)).size, images.length);
    assert.ok(images.every((image) => image.categoryId === category && image.status === "ready" && image.number !== "17"));
  }
  assert.equal(birthMonths.find(({ id }) => id === "azar").constellationImage?.number, "14");
  assert.equal(birthMonths.find(({ id }) => id === "esfand").constellationImage?.number, "16");
  assert.equal(birthMonths.find(({ id }) => id === "mordad").flowerImage?.number, "09");
});
