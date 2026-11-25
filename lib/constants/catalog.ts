export const catalogFamilies = [
  { id: "jewelry", label: "زیورآلات" },
  { id: "accessories", label: "اکسسوری‌های زینتی" },
  { id: "sets", label: "ست‌ها" },
] as const;

type CatalogCategory = {
  id: string;
  label: string;
  family: (typeof catalogFamilies)[number]["id"];
  types: readonly { id: string; label: string }[];
};

// Navigation is deliberately independent of published products and inventory.
export const catalogCategories = [
  { id: "rings", label: "انگشتر", family: "jewelry", types: [
    { id: "ring-band", label: "حلقه و رینگ" },
    { id: "ring-stone", label: "نگین‌دار" },
    { id: "ring-signet", label: "انگشتر مُهر" },
    { id: "ring-open", label: "انگشتر باز" },
    { id: "ring-midi", label: "بندانگشتی" },
    { id: "ring-stacking", label: "چندتایی و روی‌هم" },
    { id: "ring-sculptural", label: "حجمی" },
    { id: "ring-connected", label: "چندانگشتی و متصل" },
  ] },
  { id: "earrings", label: "گوشواره", family: "jewelry", types: [
    { id: "ear-stud", label: "میخی" },
    { id: "ear-hoop", label: "حلقه‌ای" },
    { id: "ear-drop", label: "آویز کوتاه" },
    { id: "ear-dangle", label: "آویز بلند" },
    { id: "ear-threader", label: "بخیه‌ای و زنجیری" },
    { id: "ear-clip", label: "کلیپسی" },
    { id: "ear-cuff", label: "کاف گوش" },
    { id: "ear-jacket", label: "دوطرفه و پشت‌گوشی" },
  ] },
  { id: "necklaces", label: "گردنبند", family: "jewelry", types: [
    { id: "necklace-pendant", label: "گردنبند آویزدار" },
    { id: "necklace-choker", label: "چوکر و دورگردنی" },
    { id: "necklace-collar", label: "طوق" },
    { id: "necklace-layered", label: "چندردیفه" },
    { id: "necklace-lariat", label: "کراواتی و بلند" },
    { id: "necklace-locket", label: "قاب عکس و یادگاری" },
  ] },
  { id: "pendants", label: "آویز گردنبند", family: "jewelry", types: [
    { id: "pendant-symbol", label: "نماد و نقش" },
    { id: "pendant-letter", label: "حرف و نام" },
    { id: "pendant-locket", label: "بازشو و قاب‌دار" },
    { id: "pendant-medallion", label: "مدالیون" },
    { id: "pendant-sculptural", label: "حجمی" },
  ] },
  { id: "chains", label: "زنجیر", family: "jewelry", types: [
    { id: "chain-cable", label: "حلقه‌ای" },
    { id: "chain-curb", label: "کارتیر و تخت" },
    { id: "chain-rope", label: "طنابی" },
    { id: "chain-snake", label: "ماری" },
    { id: "chain-box", label: "باکس و ونیزی" },
    { id: "chain-ball", label: "توپی" },
  ] },
  { id: "bracelets", label: "دستبند", family: "jewelry", types: [
    { id: "bracelet-chain", label: "زنجیری" },
    { id: "bracelet-charm", label: "چارم‌دار" },
    { id: "bracelet-tennis", label: "تنیسی و ردیفی" },
    { id: "bracelet-cord", label: "بندی" },
    { id: "bracelet-bead", label: "مهره‌ای" },
    { id: "bracelet-id", label: "پلاک‌دار" },
    { id: "bracelet-hand", label: "تمیمه و دستبند متصل به انگشتر" },
  ] },
  { id: "bangles", label: "النگو و کاف دست", family: "jewelry", types: [
    { id: "bangle-closed", label: "النگوی بسته" },
    { id: "bangle-hinged", label: "لولایی و قفل‌دار" },
    { id: "bangle-cuff", label: "کاف باز" },
    { id: "bangle-upper-arm", label: "بازوبند" },
  ] },
  { id: "anklets", label: "پابند و زیور پا", family: "jewelry", types: [
    { id: "anklet-chain", label: "پابند زنجیری" },
    { id: "anklet-charm", label: "پابند آویزدار" },
    { id: "anklet-cord", label: "پابند بندی" },
    { id: "anklet-toe", label: "انگشتر پا" },
    { id: "anklet-connected", label: "پابند متصل" },
  ] },
  { id: "body-jewelry", label: "پیرسینگ و زیور بدن", family: "jewelry", types: [
    { id: "body-ear", label: "پیرسینگ گوش" },
    { id: "body-nose", label: "پیرسینگ بینی" },
    { id: "body-lip", label: "پیرسینگ لب" },
    { id: "body-navel", label: "پیرسینگ ناف" },
    { id: "body-chain", label: "زنجیر بدن و کمر" },
    { id: "body-clip", label: "زیور بدن بدون سوراخ" },
  ] },
  { id: "brooches-pins", label: "بروچ و سنجاق سینه", family: "jewelry", types: [
    { id: "brooch", label: "بروچ" },
    { id: "lapel-pin", label: "پین یقه" },
    { id: "stick-pin", label: "سنجاق میله‌ای" },
    { id: "dress-clip", label: "گیره تزئینی لباس" },
  ] },
  { id: "charms", label: "چارم و آویزهای ماژولار", family: "accessories", types: [
    { id: "charm-bracelet", label: "چارم دستبند" },
    { id: "charm-necklace", label: "چارم گردنبند" },
    { id: "charm-watch", label: "چارم بند ساعت" },
    { id: "charm-letter", label: "حرف و نشانه" },
    { id: "charm-connector", label: "رابط و جداکننده" },
  ] },
  { id: "hair-accessories", label: "زیور و اکسسوری مو", family: "accessories", types: [
    { id: "hair-pin", label: "سنجاق مو" },
    { id: "hair-stick", label: "چوب و میله مو" },
    { id: "hair-comb", label: "شانه تزئینی" },
    { id: "hair-clip", label: "گیره و گل‌سر" },
    { id: "hair-band", label: "تل و هدبند" },
    { id: "hair-crown", label: "تاج و ریسه مو" },
  ] },
  { id: "formal-accessories", label: "اکسسوری لباس و پوشش", family: "accessories", types: [
    { id: "formal-cufflink", label: "دکمه سردست" },
    { id: "formal-tie", label: "گیره و سنجاق کراوات" },
    { id: "formal-collar", label: "زیور یقه" },
    { id: "formal-scarf", label: "حلقه و گیره شال" },
    { id: "formal-button", label: "دکمه تزئینی" },
    { id: "formal-buckle", label: "سگک تزئینی" },
  ] },
  { id: "utility-accessories", label: "آویز و اکسسوری همراه", family: "accessories", types: [
    { id: "utility-key", label: "جاکلیدی" },
    { id: "utility-bag", label: "آویز کیف" },
    { id: "utility-phone", label: "آویز تلفن همراه" },
    { id: "utility-glasses", label: "زنجیر و بند عینک" },
    { id: "utility-zip", label: "آویز زیپ" },
  ] },
  { id: "keepsakes", label: "یادگارهای کوچک", family: "accessories", types: [
    { id: "keepsake-bookmark", label: "نشان کتاب" },
    { id: "keepsake-token", label: "نشان و مدال یادگاری" },
    { id: "keepsake-object", label: "حجم کوچک یادگاری" },
  ] },
  { id: "jewelry-sets", label: "ست و نیم‌ست", family: "sets", types: [
    { id: "set-full", label: "ست کامل" },
    { id: "set-half", label: "نیم‌ست" },
    { id: "set-pair", label: "قطعات جفت و هماهنگ" },
    { id: "set-rings", label: "ست انگشتر" },
    { id: "set-modular", label: "ست ماژولار" },
  ] },
] as const satisfies readonly CatalogCategory[];

