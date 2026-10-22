const MAX_RIAL = BigInt("9223372036854775807");
const digits = "۰۱۲۳۴۵۶۷۸۹";

export function isCanonicalRial(value: unknown): value is string {
  return typeof value === "string" && /^(0|[1-9]\d{0,18})$/.test(value) && BigInt(value) <= MAX_RIAL;
}

/** UI-only normalization. API input must already be canonical. */
export function parseRialInput(value: string): string | null {
  const normalized = value.trim().replace(/[۰-۹]/g, (digit) => String(digits.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
  if (!/^(?:\d+|\d{1,3}(?:[,٬]\d{3})+)$/.test(normalized)) return null;
  const canonical = normalized.replace(/[,٬]/g, "").replace(/^0+(?=\d)/, "");
  return isCanonicalRial(canonical) ? canonical : null;
}

export function formatRialAsToman(value: string): string {
  if (!isCanonicalRial(value)) throw new Error("مبلغ ریالی معتبر نیست.");
  const amount = BigInt(value), whole = String(amount / BigInt(10)), fraction = amount % BigInt(10);
  const formatted = whole.replace(/\B(?=(\d{3})+(?!\d))/g, "٬") + (fraction ? `٫${fraction}` : "");
  return `${formatted.replace(/\d/g, (digit) => digits[Number(digit)])} تومان`;
}
