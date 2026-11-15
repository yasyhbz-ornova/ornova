import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";
const basket = loadTs("lib/commerce/request-basket.ts");
const item = { slug: "lajvard-shab-ring", name: "لاجورد شب", category: "انگشتر", quantity: 1, preferences: { version: 1, ring_size_eu: 54 } };
test("basket review distinguishes a complete empty/valid snapshot from unreadable selection data", () => {
  assert.equal(typeof basket.parseRequestBasketReview, "function");
  assert.deepEqual(basket.parseRequestBasketReview("[]"), { valid: true, items: [] });
  assert.deepEqual(basket.parseRequestBasketReview(JSON.stringify([item])), { valid: true, items: [item] });
  for (const raw of ["", "corrupt", "null", "{}", JSON.stringify([item, null]), JSON.stringify([item, { ...item, quantity: 0 }]), JSON.stringify([item, item]), JSON.stringify([{ ...item, note: 7 }]), JSON.stringify([{ ...item, futureNote: "preserve me" }])]) assert.equal(basket.parseRequestBasketReview(raw).valid, false, raw);
});
test("basket review rejects truncation and does not mutate the serialized source", () => {
  assert.equal(typeof basket.parseRequestBasketReview, "function");
  const rows = Array.from({ length: 51 }, (_, i) => ({ ...item, slug: `piece-${i}` }));
  const raw = JSON.stringify(rows);
  assert.equal(basket.parseRequestBasketReview(raw).valid, false);
  assert.equal(raw, JSON.stringify(rows));
});
