import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveCatalogSelection } from "@/lib/constants/catalog";
import { products as legacyProducts, type Product } from "@/lib/constants/products";
import { roomPlacementSchema } from "@/lib/catalog/room-placement";

type CatalogRow = {
  slug: string; name: string; category_id: string; category_label: string; subtype_id: string | null;
  description: string; image_path: string; stand_image_path: string; gallery: Product["gallery"];
  details: Product["details"]; packaging_gallery: NonNullable<Product["packagingGallery"]>;
  turntable_video_path: string | null; image_fit: "contain" | "cover"; gallery_placement_verified: boolean;
  room_placement: unknown;
};

export async function getPublishedProducts(): Promise<Product[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return legacyProducts;
  const client = await createSupabaseServerClient();
  const { data, error } = await client.from("catalog_products")
    .select("slug,name,category_id,category_label,subtype_id,description,image_path,stand_image_path,gallery,details,packaging_gallery,turntable_video_path,image_fit,gallery_placement_verified,room_placement")
    .eq("status", "published").order("slug").limit(200);
  // Existing installations show the original catalog until migration 017 is applied.
  if (error?.code === "42P01" || error?.code === "PGRST205") return legacyProducts;
  if (error) throw new Error("Catalog read failed");
  return ((data ?? []) as CatalogRow[]).map((row) => {
    const category = resolveCatalogSelection(row.category_id, row.subtype_id).category;
    if (!category) throw new Error("Catalog category invalid");
    return {
      slug: row.slug, name: row.name, category: row.category_label, categoryId: category.id as Product["categoryId"],
      ...(row.subtype_id ? { subtypeId: row.subtype_id } : {}), image: row.image_path, standImage: row.stand_image_path,
      imageFit: row.image_fit, galleryPlacementVerified: row.gallery_placement_verified, publicationStatus: "published" as const,
      roomPlacement: roomPlacementSchema.safeParse(row.room_placement).data ?? null,
      gallery: row.gallery, details: row.details, packagingGallery: row.packaging_gallery, description: row.description,
      ...(row.turntable_video_path ? { turntableVideo: row.turntable_video_path } : {}),
    };
  });
}
