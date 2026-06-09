import Link from "next/link";

const navItems = [
  { href: "/", label: "خانه" },
  { href: "/shop", label: "فروشگاه" },
  { href: "/custom-design", label: "استودیو طراحی اختصاصی" },
  { href: "/ring-builder", label: "طراحی انگشتر" },
  { href: "/shop", label: "کالکشن‌ها" },
  { href: "/about", label: "درباره یاس" },
  { href: "/silver-care", label: "راهنمای نگهداری" },
  { href: "/contact", label: "تماس" },
];

export function SiteHeader() {
  return (
    <header className="border-b border-silver/70 bg-ivory/95">
      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-5 py-5 md:flex-row md:items-center md:justify-between">
        <Link href="/" className="text-lg font-semibold tracking-normal text-graphite">
          Ornova by Yas
        </Link>
        <nav aria-label="ناوبری اصلی" className="flex flex-wrap items-center gap-4 text-sm text-graphite/75 md:justify-end">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="transition hover:text-sapphire">
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
