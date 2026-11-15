import { parseProductPreferences, productConfigurationKey, type ProductPreferences } from "./product-preferences";
import { getRequestItemKey, REQUEST_LINE_ID_PATTERN, type RequestItem } from "./request-basket";

type ProductIdentity = Pick<RequestItem, "slug" | "name" | "category">;
type ConfigurationResult = { success: true; items: RequestItem[]; key: string } | { success: false; error: string };

export function applyProductConfiguration(items: RequestItem[], item: ProductIdentity, preferences: ProductPreferences | undefined, newLineId: string, targetKey?: string): ConfigurationResult {
  const parsed = parseProductPreferences(preferences, item.category === "انگشتر");
  if (!parsed.success) return parsed;
  const existing = targetKey ? items.find((entry) => getRequestItemKey(entry) === targetKey && entry.slug === item.slug) : undefined;
  if (targetKey && !existing) return { success: false, error: "این انتخاب دیگر در سبد نیست؛ برای ثبت مشخصات تازه، گزینهٔ افزودن مشخصات دیگر را بزنید." };
  const identical = items.find((entry) => productConfigurationKey(entry.slug, entry.preferences) === productConfigurationKey(item.slug, parsed.value));
  if (identical && (!existing || getRequestItemKey(identical) !== getRequestItemKey(existing))) {
    return existing ? { success: false, error: "این مشخصات از قبل در ردیف دیگری از سبد است؛ تعداد همان ردیف را تغییر دهید." } : { success: true, items, key: getRequestItemKey(identical) };
  }
  if (!existing && items.length >= 50) return { success: false, error: "سبد به سقف ۵۰ انتخاب رسیده است؛ پیش از افزودن، آن را مرور کنید." };
  if (!existing && (!REQUEST_LINE_ID_PATTERN.test(newLineId) || items.some((entry) => getRequestItemKey(entry) === newLineId))) return { success: false, error: "شناسهٔ انتخاب ساخته نشد؛ دوباره تلاش کنید." };
  const configured: RequestItem = { ...existing, slug: item.slug, name: item.name, category: item.category, ...(existing ? {} : { lineId: newLineId }), quantity: existing?.quantity ?? 1, preferences: parsed.value };
  return { success: true, key: getRequestItemKey(configured), items: existing ? items.map((entry) => getRequestItemKey(entry) === targetKey ? configured : entry) : [...items, configured] };
}
