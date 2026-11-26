import { VirtualGallery, type MagazineLocation } from "./VirtualGallery";
import type { Product } from "@/lib/constants/products";

export function OrnovaHome({ imageMode, galleryProducts, catalogUnavailable, studioDraftOwner, initialMagazine }: { imageMode: "offline" | "preview"; galleryProducts: Product[]; catalogUnavailable?: boolean; studioDraftOwner?: string | null; initialMagazine?: MagazineLocation }) {
  return <VirtualGallery imageMode={imageMode} galleryProducts={galleryProducts} catalogUnavailable={catalogUnavailable} studioDraftOwner={studioDraftOwner} initialMagazine={initialMagazine} />;
}
