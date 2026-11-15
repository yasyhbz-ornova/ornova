import Link from "next/link";
import { products } from "@/lib/constants/products";
import { ShopArchiveExplorer } from "@/components/ornova/ShopArchiveExplorer";

export function ShopArchiveConcept() {
  return (
    <main className="shop-concept">
      <header className="shop-concept-opening">
        <div>
          <p className="ritual-label">آرشیو قطعات Ornova</p>
          <h1>از نامِ قطعه<br />شروع کن.</h1>
        </div>
        <p>هر طراحی را جداگانه ببین، جزئیاتش را بخوان و اگر خواستی برای بررسی قیمت به سبد درخواست بسپار.</p>
      </header>

      <ShopArchiveExplorer products={products} />

      <section className="shop-concept-next" aria-label="راه‌های دیگر برای شروع">
        <p>اگر هنوز قطعه‌ی موردنظرت را پیدا نکرده‌ای</p>
        <div>
          <Link href="/custom-design">شروع طراحی اختصاصی</Link>
          <Link href="/ring-builder">ساخت پیش‌طرح انگشتر</Link>
        </div>
      </section>
    </main>
  );
}
