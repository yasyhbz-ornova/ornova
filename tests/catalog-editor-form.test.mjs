import assert from "node:assert/strict";
import test from "node:test";
import { toCatalogForm } from "../lib/catalog/editor-form.ts";

test("catalog editor strips database-only fields before another strict save", () => {
  const stored = {
    slug: "silver-ring", revision: 3, name: "انگشتر نقره", category_id: "rings", category_label: "انگشتر", subtype_id: null,
    description: "شرح", image_path: "/images/ornova/ring.webp", stand_image_path: "/images/ornova/ring.webp",
    gallery: [{ src: "/images/ornova/ring.webp", alt: "انگشتر" }], details: [{ label: "جنس", value: "نقره" }], packaging_gallery: [],
    turntable_video_path: null, image_fit: "contain", gallery_placement_verified: true, status: "published",
    room_placement: { src: "/images/ornova/ring.webp", image: [994, 608], bounds: [50, 84, 893, 439] },
    created_by: "private-staff-id", updated_at: "2026-11-15T00:00:00Z",
  };
  const form = toCatalogForm(stored);
  assert.equal(Object.hasOwn(form, "room_placement"), false);
  assert.equal(Object.hasOwn(form, "created_by"), false);
  assert.equal(Object.hasOwn(form, "updated_at"), false);
  assert.equal(form.revision, 3);
  form.gallery[0].alt = "تغییر";
  assert.equal(stored.gallery[0].alt, "انگشتر");
});
