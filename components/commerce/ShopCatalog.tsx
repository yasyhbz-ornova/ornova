"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import type { Product } from "@/lib/constants/products";
import { catalogCategories, catalogFamilies, catalogHref, filterCatalogProducts, resolveCatalogSelection } from "@/lib/constants/catalog";
import { RequestBasketButton } from "./RequestBasketButton";
import { OrnovaProductDossier } from "./OrnovaProductDossier";
import styles from "./ShopSurface.module.css";

const number = new Intl.NumberFormat("fa-IR");
const navigationLink = "flex min-h-11 items-center justify-between gap-3 px-3 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sapphire";

export function ShopCatalog({ products, categoryId, subtypeId, initialQuery = "" }: {
  products: Product[]; categoryId?: string; subtypeId?: string; initialQuery?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLButtonElement | null>(null);
  const { category, type } = resolveCatalogSelection(categoryId, subtypeId);
  const counts = useMemo(() => {
    const result: Record<string, number> = {};
    for (const product of products) result[product.categoryId] = (result[product.categoryId] ?? 0) + 1;
    return result;
  }, [products]);
  const visibleProducts = useMemo(() => filterCatalogProducts(products, categoryId, subtypeId, query), [categoryId, subtypeId, products, query]);
  const selectedProducts = filterCatalogProducts(products, categoryId, subtypeId);
  const selectedIndex = visibleProducts.findIndex((product) => product.slug === selectedSlug);
  const selectedProduct = visibleProducts[selectedIndex] ?? null;

  const closeDossier = useCallback(() => {
    setSelectedSlug(null);
    window.setTimeout(() => returnFocusRef.current?.focus(), 0);
  }, []);

  const moveDossier = useCallback((step: number) => {
    if (!visibleProducts.length) return;
    setSelectedSlug((current) => {
      const currentIndex = visibleProducts.findIndex((product) => product.slug === current);
      const nextIndex = (currentIndex + step + visibleProducts.length) % visibleProducts.length;
      return visibleProducts[nextIndex]?.slug ?? null;
    });
  }, [visibleProducts]);

  useEffect(() => {
    if (!selectedProduct) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDossier();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [closeDossier, selectedProduct]);

  function trapDialogFocus(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Tab") return;
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>("button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex='-1'])");
    if (!focusable?.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <section aria-label="فهرست قطعات" className={`${styles.catalog} grid items-start gap-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-12`}>
      <aside className="hidden border-l border-silver pl-6 lg:block">
        <h2 className="mb-4 px-3 text-sm font-medium text-graphite">دسته‌بندی قطعات</h2>
        <nav aria-label="دسته‌بندی قطعات">
          <Link href={catalogHref(undefined, undefined, query)} scroll={false} aria-current={!category ? "page" : undefined} className={`${navigationLink} ${!category ? "bg-sapphire/5 text-sapphire" : "text-graphite/75 hover:text-sapphire"}`}><span>همهٔ قطعات</span><span className="text-xs">{number.format(products.length)}</span></Link>
          {catalogFamilies.map((family) => <div key={family.id} className="mt-7">
            <p className="mb-2 px-3 text-xs text-graphite/55">{family.label}</p>
            {catalogCategories.filter((item) => item.family === family.id).map((item) => <Link key={item.id} href={catalogHref(item.id, undefined, query)} scroll={false} aria-current={category?.id === item.id ? "page" : undefined} className={`${navigationLink} ${category?.id === item.id ? "bg-sapphire/5 text-sapphire" : "text-graphite/75 hover:text-sapphire"}`}><span>{item.label}</span>{counts[item.id] > 0 && <span className="text-xs">{number.format(counts[item.id])}</span>}</Link>)}
          </div>)}
        </nav>
        <p className="mt-6 px-3 text-xs leading-6 text-graphite/55">تعداد قطعات منتشرشده، نه موجودی آمادهٔ فروش.</p>
      </aside>

      <div className="min-w-0">
        <label className="mb-6 flex flex-col gap-3 text-sm text-graphite lg:hidden">دسته‌بندی قطعات
          <select value={category?.id ?? ""} onChange={(event) => router.push(catalogHref(event.target.value, undefined, query), { scroll: false })} className="min-h-12 w-full border border-silver bg-ivory px-3 text-graphite focus-visible:outline-sapphire">
            <option value="">همهٔ قطعات — {number.format(products.length)}</option>
            {catalogFamilies.map((family) => <optgroup key={family.id} label={family.label}>{catalogCategories.filter((item) => item.family === family.id).map((item) => <option key={item.id} value={item.id}>{item.label}{counts[item.id] > 0 ? ` — ${number.format(counts[item.id])}` : ""}</option>)}</optgroup>)}
          </select>
        </label>
        <div className="flex flex-col gap-4 border-b border-silver pb-5 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg text-graphite">{category?.label ?? "همهٔ قطعات"}</h2>
          <form action="/shop" method="get" className="flex min-w-0 items-center gap-2">
            {category && <input type="hidden" name="category" value={category.id} />}
            {type && <input type="hidden" name="type" value={type.id} />}
            <label className="flex min-w-0 flex-1 items-center gap-3 text-sm text-graphite/65">
              <span className="sr-only">جست‌وجوی قطعات</span>
              <input name="q" value={query} onChange={(event) => setQuery(event.target.value)} type="search" placeholder="نام یا نوع قطعه" className="min-h-11 min-w-0 w-full border-b border-silver bg-transparent px-1 py-2 text-graphite outline-none placeholder:text-graphite/55 focus:border-sapphire" />
            </label>
            <button type="submit" className="min-h-11 px-2 text-xs text-sapphire focus-visible:outline-sapphire">جست‌وجو</button>
          </form>
        </div>
        {category && <nav aria-label="نوع قطعه" className="mt-5 flex flex-wrap gap-x-4 gap-y-1">
          <Link href={catalogHref(category.id, undefined, query)} scroll={false} aria-current={!type ? "page" : undefined} className={`min-h-11 border-b py-3 text-xs ${!type ? "border-sapphire text-sapphire" : "border-transparent text-graphite/65 hover:text-sapphire"}`}>همهٔ انواع</Link>
          {category.types.map((item) => <Link key={item.id} href={catalogHref(category.id, item.id, query)} scroll={false} aria-current={type?.id === item.id ? "page" : undefined} className={`min-h-11 border-b py-3 text-xs ${type?.id === item.id ? "border-sapphire text-sapphire" : "border-transparent text-graphite/65 hover:text-sapphire"}`}>{item.label}</Link>)}
        </nav>}
        <div className="mb-5 mt-6 flex flex-wrap items-center justify-between gap-3 text-xs leading-6 text-graphite/65"><span role="status" aria-live="polite" aria-atomic="true">{number.format(visibleProducts.length)} قطعهٔ منتشرشده{type ? ` · ${type.label}` : ""}</span><span>قیمت پس از بررسی و هماهنگی اعلام می‌شود</span></div>

        {visibleProducts.length > 0 ? <div className="grid gap-x-7 gap-y-12 md:grid-cols-2">{visibleProducts.map((product, index) => <article key={product.slug} className="shop-archive-card group">
          <button type="button" className={styles.productOpenButton} aria-haspopup="dialog" aria-label={`بازکردن شناسنامهٔ ${product.name}`} onClick={(event) => { returnFocusRef.current = event.currentTarget; setSelectedSlug(product.slug); }}>
            <span className="shop-archive-image relative block aspect-[4/5] overflow-hidden border border-silver bg-navy"><Image src={product.image} alt={product.gallery[0]?.alt || product.name} fill loading={index < 2 ? "eager" : "lazy"} sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 420px" className={`${product.imageFit === "contain" ? "object-contain" : "object-cover"} transition duration-700 group-hover:scale-[1.035] motion-reduce:transform-none motion-reduce:transition-none`} />{product.gallery[0]?.label && <span className="absolute inset-x-3 bottom-3 rounded-sm bg-white/95 px-3 py-2 text-right text-xs leading-5 text-graphite"><strong className="block font-medium">{product.gallery[0].label}</strong>{product.gallery[0].notice && <span className="block">{product.gallery[0].notice}</span>}</span>}<span className="absolute left-4 top-4 text-xs text-ivory/65">{String(products.indexOf(product) + 1).padStart(2, "0").replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)])} / آرشیو</span></span>
            <span className="mt-5 flex items-center justify-between gap-3 text-xs"><span className="text-sapphire">{product.category}</span><span className="text-graphite/45">قابل درخواست</span></span>
            <span className="mt-2 block text-graphite">{product.name}</span>
          </button>
          <div className="mt-5 flex flex-wrap gap-3"><Link href={`/contact?product=${product.slug}&intent=price`} className="inline-flex items-center border-b border-silver px-1 py-2 text-xs text-graphite transition-colors hover:border-sapphire hover:text-sapphire">درخواست قیمت</Link><RequestBasketButton item={{ slug: product.slug, name: product.name, category: product.category }} label="افزودن به سبد درخواست" /></div>
        </article>)}</div> : <div className="py-16 text-center">
          <p className="text-lg leading-9 text-graphite">{selectedProducts.length === 0 ? `هنوز قطعه‌ای در این ${type ? "زیرگروه" : "دسته"} منتشر نشده است.` : "قطعه‌ای با این جست‌وجو پیدا نشد."}</p>
          <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-graphite/65">{selectedProducts.length === 0 ? "اگر ایده‌ای دارید، می‌توانید آن را برای بررسی طراحی اختصاصی مطرح کنید." : "نام کوتاه‌تر یا واژهٔ دیگری را امتحان کنید."}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-6 text-sm text-sapphire">
            {query && <button type="button" onClick={() => { setQuery(""); router.replace(catalogHref(categoryId, subtypeId), { scroll: false }); }} className="min-h-11 underline underline-offset-4">پاک‌کردن جست‌وجو</button>}
            <Link href="/shop" onClick={() => setQuery("")} scroll={false} className="min-h-11 py-3 underline underline-offset-4">مشاهدهٔ همهٔ قطعات</Link>
            {selectedProducts.length === 0 && <Link href="/custom-design" className="min-h-11 py-3 underline underline-offset-4">گفت‌وگو دربارهٔ ایده</Link>}
          </div>
        </div>}
      {selectedProduct && <div ref={dialogRef} className={styles.productOverlay} role="dialog" aria-modal="true" aria-labelledby="product-dossier-title" tabIndex={-1} onMouseDown={(event) => { if (event.target === event.currentTarget) closeDossier(); }} onKeyDown={trapDialogFocus}>
        <div className={styles.productDialogBody}>
          <button ref={closeButtonRef} type="button" className={styles.productClose} onClick={closeDossier} aria-label="بستن شناسنامه">بستن <span aria-hidden="true">×</span></button>
          <OrnovaProductDossier product={selectedProduct} onPrevious={() => moveDossier(-1)} onNext={() => moveDossier(1)} productPosition={selectedIndex + 1} totalProducts={visibleProducts.length} />
        </div>
      </div>}
      </div>
    </section>
  );
}
