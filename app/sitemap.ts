import type { MetadataRoute } from "next";
import { products } from "@/lib/constants/products";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://ornova.ir";
  const staticRoutes = ["/", "/shop", "/custom-design", "/ring-builder", "/guide", "/about", "/silver-care", "/silver-properties", "/size-guide", "/faq", "/contact"];

  return [
    ...staticRoutes.map((route) => ({ url: `${baseUrl}${route}`, changeFrequency: "monthly" as const, priority: route === "/" ? 1 : 0.6 })),
    ...products.map((product) => ({ url: `${baseUrl}/shop/${product.slug}`, changeFrequency: "weekly" as const, priority: 0.8 })),
  ];
}
