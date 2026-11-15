import type { Metadata } from "next";

type PageMetadataInput = {
  title: string;
  description: string;
  canonical: string;
  image?: string | { url: string; alt: string };
};

export function createPageMetadata({ title, description, canonical, image }: PageMetadataInput): Metadata {
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      locale: "fa_IR",
      siteName: "Ornova by Yas",
      title,
      description,
      url: canonical,
      ...(image ? { images: [image] } : {}),
    },
  };
}
