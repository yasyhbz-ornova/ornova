import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
const require = createRequire(import.meta.url), ts = require("typescript");
function load(path, dependencies = {}) {
  const url = new URL(`../${path}`, import.meta.url), loaded = { exports: {} };
  const source = existsSync(url) ? readFileSync(url, "utf8") : "";
  new Function("require", "exports", ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText)((name) => dependencies[name] ?? require(name), loaded.exports);
  return loaded.exports;
}
const catalog = load("lib/constants/catalog.ts");

test("catalog navigation exists independently of stock, with resolvable unique category and subtype IDs", () => {
  assert.ok(Array.isArray(catalog.catalogCategories), "independent catalog taxonomy is missing");
  const categories = catalog.catalogCategories;
  const required = ["rings", "earrings", "necklaces", "pendants", "chains", "bracelets", "bangles", "anklets", "body-jewelry", "brooches-pins", "charms", "hair-accessories", "formal-accessories", "utility-accessories", "keepsakes", "jewelry-sets"];
  for (const id of required) assert.equal(catalog.resolveCatalogSelection(id).category?.id, id);
  assert.equal(new Set(categories.map((category) => category.id)).size, categories.length);
  for (const category of categories) {
    assert.ok(catalog.catalogFamilies.some((family) => family.id === category.family));
    assert.equal(new Set(category.types.map((type) => type.id)).size, category.types.length);
    for (const type of category.types) assert.equal(catalog.resolveCatalogSelection(category.id, type.id).type?.id, type.id);
  }
  assert.equal(catalog.resolveCatalogSelection("earrings").category.label, "گوشواره");
});

test("invalid URLs and mismatched subtypes do not silently show an unrelated category", () => {
  assert.equal(typeof catalog.resolveCatalogSelection, "function");
  assert.equal(catalog.resolveCatalogSelection("missing").category, null);
  const mismatch = catalog.resolveCatalogSelection("rings", "ear-stud");
  assert.equal(mismatch.category.id, "rings");
  assert.equal(mismatch.type, null);
  assert.equal(catalog.resolveCatalogSelection(["rings"]).category, null);
  assert.equal(catalog.catalogHref("earrings", "ear-stud", "نقره آبی"), "/shop?category=earrings&type=ear-stud&q=%D9%86%D9%82%D8%B1%D9%87+%D8%A2%D8%A8%DB%8C");
});

test("parent filtering groups brooch and pin together without guessing undocumented product subtypes", () => {
  assert.equal(typeof catalog.filterCatalogProducts, "function");
  const products = load("lib/constants/products.ts").products;
  for (const product of products) assert.ok(catalog.resolveCatalogSelection(product.categoryId).category, product.slug);
  assert.deepEqual(catalog.filterCatalogProducts(products, "brooches-pins").map((p) => p.slug), ["silent-vase-pin", "sepid-brooch"]);
  assert.deepEqual(catalog.filterCatalogProducts(products, "earrings"), []);
  assert.deepEqual(catalog.filterCatalogProducts(products, "rings", "ring-stone"), []);
  assert.deepEqual(catalog.filterCatalogProducts(products, "rings").map((p) => p.slug), ["lajvard-shab-ring"]);
  assert.deepEqual(catalog.filterCatalogProducts(products, "brooches-pins", "brooch").map((p) => p.slug), ["sepid-brooch"]);
  assert.equal(catalog.filterCatalogProducts(products).length, products.length);
});

test("search composes with category/type filters and normalizes Arabic letter variants and Persian spacing", () => {
  assert.equal(typeof catalog.filterCatalogProducts, "function");
  const products = [
    { slug: "a", name: "گوشواره نقره‌ای کیان", category: "گوشواره", categoryId: "earrings", subtypeId: "ear-stud", description: "فرم ساده" },
    { slug: "b", name: "آویز کیان", category: "آویز", categoryId: "pendants", description: "فرم ساده" },
  ];
  assert.deepEqual(catalog.filterCatalogProducts(products, "earrings", "ear-stud", "كيان").map((p) => p.slug), ["a"]);
  assert.deepEqual(catalog.filterCatalogProducts(products, "earrings", "ear-stud", "نقره ای").map((p) => p.slug), ["a"]);
  assert.deepEqual(catalog.filterCatalogProducts(products, "earrings", "ear-hoop", "کیان"), []);
});

test("clearing search also clears the deep-link query while preserving category and subtype", () => {
  const navigation = [], values = [];
  const element = (type, props) => ({ type, props });
  const { ShopCatalog } = load("components/commerce/ShopCatalog.tsx", {
    "react/jsx-runtime": { jsx: element, jsxs: element },
    react: { useMemo: (fn) => fn(), useState: (initial) => [initial, (next) => values.push(next)], useRef: (initial) => ({ current: initial }), useCallback: (fn) => fn, useEffect: () => {} },
    "next/navigation": { useRouter: () => ({ replace: (...args) => navigation.push(args) }) },
    "next/image": { default: "img" }, "next/link": { default: "a" },
    "@/lib/constants/catalog": catalog,
    "./RequestBasketButton": { RequestBasketButton: "basket" },
    "./OrnovaProductDossier": { OrnovaProductDossier: "dossier" },
    "./ShopSurface.module.css": { default: { catalog: "catalog" } },
  });
  const tree = ShopCatalog({ products: [], categoryId: "earrings", subtypeId: "ear-stud", initialQuery: "ناموجود" });
  function find(node) {
    if (!node || typeof node !== "object") return null;
    if (Array.isArray(node)) return node.map(find).find(Boolean);
    if (node.type === "button" && node.props.children === "پاک‌کردن جست‌وجو") return node;
    return find(node.props?.children);
  }
  const clear = find(tree);
  assert.ok(clear, "clear-search action is missing");
  clear.props.onClick();
  assert.deepEqual(values, [""]);
  assert.deepEqual(navigation, [["/shop?category=earrings&type=ear-stud", { scroll: false }]]);
});
