import type { CatalogCategoryId } from "./catalog";

export type GalleryCollection = {
  id: string;
  name: string;
  categoryId: CatalogCategoryId;
  description: string;
  references: readonly string[];
  availability: "preparing";
  birthMonths?: readonly BirthMonth[];
};

export type BirthMonth = {
  id: string;
  name: string;
  bracelet: string;
  braceletImage: string;
  constellation: string;
  constellationImage?: string;
  flowerPendant: string;
  flowerImage?: string;
};

// Owner-supplied collection mapping. This is editorial metadata only; it does
// not publish these designs as purchasable catalog products.
const birthMonths: readonly BirthMonth[] = [
  { id: "farvardin", name: "فروردین", bracelet: "حَمَل؛ سر قوچ با شاخ‌های پیچ‌خورده", braceletImage: "/images/ornova/gallery/collections/birth-month-zodiac-final/farvardin.webp", constellation: "سه نگین از درشت به ریز، با شکست کوتاه در انتها", constellationImage: "/images/ornova/gallery/collections/birth-months/constellation-farvardin.webp", flowerPendant: "نرگس با نگین سبز", flowerImage: "/images/ornova/gallery/collections/birth-month-flower-final/farvardin.webp" },
  { id: "ordibehesht", name: "اردیبهشت", bracelet: "ثور؛ سر گاو نر", braceletImage: "/images/ornova/gallery/collections/birth-month-zodiac-final/ordibehesht.webp", constellation: "فرم V نامتقارن با پنج نگین", constellationImage: "/images/ornova/gallery/collections/birth-months/constellation-ordibehesht.webp", flowerPendant: "مدل ۱۵؛ گل شش‌پر نقره‌ای با نگین شفاف", flowerImage: "/images/ornova/gallery/collections/birth-month-flower-final/ordibehesht.webp" },
  { id: "khordad", name: "خرداد", bracelet: "جوزا؛ دو نیم‌رخ دوقلو", braceletImage: "/images/ornova/gallery/collections/birth-month-zodiac-final/khordad.webp", constellation: "دو شاخهٔ متصل با دو نگین شاخص در بالا", constellationImage: "/images/ornova/gallery/collections/birth-months/constellation-khordad.webp", flowerPendant: "زنبق با نگین آبی مایل به بنفش", flowerImage: "/images/ornova/gallery/collections/birth-month-flower-final/khordad.webp" },
  { id: "tir", name: "تیر", bracelet: "سرطان؛ خرچنگ", braceletImage: "/images/ornova/gallery/collections/birth-month-zodiac-final/tir.webp", constellation: "فرم سه‌شاخهٔ جمع‌وجور با چهار نگین", constellationImage: "/images/ornova/gallery/collections/birth-months/constellation-tir.webp", flowerPendant: "نیلوفر آبی با نگین آبی یخی", flowerImage: "/images/ornova/gallery/collections/birth-month-flower-final/tir.webp" },
  { id: "mordad", name: "مرداد", bracelet: "اسد؛ سر شیر", braceletImage: "/images/ornova/gallery/collections/birth-month-zodiac-final/mordad.webp", constellation: "فرم بازِ سر و تنهٔ شیر، با نگین درشت‌تر زیر شانه", flowerPendant: "مدل ۱۶؛ گل با نگین زرد", flowerImage: "/images/ornova/gallery/collections/birth-month-flower-final/mordad.webp" },
  { id: "shahrivar", name: "شهریور", bracelet: "سنبله؛ نیم‌رخ زن با خوشهٔ گندم", braceletImage: "/images/ornova/gallery/collections/birth-month-zodiac-final/shahrivar.webp", constellation: "فرم عمودی چهارنگین، با نگین درشت‌تر در انتهای شاخهٔ بلند", constellationImage: "/images/ornova/gallery/collections/birth-months/constellation-shahrivar.webp", flowerPendant: "آستر با نگین یاسی", flowerImage: "/images/ornova/gallery/collections/birth-month-flower-final/shahrivar.webp" },
  { id: "mehr", name: "مهر", bracelet: "میزان؛ ترازوی دوکفه‌ای", braceletImage: "/images/ornova/gallery/collections/birth-month-zodiac-final/mehr.webp", constellation: "سه نگین در یک زاویهٔ باز، با نگین درشت‌تر در رأس", constellationImage: "/images/ornova/gallery/collections/birth-months/constellation-mehr.webp", flowerPendant: "مدل ۰۹؛ گل با نگین سرخابی", flowerImage: "/images/ornova/gallery/collections/birth-month-flower-final/mehr.webp" },
  { id: "aban", name: "آبان", bracelet: "عقرب؛ عقرب با دم برگشته", braceletImage: "/images/ornova/gallery/collections/birth-month-zodiac-final/aban.webp", constellation: "مسیر کشیده و زاویه‌دار با چهار نگین و بدنهٔ نقره‌ای ضخیم‌تر", constellationImage: "/images/ornova/gallery/collections/birth-months/constellation-aban.webp", flowerPendant: "داوودی با نگین کهربایی", flowerImage: "/images/ornova/gallery/collections/birth-month-flower-final/aban.webp" },
  { id: "azar", name: "آذر", bracelet: "قوس؛ کمان‌دار", braceletImage: "/images/ornova/gallery/collections/birth-month-zodiac-final/azar.webp", constellation: "عکس ۱۲؛ طرح هفت‌ستاره‌ای", constellationImage: "/images/ornova/gallery/collections/birth-month-constellation-final/azar.webp", flowerPendant: "کاملیا با نگین قرمز تیره", flowerImage: "/images/ornova/gallery/collections/birth-month-flower-final/azar.webp" },
  { id: "dey", name: "دی", bracelet: "جدی؛ بز دریایی با دم ماهی", braceletImage: "/images/ornova/gallery/collections/birth-month-zodiac-final/dey.webp", constellation: "مثلث باز و کم‌ارتفاع با سه نگین", constellationImage: "/images/ornova/gallery/collections/birth-months/constellation-dey.webp", flowerPendant: "گل برف با نگین شفاف", flowerImage: "/images/ornova/gallery/collections/birth-month-flower-final/dey.webp" },
  { id: "bahman", name: "بهمن", bracelet: "دلو؛ کوزه و جریان آب", braceletImage: "/images/ornova/gallery/collections/birth-month-zodiac-final/bahman.webp", constellation: "فرم چهارنگینِ کوزهٔ آب، با یک شاخهٔ بلند و دو شاخهٔ کوتاه", constellationImage: "/images/ornova/gallery/collections/birth-months/constellation-bahman.webp", flowerPendant: "بنفشه با نگین بنفش پررنگ", flowerImage: "/images/ornova/gallery/collections/birth-month-flower-final/bahman.webp" },
  { id: "esfand", name: "اسفند", bracelet: "حوت؛ دو ماهی، عکس ۱۸", braceletImage: "/images/ornova/gallery/collections/birth-month-zodiac-final/esfand.webp", constellation: "عکس ۱۳؛ طرح مثلث و خوشهٔ نگین‌های گرد", constellationImage: "/images/ornova/gallery/collections/birth-month-constellation-final/esfand.webp", flowerPendant: "سنبل با نگین صورتی ملایم", flowerImage: "/images/ornova/gallery/collections/birth-month-flower-final/esfand.webp" },
];

// Owner-confirmed grouping. Keep this separate from published product records
// until each pendant has an identity-matched photo and reviewed dossier.
export const galleryCollections: readonly GalleryCollection[] = [
  {
    id: "birth-months",
    name: "ماه‌های تولد",
    categoryId: "pendants",
    description: "دفتر مجموعهٔ ماه‌های تولد؛ برای هر ماه، دستبند زودیاک، نیم‌ست صورت فلکی و آویز گل فیبوناچی را ببین.",
    references: [],
    availability: "preparing",
    birthMonths,
  },
  {
    id: "fibonacci-birth-month",
    name: "فیبوناچی",
    categoryId: "pendants",
    description: "آویزهای گردنبندی که گل و سنگِ ماه تولد را کنار مکعبی با نام فرد به خط زبان مادری می‌آورند؛ روز تولد نیز با اعداد رومیِ برجسته کنار مکعب می‌نشیند. جزئیات هر مرجع پس از تطبیق با عکس و مدل همان اثر ثبت می‌شود.",
    references: ["۰۹", "۱۵", "۱۶"],
    availability: "preparing",
  },
];
