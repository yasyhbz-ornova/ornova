export type Product = {
  slug: string;
  name: string;
  category: string;
  description: string;
  material: string;
  finish: string;
};

export const products: Product[] = [
  {
    slug: "lajvard-shab-ring",
    name: "انگشتر نقره «لاجورد شب»",
    category: "انگشتر",
    description:
      "انگشتری آرام با فرم نرم و نگین لاجوردی، طراحی‌شده برای نشانه‌ای شخصی و ماندگار.",
    material: "نقره ۹۲۵",
    finish: "پرداخت براق کنترل‌شده",
  },
  {
    slug: "silent-vase-pin",
    name: "سنجاق سینه نقره «گلدان خاموش»",
    category: "سنجاق سینه",
    description:
      "سنجاقی ظریف با الهام از حجم گلدان، مناسب برای کت، شال و لباس‌های رسمی.",
    material: "نقره ۹۲۵",
    finish: "پرداخت نرم و روشن",
  },
  {
    slug: "sepid-brooch",
    name: "بروچ نقره «سپید»",
    category: "بروچ",
    description:
      "بروچی ساده و روشن با سطحی سپیدگون، برای همراهی روزمره و مراسم کوچک.",
    material: "نقره ۹۲۵",
    finish: "پرداخت مات ظریف",
  },
];

export function getProductBySlug(slug: string) {
  return products.find((product) => product.slug === slug);
}
