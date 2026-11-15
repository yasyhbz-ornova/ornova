import { productPreferenceRows } from "@/lib/commerce/product-preferences";

export function ProductPreferencesSummary({ value }: { value: unknown }) {
  const rows = productPreferenceRows(value);
  if (!rows.length) return null;
  return <div className="mt-3 text-sm leading-7 text-graphite/80"><p className="text-xs text-sapphire">مشخصات دلخواه برای بررسی</p><dl className="mt-2 grid gap-1">{rows.map((row) => <div key={row.label} className="flex flex-wrap gap-x-2"><dt>{row.label}:</dt><dd className="min-w-0 whitespace-pre-wrap break-words"><bdi dir="auto">{row.value}</bdi></dd></div>)}</dl></div>;
}
