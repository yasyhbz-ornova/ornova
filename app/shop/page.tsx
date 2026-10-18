import type { Metadata } from "next";
import { products } from "@/lib/constants/products";
import { ShopCatalog } from "@/components/commerce/ShopCatalog";

export const metadata: Metadata = {
  title: "فروشگاه نقره | Ornova by Yas",
  description: "قطعات نقره Ornova با طراحی دیجیتال جواهر و امکان درخواست قیمت.",
  alternates: { canonical: "/shop" },
};

export default function ShopPage() {
  return (
    <div className="shop-archive mx-auto max-w-6xl px-5 py-16">
      <div className="shop-archive-heading">
        <p className="ritual-label">آرشیو قطعات / Ornova by Yas</p>
        <h1>چیزهایی برای نزدیک ماندن.</h1>
        <p>قطعات نقره‌ای Ornova با طراحی دیجیتال جواهر؛ هرکدام یک فرم، یک نشانه و یک امکان برای همراه‌شدن.</p>
      </div>

      <ShopCatalog products={products} />
    </div>
  );
}
