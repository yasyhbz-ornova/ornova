type GalleryProduct = {
  slug: string;
  categoryId: string;
  publicationStatus: string;
  galleryPlacementVerified?: boolean;
  standImage?: string;
  gallery: readonly { src: string }[];
};

type GalleryPhoto = { categoryId: string; src: string; trayImage?: string; productSlug?: string };

const withheldGalleryPhotos = new Set([
  "/images/ornova/gallery/products/goldan-khamoosh-stand-cutout-preview-v1.webp",
  "/images/ornova/gallery/final-renders/01-2ae32afd.webp",
  "/images/ornova/gallery/tray-cutouts/01-2ae32afd.webp",
]);

export function isWithheldGalleryPhoto(path: string | null | undefined) {
  return Boolean(path && withheldGalleryPhotos.has(path));
}

export function isPublicGalleryProduct(product: Pick<GalleryProduct, "publicationStatus" | "galleryPlacementVerified" | "standImage">) {
  return product.publicationStatus === "published" && product.galleryPlacementVerified === true
    && Boolean(product.standImage) && !isWithheldGalleryPhoto(product.standImage);
}

/** Link a final stand photo only when one reviewed public product claims its exact file. */
export function findGalleryProduct<T extends GalleryProduct>(products: readonly T[], photo: GalleryPhoto): T | null {
  const matches = products.filter((product) =>
    product.categoryId === photo.categoryId &&
    isPublicGalleryProduct(product) &&
    (photo.productSlug
      ? product.slug === photo.productSlug && product.standImage === photo.src
      : product.standImage === photo.trayImage || product.gallery.some((image) => image.src === photo.src)),
  );
  return matches.length === 1 ? matches[0] : null;
}
