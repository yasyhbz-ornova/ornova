import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveCatalogSelection } from "@/lib/constants/catalog";
import { isReferenceOnlyGalleryPhoto } from "@/lib/constants/gallery-renders";
import { getProductBySlug, products as legacyProducts, type Product } from "@/lib/constants/products";
import { roomPlacementSchema } from "@/lib/catalog/room-placement";
import { birthMonthCategories, findBirthMonth } from "@/lib/constants/collections";

type CatalogRow = {
  slug: string; name: string; category_id: string; category_label: string; subtype_id: string | null;
  description: string; image_path: string; stand_image_path: string; gallery: Product["gallery"];
  details: Product["details"]; packaging_gallery: NonNullable<Product["packagingGallery"]>;
  turntable_video_path: string | null; image_fit: "contain" | "cover"; gallery_placement_verified: boolean;
  room_placement: unknown;
  birth_month_id?: string | null;
};

const catalogFields = "slug,name,category_id,category_label,subtype_id,description,image_path,stand_image_path,gallery,details,packaging_gallery,turntable_video_path,image_fit,gallery_placement_verified,room_placement";

export async function getPublishedProducts(signal?: AbortSignal): Promise<Product[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return legacyProducts;
  const client = await createSupabaseServerClient();
  const readPublished = (fields: string) => {
    const query = client.from("catalog_products").select(fields).eq("status", "published").order("slug").limit(200);
    return signal ? query.abortSignal(signal) : query;
  };
  let { data, error } = await readPublished(`${catalogFields},birth_month_id`);
  if (error?.code === "42703" && error.message.includes("birth_month_id")) {
    ({ data, error } = await readPublished(catalogFields));
  }
  // Existing installations show the original catalog until migration 017 is applied.
  if (error?.code === "42P01" || error?.code === "PGRST205") return legacyProducts;
  if (error) throw new Error("Catalog read failed");
  return ((data ?? []) as unknown as CatalogRow[]).flatMap((stored) => {
    let row = stored;
    // Replace the original floral import while retaining the published SKU and staff-entered details.
    if (row.slug === "sepid-brooch"
      && row.image_path === "/images/ornova/sepid-brooch-01.png"
      && row.stand_image_path === "/images/ornova/gallery/products/sepid-brooch-stand-cutout-preview-v1.webp") {
      const brooch = getProductBySlug(row.slug);
      if (brooch?.standImage) row = {
        ...row,
        name: brooch.name,
        description: brooch.description,
        image_path: brooch.image,
        stand_image_path: brooch.standImage,
        gallery: [...brooch.gallery, ...row.gallery.filter(({ src }) => src !== row.image_path && src !== row.stand_image_path && src !== brooch.image)],
        room_placement: null,
      };
    }
    const category = resolveCatalogSelection(row.category_id, row.subtype_id).category;
    if (!category) throw new Error("Catalog category invalid");
    const month = birthMonthCategories.includes(category.id) ? findBirthMonth(row.birth_month_id) : undefined;
    const gallery = row.gallery.filter(({ src }) => !isReferenceOnlyGalleryPhoto(src));
    const standImage = isReferenceOnlyGalleryPhoto(row.stand_image_path) ? undefined : row.stand_image_path;
    const image = isReferenceOnlyGalleryPhoto(row.image_path) ? (gallery[0]?.src ?? standImage) : row.image_path;
    if (!image) return [];
    return [{
      slug: row.slug, name: row.name, category: row.category_label, categoryId: category.id as Product["categoryId"],
      ...(row.subtype_id ? { subtypeId: row.subtype_id } : {}), image, standImage,
      ...(month ? { birthMonthId: month.id } : {}),
      imageFit: row.image_fit, galleryPlacementVerified: Boolean(standImage && row.gallery_placement_verified), publicationStatus: "published" as const,
      roomPlacement: standImage ? (roomPlacementSchema.safeParse(row.room_placement).data ?? null) : null,
      gallery, details: row.details, packagingGallery: row.packaging_gallery.filter(({ src }) => !isReferenceOnlyGalleryPhoto(src)), description: row.description,
      ...(row.turntable_video_path ? { turntableVideo: row.turntable_video_path } : {}),
    }];
  });
}