export type CatalogCategoryId = (typeof catalogCategories)[number]["id"];

export function resolveCatalogSelection(categoryId?: unknown, subtypeId?: unknown) {
  const category: CatalogCategory | null = catalogCategories.find((item) => item.id === categoryId) ?? null;
  return { category, type: category?.types.find((item) => item.id === subtypeId) ?? null };
}

export function catalogHref(categoryId?: unknown, subtypeId?: unknown, query?: string) {
  const { category, type } = resolveCatalogSelection(categoryId, subtypeId);
  const params = new URLSearchParams();
  if (category) params.set("category", category.id);
  if (type) params.set("type", type.id);
  if (query?.trim()) params.set("q", query.trim());
  return `/shop${params.size ? `?${params}` : ""}`;
}

export function normalizeSearch(value: string) {
  return value.normalize("NFKC").replace(/ي/g, "ی").replace(/ك/g, "ک")
    .replace(/[\u064b-\u065f\u0670\u0640]/g, "").replace(/[\u200c\u200d\s]+/g, " ").trim().toLocaleLowerCase("fa-IR");
}

type CatalogProduct = { name: string; category: string; categoryId: string; subtypeId?: string; description: string };

export function filterCatalogProducts<T extends CatalogProduct>(products: readonly T[], categoryId?: unknown, subtypeId?: unknown, query = ""): T[] {
  const { category, type } = resolveCatalogSelection(categoryId, subtypeId);
  const terms = normalizeSearch(query).split(" ").filter(Boolean);
  return products.filter((product) => {
    if (category && product.categoryId !== category.id) return false;
    if (type && product.subtypeId !== type.id) return false;
    const selection = resolveCatalogSelection(product.categoryId, product.subtypeId);
    const haystack = normalizeSearch(`${product.name} ${product.category} ${product.description} ${selection.category?.label ?? ""} ${selection.type?.label ?? ""}`);
    return terms.every((term) => haystack.includes(term));
  });
}
