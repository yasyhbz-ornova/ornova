import { z } from "zod";
import { resolveCatalogSelection } from "@/lib/constants/catalog";
import { birthMonthCategories, findBirthMonth } from "@/lib/constants/collections";

const imagePath = z.string().regex(/^\/images\/ornova\/[A-Za-z0-9/_-]+\.(?:png|jpg|jpeg|webp)$/).max(240);
const videoPath = z.string().regex(/^\/images\/ornova\/[A-Za-z0-9/_-]+\.(?:webm|mp4)$/).max(240);
const photo = z.strictObject({
  src: imagePath,
  alt: z.string().trim().min(1).max(200),
  label: z.string().trim().max(120).optional(),
  notice: z.string().trim().max(300).optional(),
});
const packagingPhoto = photo.omit({ notice: true });
const detail = z.strictObject({ label: z.string().trim().min(1).max(80), value: z.string().trim().min(1).max(240) });

export const catalogProductInput = z.strictObject({
  slug: z.string().regex(/^[a-z0-9][a-z0-9-]{1,118}[a-z0-9]$/),
  revision: z.number().int().min(0).max(999999),
  name: z.string().trim().min(1).max(120),
  category_id: z.string(),
  category_label: z.string().trim().min(1).max(100),
  subtype_id: z.string().nullish(),
  birth_month_id: z.string().nullish(),
  description: z.string().trim().min(1).max(2000),
  image_path: imagePath.nullish(),
  stand_image_path: imagePath.nullish(),
  gallery: z.array(photo).max(12),
  details: z.array(detail).max(20),
  packaging_gallery: z.array(packagingPhoto).max(8),
  turntable_video_path: videoPath.nullish(),
  image_fit: z.enum(["contain", "cover"]),
  gallery_placement_verified: z.boolean(),
  status: z.enum(["review", "published", "archived"]),
}).superRefine((value, context) => {
  const selection = resolveCatalogSelection(value.category_id, value.subtype_id);
  if (!selection.category || (value.subtype_id && !selection.type)) context.addIssue({ code: "custom", message: "invalid category or subtype" });
  if (value.birth_month_id != null && (!findBirthMonth(value.birth_month_id) || !selection.category || !birthMonthCategories.includes(selection.category.id))) {
    context.addIssue({ code: "custom", message: "invalid birth month for this category" });
  }
  if (value.status === "published" && (!value.gallery_placement_verified || !value.image_path || !value.stand_image_path || !value.gallery.length)) context.addIssue({ code: "custom", message: "publication requires verified stand and images" });
});

export type CatalogProductInput = z.infer<typeof catalogProductInput>;
