"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { Product } from "@/lib/constants/products";
import { RequestBasketButton } from "@/components/commerce/RequestBasketButton";

function formatIndex(index: number) {
  return new Intl.NumberFormat("fa-IR", { minimumIntegerDigits: 2, useGrouping: false }).format(index + 1);
}

export function ShopArchiveExplorer({ products }: { products: Product[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("همه");
  const [selectedSlug, setSelectedSlug] = useState(products[0]?.slug ?? "");

  const categories = useMemo(() => ["همه", ...Array.from(new Set(products.map((product) => product.category)))], [products]);
  const visibleProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    const filtered = products.filter((product) => {
      const matchesCategory = category === "همه" || product.category === category;
      const searchableText = `${product.name} ${product.category} ${product.description}`.toLocaleLowerCase();
      return matchesCategory && (!normalizedQuery || searchableText.includes(normalizedQuery));
    });

    return filtered;
  }, [category, products, query]);

  const selectedProduct = visibleProducts.find((product) => product.slug === selectedSlug) ?? visibleProducts[0];
  const material = selectedProduct?.details.find((detail) => detail.label === "جنس");
  const stone = selectedProduct?.details.find((detail) => detail.label === "سنگ");

  return (
    <section className="shop-concept-explorer" aria-label="جست‌وجو و انتخاب قطعه">
      <div className="shop-concept-tools">
        <label className="shop-concept-search">
          <span>جست‌وجو در قطعات</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} type="search" placeholder="نام یا نوع قطعه" />
        </label>

        <div className="shop-concept-filters" role="group" aria-label="دسته‌بندی قطعات">
          {categories.map((item) => (
            <button key={item} type="button" onClick={() => setCategory(item)} aria-pressed={category === item}>
              {item}
            </button>
          ))}
        </div>

      </div>

      <div className="shop-concept-count" role="status" aria-live="polite">
        <span>{new Intl.NumberFormat("fa-IR").format(visibleProducts.length)} قطعه</span>
        <span>قیمت پس از بررسی درخواست اعلام می‌شود</span>
      </div>

      {selectedProduct ? (
        <div className="shop-concept-spread">
          <nav className="shop-concept-index" aria-label="فهرست قطعات">
            <h2>قطعات</h2>
            <ol>
              {visibleProducts.map((product, index) => (
                <li key={product.slug}>
                  <button type="button" aria-pressed={selectedProduct.slug === product.slug} onClick={() => setSelectedSlug(product.slug)}>
                    <span className="shop-concept-index-number">{formatIndex(index)}</span>
                    <span className="shop-concept-index-copy">
                      <span>{product.name}</span>
                      <small>{product.category}</small>
                    </span>
                    <span className="shop-concept-index-mark" aria-hidden="true">↙</span>
                  </button>
                </li>
              ))}
            </ol>
          </nav>

          <article className="shop-concept-specimen" aria-live="polite">
            <figure>
              <div className="shop-concept-image">
                <Image key={selectedProduct.slug} src={selectedProduct.image} alt={selectedProduct.gallery[0]?.alt ?? selectedProduct.name} fill priority sizes="(max-width: 760px) 100vw, 68vw" />
              </div>
              <figcaption>{selectedProduct.category} · {selectedProduct.name}</figcaption>
            </figure>

            <div className="shop-concept-product-copy">
              <p className="shop-concept-category">{selectedProduct.category}</p>
              <h2>{selectedProduct.name}</h2>
              <p className="shop-concept-description">{selectedProduct.description}</p>

              <dl className="shop-concept-facts">
                {material && <div><dt>{material.label}</dt><dd>{material.value}</dd></div>}
                {stone && <div><dt>{stone.label}</dt><dd>{stone.value}</dd></div>}
              </dl>

              <div className="shop-concept-actions">
                <Link href={`/contact?product=${selectedProduct.slug}&intent=price`} className="shop-concept-price">درخواست قیمت</Link>
                <RequestBasketButton item={{ slug: selectedProduct.slug, name: selectedProduct.name, category: selectedProduct.category }} label="افزودن به سبد درخواست" />
              </div>
              <Link href={`/shop/${selectedProduct.slug}`} className="shop-concept-details">خواندن پرونده‌ی کامل قطعه</Link>
            </div>
          </article>
        </div>
      ) : (
        <div className="shop-concept-empty">
          <p>قطعه‌ای با این مشخصات پیدا نشد.</p>
          <button type="button" onClick={() => { setQuery(""); setCategory("همه"); }}>پاک‌کردن جست‌وجو</button>
        </div>
      )}
    </section>
  );
}
