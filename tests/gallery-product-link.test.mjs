import assert from "node:assert/strict";
import test from "node:test";
import { findGalleryProduct } from "../lib/catalog/gallery-product-link.ts";

const photo = { categoryId: "rings", src: "/images/ornova/gallery/final-renders/04-5fd8f6b5.webp" };
const product = {
  slug: "silver-ring", categoryId: "rings", publicationStatus: "published",
  galleryPlacementVerified: true, standImage: "/images/ornova/gallery/stands/ring.webp",
  gallery: [{ src: photo.src }],
};

test("a reviewed published product opens the dossier of its exact final stand photo", () => {
  assert.equal(findGalleryProduct([product], photo), product);
  assert.equal(findGalleryProduct([product], { ...photo, src: product.standImage, productSlug: product.slug }), product);
});

test("a photo cannot open an unpublished, unreviewed, mismatched or ambiguous product", () => {
  assert.equal(findGalleryProduct([{ ...product, publicationStatus: "review" }], photo), null);
  assert.equal(findGalleryProduct([{ ...product, galleryPlacementVerified: false }], photo), null);
  assert.equal(findGalleryProduct([{ ...product, standImage: "" }], photo), null);
  assert.equal(findGalleryProduct([{ ...product, categoryId: "earrings" }], photo), null);
  assert.equal(findGalleryProduct([{ ...product, gallery: [{ src: "/images/ornova/other.webp" }] }], photo), null);
  assert.equal(findGalleryProduct([product, { ...product, slug: "other-ring" }], photo), null);
  assert.equal(findGalleryProduct([product], { ...photo, src: product.standImage, productSlug: "another-ring" }), null);
});
