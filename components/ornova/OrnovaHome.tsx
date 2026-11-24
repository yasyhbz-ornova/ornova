import { VirtualGallery } from "./VirtualGallery";
import type { Product } from "@/lib/constants/products";

export function OrnovaHome({ imageMode, galleryProducts, studioDraftOwner }: { imageMode: "offline" | "preview"; galleryProducts?: Product[]; studioDraftOwner?: string | null }) {
  return <VirtualGallery imageMode={imageMode} galleryProducts={galleryProducts} studioDraftOwner={studioDraftOwner} />;
}
