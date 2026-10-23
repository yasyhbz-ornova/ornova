import type { CustomerQuoteDTO } from "@/lib/account/inquiry-quotes";
import { formatRialAsToman } from "@/lib/commerce/quote-money";

function date(value: string) { return new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tehran" }).format(new Date(value)); }
export function InquiryQuoteCard({ quote, isPreviousVersion, now }: { quote: CustomerQuoteDTO; isPreviousVersion: boolean; now: string }) {
  const expired = Date.parse(quote.payload.valid_until) <= Date.parse(now);
  return <article className="min-w-0 border border-silver bg-ivory-soft p-5 sm:p-7" aria-label="پیشنهاد قیمت">
    <header className="flex flex-wrap items-start justify-between gap-3 border-b border-silver pb-4">
      <div><p className="text-xs text-sapphire">پیشنهاد قیمت{isPreviousVersion ? " · نسخهٔ پیشین" : ""}</p><h3 className="mt-2 break-all text-lg"><bdi>{quote.source_quote_no}</bdi></h3><p className="mt-1 text-xs text-graphite/65">نسخهٔ {quote.source_revision.toLocaleString("fa-IR")} · سفارش <bdi>{quote.source_order_no}</bdi></p></div>
      <p className="text-xs leading-7 text-graphite/65">صدور: {date(quote.payload.issued_at)}<br />اعتبار تا: {date(quote.payload.valid_until)}<br />به وقت تهران</p>
    </header>
    {quote.withdrawn_at ? <p className="mt-4 text-sm leading-7" role="status">این پیشنهاد پس گرفته شده؛ برای ادامه منتظر نسخهٔ تازه باشید.</p> : expired ? <p className="mt-4 text-sm leading-7" role="status">مهلت پیشنهاد گذشته است؛ برای قیمت تازه با Ornova هماهنگ کنید.</p> : null}
    <ol className="mt-5 space-y-4" aria-label="ردیف‌های پیشنهاد قیمت">{quote.payload.lines.map((line, index) => <li key={index} className="flex flex-wrap justify-between gap-x-5 gap-y-1 text-sm leading-7"><div className="min-w-0 flex-1 break-words"><p>{line.description}</p><p className="text-xs text-graphite/60">تعداد {line.quantity.toLocaleString("fa-IR")} · مبلغ کل ردیف</p></div><span className="tabular-nums">{formatRialAsToman(line.amount_rial)}</span></li>)}</ol>
    <dl className="mt-5 space-y-2 border-t border-silver pt-4 text-sm"><div className="flex flex-wrap justify-between gap-2"><dt>تخفیف</dt><dd>{formatRialAsToman(quote.payload.discount_rial)}</dd></div><div className="flex flex-wrap justify-between gap-2"><dt>مالیات ثبت‌شده در پیشنهاد</dt><dd>{formatRialAsToman(quote.payload.tax_rial)}</dd></div><div className="flex flex-wrap justify-between gap-2 pt-3 font-medium"><dt>جمع نهایی</dt><dd>{formatRialAsToman(quote.payload.total_rial)}</dd></div></dl>
    <p className="mt-5 text-xs leading-6 text-graphite/60">این سند پیشنهاد قیمت است؛ فاکتور یا رسید پرداخت نیست. تغییر نرخ‌های بعدی، مبلغ این نسخه را عوض نمی‌کند.</p>
  </article>;
}

export function InquiryQuoteList({ quotes, now }: { quotes: CustomerQuoteDTO[]; now: string }) {
  if (!quotes.length) return <p className="py-4 text-sm leading-7 text-graphite/65">هنوز پیشنهاد قیمت مستقلی در این پرونده ثبت نشده است.</p>;
  return <div className="space-y-5">{quotes.map(quote => <InquiryQuoteCard key={quote.id} quote={quote} now={now} isPreviousVersion={quotes.some(other => other.document_id === quote.document_id && other.source_revision > quote.source_revision)} />)}</div>;
}
