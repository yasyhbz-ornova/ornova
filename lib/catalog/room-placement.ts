import { z } from "zod";

export const roomPlacementSchema = z.strictObject({
  src: z.string().regex(/^\/images\/ornova\/[A-Za-z0-9/_-]+\.(?:png|jpg|jpeg|webp)$/).max(240),
  image: z.tuple([z.number().int().min(100).max(6000), z.number().int().min(100).max(6000)]),
  bounds: z.tuple([z.number().int().min(0).max(99999), z.number().int().min(0).max(99999), z.number().int().min(50).max(99999), z.number().int().min(50).max(99999)]),
}).refine(({ image, bounds }) => bounds[0] + bounds[2] <= image[0] && bounds[1] + bounds[3] <= image[1]);

export type RoomPlacement = z.infer<typeof roomPlacementSchema>;
