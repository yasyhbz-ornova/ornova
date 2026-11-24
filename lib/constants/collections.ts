import type { CatalogCategoryId } from "./catalog";
import { visibleGalleryRenders, type GalleryRender } from "./gallery-renders";

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
  braceletImage?: GalleryRender;
  constellation: string;
  constellationImage?: GalleryRender;
  flowerPendant: string;
  flowerImage?: GalleryRender;
};

function sourcePhoto(number: string, categoryId: CatalogCategoryId) {
  return visibleGalleryRenders.find((photo) => photo.number === number && photo.categoryId === categoryId);
}

// Month associations follow the owner’s table and the visible design in the final archive.
// A month may have an identified design before its original photograph is matched.
const birthMonths: readonly BirthMonth[] = [
  {
    id: "farvardin", name: "فروردین",
    bracelet: "حَمَل؛ سر قوچ با شاخ‌های پیچ‌خورده", braceletImage: sourcePhoto("43", "bracelets"),
    constellation: "سه نگین از درشت به ریز، با شکست کوتاه در انتها", constellationImage: sourcePhoto("33", "jewelry-sets"),
    flowerPendant: "نرگس با نگین سبز", flowerImage: sourcePhoto("25", "pendants"),
  },
  {
    id: "ordibehesht", name: "اردیبهشت",
    bracelet: "ثور؛ سر گاو نر", braceletImage: sourcePhoto("45", "bracelets"),
    constellation: "فرم V نامتقارن با پنج نگین",
    flowerPendant: "گل شش‌پر با نگین شفاف", flowerImage: sourcePhoto("31", "pendants"),
  },
  {
    id: "khordad", name: "خرداد",
    bracelet: "جوزا؛ دو نیم‌رخ دوقلو", braceletImage: sourcePhoto("46", "bracelets"),
    constellation: "دو شاخهٔ متصل با دو نگین شاخص در بالا", constellationImage: sourcePhoto("35", "jewelry-sets"),
    flowerPendant: "زنبق با نگین آبی مایل به بنفش", flowerImage: sourcePhoto("26", "pendants"),
  },
  {
    id: "tir", name: "تیر",
    bracelet: "سرطان؛ خرچنگ", braceletImage: sourcePhoto("44", "bracelets"),
    constellation: "فرم سه‌شاخهٔ جمع‌وجور با چهار نگین", constellationImage: sourcePhoto("36", "jewelry-sets"),
    flowerPendant: "نیلوفر آبی با نگین آبی یخی", flowerImage: sourcePhoto("28", "pendants"),
  },
  {
    id: "mordad", name: "مرداد",
    bracelet: "اسد؛ سر شیر", braceletImage: sourcePhoto("49", "bracelets"),
    constellation: "فرم بازِ سر و تنهٔ شیر، با نگین درشت‌تر زیر شانه",
    flowerPendant: "گل با نگین زرد", flowerImage: sourcePhoto("09", "pendants"),
  },
  {
    id: "shahrivar", name: "شهریور",
    bracelet: "سنبله؛ نیم‌رخ زن با خوشهٔ گندم", braceletImage: sourcePhoto("47", "bracelets"),
    constellation: "نیم‌ست شاخه‌دار با نگین آویز", constellationImage: sourcePhoto("38", "jewelry-sets"),
    flowerPendant: "آستر با نگین یاسی",
  },
  {
    id: "mehr", name: "مهر",
    bracelet: "میزان؛ ترازوی دوکفه‌ای", braceletImage: sourcePhoto("52", "bracelets"),
    constellation: "سه نگین در یک زاویهٔ باز، با نگین درشت‌تر در رأس", constellationImage: sourcePhoto("40", "jewelry-sets"),
    flowerPendant: "گل با نگین سرخابی", flowerImage: sourcePhoto("24", "pendants"),
  },
  {
    id: "aban", name: "آبان",
    bracelet: "عقرب؛ عقرب با دم برگشته", braceletImage: sourcePhoto("51", "bracelets"),
    constellation: "مسیر کشیده و زاویه‌دار با چهار نگین", constellationImage: sourcePhoto("41", "jewelry-sets"),
    flowerPendant: "داوودی با نگین کهربایی", flowerImage: sourcePhoto("29", "pendants"),
  },
  {
    id: "azar", name: "آذر",
    bracelet: "قوس؛ کمان‌دار", braceletImage: sourcePhoto("50", "bracelets"),
    constellation: "طرح هفت‌ستاره‌ای", constellationImage: sourcePhoto("14", "jewelry-sets"),
    flowerPendant: "کاملیا با نگین قرمز تیره",
  },
  {
    id: "dey", name: "دی",
    bracelet: "جدی؛ بز دریایی با دم ماهی", braceletImage: sourcePhoto("53", "bracelets"),
    constellation: "مثلث باز و کم‌ارتفاع با سه نگین",
    flowerPendant: "گل برف با نگین شفاف",
  },
  {
    id: "bahman", name: "بهمن",
    bracelet: "دلو؛ کوزه و جریان آب", braceletImage: sourcePhoto("48", "bracelets"),
    constellation: "فرم چهارنگین با یک شاخهٔ بلند و دو شاخهٔ کوتاه", constellationImage: sourcePhoto("42", "jewelry-sets"),
    flowerPendant: "بنفشه با نگین بنفش پررنگ",
  },
  {
    id: "esfand", name: "اسفند",
    bracelet: "حوت؛ دو ماهی", braceletImage: sourcePhoto("20", "bracelets"),
    constellation: "طرح مثلث و خوشهٔ نگین‌های گرد", constellationImage: sourcePhoto("16", "jewelry-sets"),
    flowerPendant: "سنبل با نگین صورتی ملایم", flowerImage: sourcePhoto("23", "pendants"),
  },
];

export function findGalleryBirthMonth(photo: Pick<GalleryRender, "number" | "src" | "categoryId">) {
  return birthMonths.find(({ braceletImage, constellationImage, flowerImage }) =>
    [braceletImage, constellationImage, flowerImage].some((source) =>
      source?.number === photo.number && source.src === photo.src && source.categoryId === photo.categoryId,
    ),
  );
}

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
