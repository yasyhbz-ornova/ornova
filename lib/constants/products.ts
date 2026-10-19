export type Product = {
  slug: string;
  name: string;
  category: string;
  image: string;
  description: string;
  details: { label: string; value: string }[];
};

export const products: Product[] = [
  {
    slug: "lajvard-shab-ring",
    name: "انگشتر نقره «لاجورد شب»",
    category: "انگشتر",
    image: "/images/ornova/lajvard-shab-01.jpg",
    description:
      "انگشتری آرام با قاب نقره و آبی شبانه؛ طراحی قابل ساخت برای خاطره‌ای نزدیک.",
    details: [
      { label: "جنس", value: "نقره" },
      { label: "سنگ", value: "لاجورد طبیعی" },
      { label: "رنگ سنگ", value: "آبی شبانه" },
      { label: "وزن تقریبی", value: "پس از طراحی مشخص می‌شود" },
      { label: "ابعاد تقریبی", value: "قابل تنظیم" },
      { label: "سایز", value: "سایز اروپایی انگشتر" },
      { label: "زمان آماده‌سازی", value: "پس از بررسی Ornova" },
      { label: "وضعیت سفارش", value: "قابل درخواست قیمت" },
    ],
  },
  {
    slug: "silent-vase-pin",
    name: "سنجاق سینه نقره «گلدان خاموش»",
    category: "سنجاق سینه",
    image: "/images/ornova/goldan-khamoosh-01.jpg",
    description:
      "سنجاقی ظریف با حجم آرام و نقره‌ای؛ طراحی شده با نگاه فنی و هنری برای همراهی لباس‌های رسمی.",
    details: [
      { label: "جنس", value: "نقره" },
      { label: "سنگ", value: "بدون سنگ" },
      { label: "رنگ سنگ", value: "ندارد" },
      { label: "وزن تقریبی", value: "پس از طراحی مشخص می‌شود" },
      { label: "ابعاد تقریبی", value: "قابل تنظیم" },
      { label: "سایز", value: "مناسب لباس و شال" },
      { label: "زمان آماده‌سازی", value: "پس از بررسی Ornova" },
      { label: "وضعیت سفارش", value: "قابل درخواست قیمت" },
    ],
  },
  {
    slug: "sepid-brooch",
    name: "بروچ نقره «سپید»",
    category: "بروچ",
    image: "/images/ornova/sepid-brooch-01.png",
    description:
      "بروچی روشن و مینیمال از نقره؛ طراحی اختصاصی جواهرات نقره با بیانی آرام.",
    details: [
      { label: "جنس", value: "نقره" },
      { label: "سنگ", value: "قابل انتخاب" },
      { label: "رنگ سنگ", value: "قابل انتخاب" },
      { label: "وزن تقریبی", value: "پس از طراحی مشخص می‌شود" },
      { label: "ابعاد تقریبی", value: "قابل تنظیم" },
      { label: "سایز", value: "مناسب لباس" },
      { label: "زمان آماده‌سازی", value: "پس از بررسی Ornova" },
      { label: "وضعیت سفارش", value: "قابل درخواست قیمت" },
    ],
  },
];

export function getProductBySlug(slug: string) {
  return products.find((product) => product.slug === slug);
}
