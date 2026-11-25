import { VirtualGallery } from "./VirtualGallery";
import type { Product } from "@/lib/constants/products";

export function OrnovaHome({ imageMode, galleryProducts, catalogUnavailable, studioDraftOwner }: { imageMode: "offline" | "preview"; galleryProducts: Product[]; catalogUnavailable?: boolean; studioDraftOwner?: string | null }) {
  return <VirtualGallery imageMode={imageMode} galleryProducts={galleryProducts} catalogUnavailable={catalogUnavailable} studioDraftOwner={studioDraftOwner} />;
}
