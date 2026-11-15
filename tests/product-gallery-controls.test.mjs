import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
const require = createRequire(import.meta.url), ts = require("typescript");
const photos = [0, 1, 2, 3].map((i) => ({ src: `/photo-${i}.png`, alt: `نمای ${i}` }));
function render(images = photos, current = 0) {
  let selected = current;
  let stateIndex = 0;
  const element = (type, props) => ({ type, props });
  const dependencies = {
    "react/jsx-runtime": { jsx: element, jsxs: element },
    react: {
      useState: (initial) => stateIndex++ === 0
        ? [current, (next) => { selected = typeof next === "function" ? next(selected) : next; }]
        : [initial, () => {}],
      useRef: (initial) => ({ current: initial }),
      useEffect: () => {},
      useCallback: (fn) => fn,
      useSyncExternalStore: () => true,
    },
    "next/image": { default: "image" },
    "./ProductDetail.module.css": { default: {} },
  };
  const loaded = { exports: {} };
  const source = readFileSync(new URL("../components/commerce/ProductGallery.tsx", import.meta.url), "utf8");
  new Function("require", "exports", ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText)((name) => dependencies[name] ?? require(name), loaded.exports);
  return { tree: loaded.exports.ProductGallery({ images, name: "قطعهٔ آزمایشی" }), selected: () => selected };
}
function find(node, predicate) {
  if (!node || typeof node !== "object") return null;
  if (Array.isArray(node)) return node.map((child) => find(child, predicate)).find(Boolean) ?? null;
  return predicate(node) ? node : find(node.props?.children, predicate);
}
test("RTL gallery arrows follow thumbnail order and wrap at either end", () => {
  for (const [key, start, expected] of [["ArrowLeft", 0, 1], ["ArrowRight", 0, 3], ["ArrowLeft", 3, 0], ["Home", 2, 0], ["End", 0, 3]]) {
    const view = render(photos, start); let prevented = false;
    view.tree.props.onKeyDown({ key, preventDefault: () => { prevented = true; } });
    assert.equal(view.selected(), expected, `${key} from ${start}`);
    assert.equal(prevented, true);
  }
});
test("native thumbnail link works without JS and preserves modified clicks", () => {
  const view = render();
  const thumb = find(view.tree, (node) => node.type === "a" && node.props.href === photos[1].src);
  assert.ok(thumb, "thumbnail must keep its actual image URL");
  let prevented = false;
  thumb.props.onClick({ button: 0, ctrlKey: true, preventDefault: () => { prevented = true; } });
  assert.equal(prevented, false); assert.equal(view.selected(), 0);
  thumb.props.onClick({ button: 0, preventDefault: () => { prevented = true; } });
  assert.equal(prevented, true); assert.equal(view.selected(), 1);
});
test("empty and single-photo galleries do not expose broken navigation", () => {
  assert.doesNotThrow(() => render([]));
  const view = render(photos.slice(0, 1));
  assert.equal(find(view.tree, (node) => node.type === "button"), null);
});
