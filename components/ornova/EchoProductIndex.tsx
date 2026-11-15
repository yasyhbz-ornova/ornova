"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { RequestBasketButton } from "@/components/commerce/RequestBasketButton";
import { products } from "@/lib/constants/products";

export function EchoProductIndex() {
  const [activeIndex, setActiveIndex] = useState(0);
  const product = products[activeIndex] ?? products[0];

  return (
    <section className="echo-index" id="echo-pieces" aria-labelledby="echo-index-title">
      <div className="echo-index-body">
        <div className="echo-index-visual" key={product.slug}>
          <Image
            src={product.image}
            alt={product.gallery[0]?.alt || product.name}
            fill
            loading="eager"
            sizes="(max-width: 760px) 100vw, 56vw"
            className="object-cover"
          />
          <p><span>{product.category} <span aria-hidden="true">/</span> {String(activeIndex + 1).padStart(2, "0")}</span></p>
        </div>

        <div className="echo-index-selection">
          <p className="echo-index-label" id="echo-index-title">از آرشیوِ قطعه‌ها</p>
          <div className="echo-product-list" role="group" aria-label="انتخاب قطعه">
            {products.map((item, index) => (
              <button
                key={item.slug}
                type="button"
                aria-pressed={activeIndex === index}
                onClick={() => setActiveIndex(index)}
              >
                <span>{item.category}</span>
                <strong>{item.name}</strong>
              </button>
            ))}
          </div>

          <div className="echo-index-current" aria-live="polite" aria-atomic="true">
            <p className="echo-index-description">{product.description}</p>
            <dl className="echo-index-facts">
              {product.details.filter((detail) => detail.label === "جنس" || detail.label === "سنگ").map((detail) => (
                <div key={detail.label}><dt>{detail.label}</dt><dd>{detail.value}</dd></div>
              ))}
            </dl>
          </div>
          <p className="echo-index-price-note">قیمت پس از بررسی درخواست اعلام می‌شود.</p>
          <div className="echo-index-actions">
            <Link href={`/shop/${product.slug}`} className="echo-action-primary">خواندن پرونده‌ی قطعه</Link>
            <RequestBasketButton
              item={{ slug: product.slug, name: product.name, category: product.category }}
              label="افزودن به سبد درخواست"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
