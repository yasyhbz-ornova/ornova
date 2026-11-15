type GalleryProduct = {
  slug: string;
  categoryId: string;
  publicationStatus: string;
  galleryPlacementVerified?: boolean;
  standImage?: string;
  gallery: readonly { src: string }[];
};

type GalleryPhoto = { categoryId: string; src: string; productSlug?: string };

/** Link a final stand photo only when one reviewed public product claims its exact file. */
export function findGalleryProduct<T extends GalleryProduct>(products: readonly T[], photo: GalleryPhoto): T | null {
  const matches = products.filter((product) =>
    product.categoryId === photo.categoryId &&
    product.publicationStatus === "published" &&
    product.galleryPlacementVerified === true &&
    Boolean(product.standImage) &&
    (photo.productSlug
      ? product.slug === photo.productSlug && product.standImage === photo.src
      : product.gallery.some((image) => image.src === photo.src)),
  );
  return matches.length === 1 ? matches[0] : null;
}
