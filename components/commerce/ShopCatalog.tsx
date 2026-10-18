"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { Product } from "@/lib/constants/products";
import { RequestBasketButton } from "./RequestBasketButton";

type SortMode = "featured" | "name" | "category";

export function ShopCatalog({ products }: { products: Product[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("همه");
  const [sort, setSort] = useState<SortMode>("featured");

  const categories = useMemo(() => ["همه", ...Array.from(new Set(products.map((product) => product.category)))], [products]);
  const visibleProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    const filtered = products.filter((product) => {
      const matchesCategory = category === "همه" || product.category === category;
      const haystack = `${product.name} ${product.category} ${product.description}`.toLocaleLowerCase();
      return matchesCategory && (!normalizedQuery || haystack.includes(normalizedQuery));
    });

    if (sort === "name") return [...filtered].sort((a, b) => a.name.localeCompare(b.name, "fa"));
    if (sort === "category") return [...filtered].sort((a, b) => a.category.localeCompare(b.category, "fa"));
    return filtered;
  }, [category, products, query, sort]);

  return (
    <section aria-label="فهرست قطعات" className="mt-12">
      <div className="border-y border-silver py-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <label className="flex min-w-0 items-center gap-3 text-sm text-graphite/65 lg:w-80">
            <span className="shrink-0 text-sapphire">جست‌وجو</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} type="search" placeholder="نام یا نوع قطعه" className="min-w-0 flex-1 border-b border-silver bg-transparent px-1 py-2 text-graphite outline-none placeholder:text-graphite/35 focus:border-sapphire" />
          </label>
          <div className="flex flex-wrap items-center gap-2" aria-label="دسته‌بندی قطعات">
            {categories.map((item) => <button key={item} type="button" onClick={() => setCategory(item)} aria-pressed={category === item} className={`px-3 py-2 text-xs transition-colors ${category === item ? "bg-sapphire text-ivory" : "border border-silver text-graphite/65 hover:border-sapphire hover:text-sapphire"}`}>{item}</button>)}
          </div>
          <label className="flex items-center gap-3 text-xs text-graphite/60">
            <span>مرتب‌سازی</span>
            <select value={sort} onChange={(event) => setSort(event.target.value as SortMode)} className="border-b border-silver bg-transparent px-1 py-2 text-graphite outline-none focus:border-sapphire">
              <option value="featured">انتخاب‌های Ornova</option>
              <option value="name">نام قطعه</option>
              <option value="category">نوع قطعه</option>
            </select>
          </label>
        </div>
      </div>

      <div className="mb-5 mt-6 flex items-center justify-between text-xs text-graphite/55"><span>{visibleProducts.length} قطعه در آرشیو</span><span>قیمت پس از بررسی و هماهنگی اعلام می‌شود</span></div>

      {visibleProducts.length > 0 ? <div className="grid gap-x-7 gap-y-12 md:grid-cols-2 lg:grid-cols-3">{visibleProducts.map((product, index) => <article key={product.slug} className="shop-archive-card group">
        <Link href={`/shop/${product.slug}`} className="block">
          <div className="shop-archive-image relative aspect-[4/5] overflow-hidden border border-silver bg-navy"><Image src={product.image} alt={product.name} fill sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" className="object-cover transition duration-700 group-hover:scale-[1.035]" /><span className="absolute bottom-4 right-4 text-xs text-ivory/65">۰{index + 1} / آرشیو</span></div>
          <div className="mt-5 flex items-center justify-between gap-3 text-xs"><span className="text-sapphire">{product.category}</span><span className="text-graphite/45">قابل درخواست</span></div>
          <h2 className="mt-2 min-h-16 text-lg font-semibold leading-8 text-graphite">{product.name}</h2>
          <p className="mt-2 line-clamp-2 text-sm leading-7 text-graphite/65">{product.description}</p>
        </Link>
        <div className="mt-5 flex flex-wrap gap-3"><Link href={`/shop/${product.slug}`} className="inline-flex items-center border-b border-silver px-1 py-2 text-xs text-graphite transition-colors hover:border-sapphire hover:text-sapphire">دیدن جزئیات</Link><RequestBasketButton item={{ slug: product.slug, name: product.name, category: product.category }} label="افزودن به سبد درخواست" /></div>
      </article>)}</div> : <div className="border-y border-silver py-16 text-center"><p className="text-lg text-graphite">قطعه‌ای با این مشخصات پیدا نشد.</p><button type="button" onClick={() => { setQuery(""); setCategory("همه"); }} className="mt-5 text-sm text-sapphire underline underline-offset-4">پاک‌کردن جست‌وجو</button></div>}
    </section>
  );
}
