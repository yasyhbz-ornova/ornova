import type { CatalogCategoryId } from "./catalog";
import type { RoomPlacement } from "@/lib/catalog/room-placement";

export type Product = {
  slug: string;
  name: string;
  category: string;
  categoryId: CatalogCategoryId;
  subtypeId?: string;
  image: string;
  imageFit?: "contain" | "cover";
  standImage?: string;
  packagingGallery?: { src: string; alt: string; label?: string }[];
  galleryPlacementVerified?: boolean;
  roomPlacement?: RoomPlacement | null;
  publicationStatus: "published" | "review";
  turntableVideo?: string;
  gallery: { src: string; alt: string; label?: string; notice?: string }[];
  description: string;
  details: { label: string; value: string }[];
};

const productRecords: Product[] = [
  {
    slug: "lajvard-shab-ring",
    publicationStatus: "published",
    name: "انگشتر نقره «لاجورد شب»",
    category: "انگشتر",
    categoryId: "rings",
    image: "/images/ornova/lajvard-shab-01.jpg",
    standImage: "/images/ornova/gallery/products/lajvard-shab-stand-cutout-preview-v1.webp",
    galleryPlacementVerified: true,
    gallery: [
      { src: "/images/ornova/lajvard-shab-01.jpg", alt: "انگشتر لاجورد شب روی دست" },
      { src: "/images/ornova/lajvard-shab-02.png", alt: "نمایی دیگر از انگشتر لاجورد شب روی دست" },
      { src: "/images/ornova/lajvard-shab-03.png", alt: "نمای نزدیک انگشتر لاجورد شب" },
      { src: "/images/ornova/lajvard-shab-04.png", alt: "انگشتر لاجورد شب در کنار پارچه و دست‌نوشته" },
    ],
    description:
      "انگشتری با قاب نقره و رنگ آبی شبانه؛ طراحی‌ای آرام برای خاطره‌ای نزدیک.",
    details: [
      { label: "جنس", value: "نقره" },
      { label: "سنگ", value: "جزئیات پس از بررسی درخواست اعلام می‌شود" },
      { label: "رنگ سنگ", value: "آبی شبانه" },
      { label: "وزن تقریبی", value: "پس از طراحی مشخص می‌شود" },
      { label: "ابعاد تقریبی", value: "پس از بررسی اعلام می‌شود" },
      { label: "سایز", value: "سایز اروپایی انگشتر" },
      { label: "زمان آماده‌سازی", value: "پس از بررسی Ornova" },
      { label: "وضعیت سفارش", value: "قابل درخواست قیمت" },
    ],
  },
  {
    slug: "silent-vase-pin",
    publicationStatus: "published",
    name: "سنجاق سینه نقره «گلدان خاموش»",
    category: "سنجاق سینه",
    categoryId: "brooches-pins",
    image: "/images/ornova/goldan-khamoosh-01.jpg",
    standImage: "/images/ornova/gallery/products/goldan-khamoosh-stand-cutout-preview-v1.webp",
    galleryPlacementVerified: true,
    gallery: [
      { src: "/images/ornova/goldan-khamoosh-01.jpg", alt: "نمای سنجاق سینه گلدان خاموش روی کت تیره" },
      { src: "/images/ornova/goldan-khamoosh-02.jpg", alt: "نمای نزدیک سنجاق سینه گلدان خاموش همراه گل‌های خشک روی کت" },
    ],
    description:
      "سنجاقی ظریف با حجم آرام و نقره‌ای؛ طراحی شده با نگاه فنی و هنری برای همراهی لباس‌های رسمی.",
    details: [
      { label: "جنس", value: "نقره" },
      { label: "سنگ", value: "بدون سنگ" },
      { label: "رنگ سنگ", value: "ندارد" },
      { label: "وزن تقریبی", value: "پس از طراحی مشخص می‌شود" },
      { label: "ابعاد تقریبی", value: "پس از بررسی اعلام می‌شود" },
      { label: "سایز", value: "مناسب لباس و شال" },
      { label: "زمان آماده‌سازی", value: "پس از بررسی Ornova" },
      { label: "وضعیت سفارش", value: "قابل درخواست قیمت" },
    ],
  },
  {
    slug: "sepid-brooch",
    publicationStatus: "published",
    name: "سنجاق‌سینهٔ نواری مشبک",
    category: "بروچ",
    categoryId: "brooches-pins",
    subtypeId: "brooch",
    image: "/images/ornova/gallery/final-renders/07-7d31d155.webp",
    standImage: "/images/ornova/gallery/tray-cutouts/07-7d31d155.webp",
    galleryPlacementVerified: true,
    gallery: [
      { src: "/images/ornova/gallery/final-renders/07-7d31d155.webp", alt: "سنجاق‌سینهٔ نواری مشبک روی مخمل آبی" },
    ],
    description:
      "سنجاق‌سینهٔ نواری با نقش مشبک و سطح صیقلی نقره.",
    details: [
      { label: "جنس", value: "نقره" },
      { label: "سنگ", value: "پس از بررسی درخواست مشخص می‌شود" },
      { label: "رنگ سنگ", value: "پس از بررسی درخواست مشخص می‌شود" },
      { label: "وزن تقریبی", value: "پس از طراحی مشخص می‌شود" },
      { label: "ابعاد تقریبی", value: "پس از بررسی اعلام می‌شود" },
      { label: "سایز", value: "مناسب لباس" },
      { label: "زمان آماده‌سازی", value: "پس از بررسی Ornova" },
      { label: "وضعیت سفارش", value: "قابل درخواست قیمت" },
    ],
  },
  {
    slug: "tapered-silver-brooch-photo04-candidate",
    name: "بج‌سینهٔ مخروطیِ نقره‌ای",
    category: "بج سینه",
    categoryId: "brooches-pins",
    subtypeId: "brooch",
    publicationStatus: "review",
    image: "docs/assets/ornova-photo-review/catalog-hold/brooch-photo04-source-pixels-review-v1.png",
    imageFit: "contain",
    standImage: "docs/assets/ornova-photo-review/catalog-hold/brooch-photo04-source-pixels-review-v1.png",
    gallery: [{
      src: "docs/assets/ornova-photo-review/catalog-hold/brooch-photo04-source-pixels-review-v1.png",
      alt: "برش بازبینی بج‌سینهٔ عکس مرجع ۰۴ با پیکسل‌های خود محصول",
      label: "نمونهٔ تصویری از مرجع ۰۴",
      notice: "پیکسل‌های خود محصول از عکس اصلی حفظ شده‌اند و فقط زمینه شفاف شده؛ منبع کمی نرم است و سنگ/جزئیات نهایی هنوز تأیید نشده‌اند.",
    }],
    description: "برش بازبینی وفادار از بج‌سینهٔ عکس مرجع ۰۴؛ پیکسل‌های محصول بازسازی نشده‌اند. برای ثبت نهایی، وضوح لبه‌ها و مشخصات سنگ باید با عکس یا مدل دقیق‌تر بررسی شوند.",
    details: [
      { label: "جنس", value: "نقره؛ بر اساس گفتهٔ صاحب اثر" },
      { label: "سنگ", value: "نوع دانه‌ها و سنگِ انتهایی نیازمند تأیید" },
      { label: "وزن تقریبی", value: "پس از تأیید مدل مشخص می‌شود" },
      { label: "ابعاد تقریبی", value: "پس از تأیید مدل مشخص می‌شود" },
      { label: "وضعیت سفارش", value: "نمونهٔ تصویری در انتظار تأیید" },
    ],
  },
  {
    slug: "crown-silver-brooch-photo08-candidate",
    name: "بج‌سینهٔ تاجِ نقره‌ای",
    category: "بج سینه",
    categoryId: "brooches-pins",
    subtypeId: "brooch",
    publicationStatus: "review",
    image: "docs/assets/ornova-photo-review/catalog-hold/brooch-photo08-crown-candidate-v1.png",
    imageFit: "contain",
    standImage: "docs/assets/ornova-photo-review/catalog-hold/brooch-photo08-crown-candidate-v1.png",
    gallery: [{
      src: "docs/assets/ornova-photo-review/catalog-hold/brooch-photo08-crown-candidate-v1.png",
      alt: "نمونهٔ تصویری بج‌سینهٔ تاج‌مانند از عکس مرجع ۰۸؛ جزئیات نیازمند تأیید",
      label: "نمونهٔ تصویری از مرجع ۰۸",
      notice: "برش تصویری با هوش مصنوعی پاک‌سازی شده؛ صاحب اثر آن را بج‌سینه معرفی کرده و جزئیات اتصال نیازمند تأیید است.",
    }],
    description: "نمونهٔ تصویریِ قطعهٔ تاج‌مانند از عکس مرجع ۰۸؛ در این کاتالوگ طبق گفتهٔ صاحب اثر در دستهٔ بج‌سینه قرار گرفته است.",
    details: [
      { label: "جنس", value: "نقره؛ بر اساس گفتهٔ صاحب اثر" },
      { label: "سنگ", value: "نوع سنگِ بخش تاج نیازمند تأیید" },
      { label: "وزن تقریبی", value: "پس از تأیید مدل مشخص می‌شود" },
      { label: "ابعاد تقریبی", value: "پس از تأیید مدل مشخص می‌شود" },
      { label: "وضعیت سفارش", value: "نمونهٔ تصویری در انتظار تأیید" },
    ],
  },
  {
    slug: "vokala-rare-emblem",
    name: "نشان و بج سینهٔ نقره «VOKALA RARE»",
    category: "بج سینه و مدال",
    categoryId: "brooches-pins",
    subtypeId: "brooch",
    publicationStatus: "review",
    image: "/images/ornova/gallery/products/vokala-rare-fixed-stand-v1.png",
    imageFit: "contain",
    turntableVideo: "/images/ornova/gallery/products/vokala-rare-fixed-stand-360-v1.webm",
    gallery: [
      { src: "/images/ornova/gallery/products/vokala-rare-fixed-stand-v1.png", alt: "مدل دیجیتال نقره‌ای VOKALA RARE در برابر صفحهٔ ثابت آبی؛ بدون سنگ تزئینی افزوده" },
    ],
    description: "در نمای ۳۶۰، صفحهٔ نمایش ثابت می‌ماند و مدل دیجیتال نقره‌ای به‌تنهایی می‌چرخد. محل و نوع سنگ و مشخصات ساخت پس از تأیید مدل نهایی ثبت می‌شود.",
    details: [
      { label: "جنس", value: "نقره" },
      { label: "سنگ", value: "پس از تأیید محل و نوع سنگ مشخص می‌شود" },
      { label: "وزن تقریبی", value: "پس از نهایی‌شدن مدل مشخص می‌شود" },
      { label: "ابعاد تقریبی", value: "پس از بررسی مدل اعلام می‌شود" },
      { label: "وضعیت سفارش", value: "مدل در انتظار تأیید نهایی" },
    ],
  },
  {
    slug: "birth-flower-pendant-candidate",
    name: "آویز گل‌های ماه تولد",
    category: "چارم و آویز",
    categoryId: "charms",
    publicationStatus: "review",
    image: "docs/assets/ornova-photo-review/catalog-hold/birth-flower-charm-source17-candidate-v1.png",
    imageFit: "contain",
    standImage: "docs/assets/ornova-photo-review/catalog-hold/birth-flower-charm-source17-candidate-v1.png",
    gallery: [
      {
        src: "docs/assets/ornova-photo-review/catalog-hold/birth-flower-charm-source17-candidate-v1.png",
        alt: "نمونهٔ برش‌خوردهٔ آویز گل از عکس مرجع ۱۷؛ فرم و ماه مربوط نیازمند تأیید است",
        label: "نمونهٔ تصویری",
        notice: "برش از عکس مرجع ۱۷؛ ماه تولد و مشخصات ساخت هنوز تأیید نشده‌اند.",
      },
    ],
    description: "نمونهٔ تصویری از یکی از آویزهای گل مجموعهٔ ماه‌های تولد؛ ماه مربوط و جزئیات نهایی پس از تأیید ثبت می‌شوند.",
    details: [
      { label: "جنس", value: "نقره" },
      { label: "سنگ", value: "در عکس مرجع سنگ مشخصی دیده نمی‌شود" },
      { label: "وزن تقریبی", value: "پس از تأیید مدل مشخص می‌شود" },
      { label: "ابعاد تقریبی", value: "پس از تأیید مدل مشخص می‌شود" },
      { label: "وضعیت سفارش", value: "نمونهٔ دیداری در انتظار تأیید" },
    ],
  },
  {
    slug: "birth-flower-open-five-petal-candidate",
    name: "چارم گل پنج‌پرِ خطی",
    category: "چارم و آویز",
    categoryId: "charms",
    subtypeId: "charm",
    publicationStatus: "review",
    image: "docs/assets/ornova-photo-review/catalog-hold/birth-flower-charm-source17-open-five-petal-candidate-v1.png",
    imageFit: "contain",
    standImage: "docs/assets/ornova-photo-review/catalog-hold/birth-flower-charm-source17-open-five-petal-candidate-v1.png",
    gallery: [{
      src: "docs/assets/ornova-photo-review/catalog-hold/birth-flower-charm-source17-open-five-petal-candidate-v1.png",
      alt: "نمونهٔ تصویری از چارم گل پنج‌پرِ خطی، بر پایهٔ عکس مرجع ۱۷",
      label: "نمونهٔ تصویری از مرجع ۱۷",
      notice: "تصویر با هوش مصنوعی پاک‌سازی شده است؛ فرم، محل اتصال و مشخصات ساخت نیازمند تأیید هستند.",
    }],
    description: "نمونهٔ تصویریِ فرم پنج‌پرِ خطی از عکس مرجع ۱۷؛ ماه تولد و جزئیات نهایی این اثر هنوز مشخص نشده‌اند.",
    details: [
      { label: "جنس", value: "رنگ نقره‌ای در عکس مرجع؛ آلیاژ نیازمند تأیید" },
      { label: "سنگ", value: "در عکس مرجع سنگ مشخصی دیده نمی‌شود" },
      { label: "ماه تولد", value: "پس از تطبیق با مرجع مشخص می‌شود" },
      { label: "ابعاد تقریبی", value: "پس از تأیید مدل مشخص می‌شود" },
      { label: "وضعیت سفارش", value: "نمونهٔ تصویری در انتظار تأیید" },
    ],
  },
  {
    slug: "birth-flower-spiral-candidate",
    name: "چارم گلِ مارپیچی",
    category: "چارم و آویز",
    categoryId: "charms",
    subtypeId: "charm",
    publicationStatus: "review",
    image: "docs/assets/ornova-photo-review/catalog-hold/birth-flower-charm-source17-spiral-candidate-v1.png",
    imageFit: "contain",
    standImage: "docs/assets/ornova-photo-review/catalog-hold/birth-flower-charm-source17-spiral-candidate-v1.png",
    gallery: [{
      src: "docs/assets/ornova-photo-review/catalog-hold/birth-flower-charm-source17-spiral-candidate-v1.png",
      alt: "نمونهٔ تصویری از چارم گل مارپیچی، بر پایهٔ عکس مرجع ۱۷",
      label: "نمونهٔ تصویری از مرجع ۱۷",
      notice: "تصویر با هوش مصنوعی پاک‌سازی شده است؛ فرم، محل اتصال و مشخصات ساخت نیازمند تأیید هستند.",
    }],
    description: "نمونهٔ تصویریِ گل مارپیچی از عکس مرجع ۱۷؛ نام ماه و جزئیات ساخت به این فرم نسبت داده نشده‌اند.",
    details: [
      { label: "جنس", value: "رنگ نقره‌ای در عکس مرجع؛ آلیاژ نیازمند تأیید" },
      { label: "سنگ", value: "در عکس مرجع سنگ مشخصی دیده نمی‌شود" },
      { label: "ماه تولد", value: "پس از تطبیق با مرجع مشخص می‌شود" },
      { label: "ابعاد تقریبی", value: "پس از تأیید مدل مشخص می‌شود" },
      { label: "وضعیت سفارش", value: "نمونهٔ تصویری در انتظار تأیید" },
    ],
  },
  {
    slug: "birth-flower-stem-candidate",
    name: "چارم گلِ ساقه‌دار",
    category: "چارم و آویز",
    categoryId: "charms",
    subtypeId: "charm",
    publicationStatus: "review",
    image: "docs/assets/ornova-photo-review/catalog-hold/birth-flower-charm-source17-stem-flower-candidate-v1.png",
    imageFit: "contain",
    standImage: "docs/assets/ornova-photo-review/catalog-hold/birth-flower-charm-source17-stem-flower-candidate-v1.png",
    gallery: [{
      src: "docs/assets/ornova-photo-review/catalog-hold/birth-flower-charm-source17-stem-flower-candidate-v1.png",
      alt: "نمونهٔ تصویری از چارم گل ساقه‌دار، بر پایهٔ عکس مرجع ۱۷",
      label: "نمونهٔ تصویری از مرجع ۱۷",
      notice: "تصویر با هوش مصنوعی پاک‌سازی شده است؛ فرم، محل اتصال و مشخصات ساخت نیازمند تأیید هستند.",
    }],
    description: "نمونهٔ تصویریِ گل پنج‌پرِ ساقه‌دار از عکس مرجع ۱۷؛ دقت فرم و نقش آن در مجموعهٔ ماه‌های تولد نیازمند بازبینی است.",
    details: [
      { label: "جنس", value: "رنگ نقره‌ای در عکس مرجع؛ آلیاژ نیازمند تأیید" },
      { label: "سنگ", value: "در عکس مرجع سنگ مشخصی دیده نمی‌شود" },
      { label: "ماه تولد", value: "پس از تطبیق با مرجع مشخص می‌شود" },
      { label: "ابعاد تقریبی", value: "پس از تأیید مدل مشخص می‌شود" },
      { label: "وضعیت سفارش", value: "نمونهٔ تصویری در انتظار تأیید" },
    ],
  },
  {
    slug: "birth-month-stars-half-set",
    name: "نیم‌ست «ماه تولد و ستارگان»",
    category: "نیم‌ست",
    categoryId: "jewelry-sets",
    subtypeId: "set-half",
    publicationStatus: "review",
    image: "docs/assets/ornova-photo-review/catalog-hold/birth-month-stars-half-set-source12-candidate-v1.png",
    imageFit: "contain",
    standImage: "docs/assets/ornova-photo-review/catalog-hold/birth-month-stars-half-set-source12-candidate-v1.png",
    gallery: [
      {
        src: "docs/assets/ornova-photo-review/catalog-hold/birth-month-stars-half-set-source12-candidate-v1.png",
        alt: "برش تصویریِ نیم‌ست ماه تولد و ستارگان از عکس مرجع ۱۲؛ نیازمند تأیید صاحب اثر",
        label: "نمونهٔ تصویری از مرجع ۱۲",
        notice: "برش و پاک‌سازی تصویر با هوش مصنوعی انجام شده؛ دقت جزئیات، مدل و سنگ‌ها نیازمند تأیید است.",
      },
    ],
    description:
      "نیم‌ستِ مجموعهٔ ماه‌های تولد و ستارگان. ماه و جزئیات سنگِ این نمونه در عکس مرجع مشخص نیست و هنگام بررسی درخواست روشن می‌شود.",
    details: [
      { label: "جنس", value: "نقره" },
      { label: "سنگ", value: "جزئیات پس از بررسی درخواست اعلام می‌شود" },
      { label: "ماه تولد", value: "هنگام بررسی درخواست مشخص می‌شود" },
      { label: "وزن تقریبی", value: "پس از طراحی مشخص می‌شود" },
      { label: "ابعاد تقریبی", value: "پس از بررسی اعلام می‌شود" },
      { label: "زمان آماده‌سازی", value: "پس از بررسی اُرنوا" },
      { label: "وضعیت سفارش", value: "نمونهٔ تصویری در انتظار تأیید" },
    ],
  },
];

export const products = productRecords.filter(
  (product) => product.publicationStatus === "published" && product.galleryPlacementVerified === true && Boolean(product.standImage),
);
export const reviewProducts = productRecords.filter((product) => product.publicationStatus === "review");

export function getProductBySlug(slug: string) {
  return products.find((product) => product.slug === slug);
}
