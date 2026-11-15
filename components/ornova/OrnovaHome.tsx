import { VirtualGallery } from "./VirtualGallery";
import type { Product } from "@/lib/constants/products";

export function OrnovaHome({ imageMode, galleryProducts }: { imageMode: "offline" | "preview"; galleryProducts?: Product[] }) {
  return <VirtualGallery imageMode={imageMode} galleryProducts={galleryProducts} />;
}
