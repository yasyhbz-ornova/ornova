export type ProductPreferences = {
  version: 1;
  ring_size_eu?: number;
  stone_note?: string;
  dimensions_note?: string;
  finish_note?: string;
};

const noteFields = ["stone_note", "dimensions_note", "finish_note"] as const;
const labels = { stone_note: "سنگ و رنگ دلخواه", dimensions_note: "اندازه و ابعاد دلخواه", finish_note: "پرداخت و جزئیات دلخواه" } as const;

export function productConfigurationKey(slug: string, preferences?: ProductPreferences) {
  return JSON.stringify([slug, preferences?.ring_size_eu ?? null, ...noteFields.map((key) => preferences?.[key] ?? "")]);
}

export function parseProductPreferences(value: unknown, isRing: boolean): { success: true; value: ProductPreferences | undefined } | { success: false; error: string } {
  const invalid = { success: false as const, error: "مشخصات قطعه معتبر نیست؛ سایز و توضیح‌ها را دوباره بررسی کنید." };
  if (value === undefined) return { success: true, value: undefined };
  if (!value || typeof value !== "object" || Array.isArray(value)) return invalid;
  const input = value as Record<string, unknown>;
  if (input.version !== 1 || Object.keys(input).some((key) => !["version", "ring_size_eu", ...noteFields].includes(key))) return invalid;
  const result: ProductPreferences = { version: 1 };
  if (input.ring_size_eu !== undefined) {
    const size = input.ring_size_eu;
    // Input plausibility only: this is not a list of sizes available to manufacture.
    if (!isRing || typeof size !== "number" || !Number.isFinite(size) || size < 20 || size > 100 || !Number.isInteger(size * 2)) return invalid;
    result.ring_size_eu = size;
  }
  for (const field of noteFields) {
    if (input[field] === undefined) continue;
    if (typeof input[field] !== "string" || input[field].length > 120) return invalid;
    const text = input[field].replace(/\r\n?/g, "\n").trim();
    if (text) result[field] = text;
  }
  return { success: true, value: Object.keys(result).length > 1 ? result : undefined };
}

export function parseEuSizeInput(input: string): number | undefined | null {
  const text = input.trim().replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit))).replace(/٫/g, ".");
  if (!text) return undefined;
  if (!/^\d{2,3}(?:\.5|\.0)?$/.test(text)) return null;
  const size = Number(text);
  return size >= 20 && size <= 100 ? size : null;
}

export function productPreferenceRows(value: unknown): { label: string; value: string }[] {
  const parsed = parseProductPreferences(value, true);
  if (!parsed.success || !parsed.value) return [];
  const preferences = parsed.value;
  const rows: { label: string; value: string }[] = [];
  if (preferences.ring_size_eu !== undefined) rows.push({ label: "سایز اروپایی انگشتر", value: new Intl.NumberFormat("fa-IR").format(preferences.ring_size_eu) });
  for (const key of noteFields) if (preferences[key]) rows.push({ label: labels[key], value: preferences[key] });
  return rows;
}
