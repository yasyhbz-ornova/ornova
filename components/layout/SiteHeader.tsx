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
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-5 lg:flex-row lg:items-center lg:justify-between lg:gap-10 lg:py-6">
        <div className="flex items-center justify-between gap-5">
          <Link href="/" className="text-lg font-semibold tracking-normal text-graphite">Ornova by Yas</Link>
          <details className="mobile-menu relative lg:hidden">
            <summary aria-label="بازکردن منوی سایت" className="cursor-pointer list-none rounded-full border border-silver bg-ivory-soft px-4 py-2 text-sm text-graphite/75 outline-none transition hover:border-sapphire focus-visible:border-sapphire focus-visible:ring-2 focus-visible:ring-sapphire/30">منو</summary>
            <div className="absolute left-0 z-20 mt-3 w-64 rounded-[22px] border border-silver bg-ivory p-4 shadow-lg">
              <nav aria-label="ناوبری موبایل" className="grid gap-1 text-sm text-graphite/80">
                {navItems.map((item) => <Link key={item.href} href={item.href} className="rounded-[14px] px-3 py-3 hover:bg-ivory-muted hover:text-sapphire">{item.label}</Link>)}
                <div className="my-2 border-t border-silver/60" />
                {actionItems.map((item) => <Link key={item.href} href={item.href} className="rounded-[14px] px-3 py-3 hover:bg-ivory-muted hover:text-sapphire">{item.label}</Link>)}
              </nav>
            </div>
          </details>
        </div>
        <div className="hidden flex-col gap-5 lg:flex lg:flex-row lg:items-center lg:gap-10">
          <nav aria-label="ناوبری اصلی" className="flex flex-wrap items-center gap-x-7 gap-y-3 text-sm text-graphite/70">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="transition hover:text-sapphire">
                {item.label}
              </Link>
            ))}
          </nav>
          <nav aria-label="اقدام‌های کاربری" className="flex flex-wrap items-center gap-3 border-t border-silver/60 pt-4 text-sm lg:border-r lg:border-t-0 lg:pr-6 lg:pt-0">
            {actionItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full border border-silver bg-ivory-soft px-4 py-2 text-graphite/70 transition hover:border-sapphire hover:text-sapphire"
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
