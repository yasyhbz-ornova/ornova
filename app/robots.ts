import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://ornova.ir";

  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/account", "/admin", "/login", "/request-basket", "/concepts"] },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
