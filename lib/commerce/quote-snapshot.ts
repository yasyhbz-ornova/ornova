import { isCanonicalRial } from "./quote-money";

export type QuoteLine = { description: string; quantity: number; amount_rial: string };
export type QuoteSnapshotInput = {
  version: 1; source_quote_no: string; source_order_no: string; source_revision: number;
  issued_at: string; valid_until: string; lines: QuoteLine[];
  discount_rial: string; tax_rial: string; total_rial: string;
};
export type QuoteSnapshot = QuoteSnapshotInput;
type ParseResult = { success: true; value: QuoteSnapshot } | { success: false; error: string };
const MAX_RIAL = BigInt("9223372036854775807");
const keys = ["version", "source_quote_no", "source_order_no", "source_revision", "issued_at", "valid_until", "lines", "discount_rial", "tax_rial", "total_rial"];

function exactObject(value: unknown, allowed: string[]): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === allowed.length && Object.keys(value).every((key) => allowed.includes(key)));
}
function text(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= max && !/[<>]|(?:javascript|data)\s*:/i.test(trimmed) ? trimmed : null;
}
function timestamp(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(?:Z|[+-](\d{2}):(\d{2}))$/.exec(value);
  if (!match) return null;
  const [, year, month, day, hour, minute, second, offsetHour = "0", offsetMinute = "0"] = match;
  const y = Number(year), m = Number(month), d = Number(day);
  const monthDays = [31, y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (y < 1 || m < 1 || m > 12 || d < 1 || d > monthDays[m - 1] || Number(hour) > 23 || Number(minute) > 59 || Number(second) > 59 || Number(offsetHour) > 23 || Number(offsetMinute) > 59) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

export function parseQuoteSnapshot(input: unknown): ParseResult {
  const fail = (error: string): ParseResult => ({ success: false, error });
  if (!exactObject(input, keys) || input.version !== 1) return fail("ساختار پیشنهاد قیمت معتبر نیست.");
  const quoteNo = text(input.source_quote_no, 80), orderNo = text(input.source_order_no, 80);
  const revision = input.source_revision;
  if (!quoteNo || !orderNo || typeof revision !== "number" || !Number.isInteger(revision) || revision < 1 || revision > 10000) return fail("شماره یا نسخهٔ سند معتبر نیست.");
  const issued = timestamp(input.issued_at), until = timestamp(input.valid_until);
  if (!issued || !until || Date.parse(until) <= Date.parse(issued)) return fail("تاریخ صدور و پایان اعتبار را همراه منطقهٔ زمانی وارد کنید.");
  if (!Array.isArray(input.lines) || input.lines.length < 1 || input.lines.length > 50) return fail("پیشنهاد باید بین یک تا پنجاه ردیف داشته باشد.");
  const lines: QuoteLine[] = [];
  let sum = BigInt(0);
  for (const row of input.lines) {
    if (!exactObject(row, ["description", "quantity", "amount_rial"])) return fail("ساختار ردیف پیشنهاد معتبر نیست.");
    const description = text(row.description, 240), quantity = row.quantity;
    if (!description || typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1 || quantity > 1000 || !isCanonicalRial(row.amount_rial)) return fail("شرح، تعداد یا مبلغ کل ردیف معتبر نیست.");
    sum += BigInt(row.amount_rial);
    if (sum > MAX_RIAL) return fail("جمع مبلغ خارج از محدودهٔ مجاز است.");
    lines.push({ description, quantity, amount_rial: row.amount_rial });
  }
  if (!isCanonicalRial(input.discount_rial) || !isCanonicalRial(input.tax_rial) || !isCanonicalRial(input.total_rial)) return fail("مبلغ‌ها باید عدد صحیح ریالی باشند.");
  const discount = BigInt(input.discount_rial), total = sum - discount + BigInt(input.tax_rial);
  if (discount > sum || total <= BigInt(0) || total > MAX_RIAL || total !== BigInt(input.total_rial)) return fail("جمع نهایی با ردیف‌ها، تخفیف و مالیات یکسان نیست.");
  return { success: true, value: { version: 1, source_quote_no: quoteNo, source_order_no: orderNo, source_revision: revision, issued_at: issued, valid_until: until, lines, discount_rial: input.discount_rial, tax_rial: input.tax_rial, total_rial: input.total_rial } };
}

export function validateQuoteDates(value: QuoteSnapshot, now: Date): boolean {
  const time = now.getTime();
  return Number.isFinite(time) && Date.parse(value.issued_at) <= time && Date.parse(value.valid_until) > time;
}
