import Link from "next/link";

const navItems = [
  { href: "/", label: "خانه" },
  { href: "/shop", label: "فروشگاه" },
  { href: "/custom-design", label: "طراحی اختصاصی" },
  { href: "/ring-builder", label: "طراحی انگشتر" },
  { href: "/guide", label: "راهنما" },
];

const actionItems = [
  { href: "/login", label: "ورود / حساب من" },
  { href: "/request-basket", label: "سبد درخواست" },
];

export function SiteHeader() {
  return (
    <header className="border-b border-silver/70 bg-ivory/95">
      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
        <Link href="/" className="text-lg font-semibold tracking-normal text-graphite">
          Ornova by Yas
        </Link>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-8">
          <nav aria-label="ناوبری اصلی" className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-graphite/75">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="transition hover:text-sapphire">
                {item.label}
              </Link>
            ))}
          </nav>
          <nav aria-label="اقدام‌های کاربری" className="flex flex-wrap items-center gap-3 text-sm">
            {actionItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full border border-silver px-4 py-2 text-graphite/75 transition hover:border-sapphire hover:text-sapphire"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
