import { VirtualGallery, type GalleryLocation } from "./VirtualGallery";
import type { Product } from "@/lib/constants/products";

export function OrnovaHome({ imageMode, galleryProducts, catalogUnavailable, studioDraftOwner, initialLocation }: { imageMode: "offline" | "preview"; galleryProducts: Product[]; catalogUnavailable?: boolean; studioDraftOwner?: string | null; initialLocation?: GalleryLocation }) {
  return <VirtualGallery imageMode={imageMode} galleryProducts={galleryProducts} catalogUnavailable={catalogUnavailable} studioDraftOwner={studioDraftOwner} initialLocation={initialLocation} />;
}
