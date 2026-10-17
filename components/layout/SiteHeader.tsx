import Link from "next/link";

const navItems = [
  { href: "/", label: "خانه" },
  { href: "/shop", label: "فروشگاه" },
  { href: "/custom-design", label: "طراحی اختصاصی" },
  { href: "/ring-builder", label: "طراحی انگشتر" },
  { href: "/guide", label: "راهنما" },
];

export function SiteHeader() {
  return <header className="site-header bg-ivory/95"><div className="mx-auto flex max-w-[1240px] items-center justify-between gap-8 px-5 py-5 lg:px-8"><Link href="/" className="site-wordmark shrink-0" aria-label="Ornova by Yas، خانه"><span>ORNOVA</span><small>by Yas</small></Link><nav aria-label="ناوبری اصلی" className="hidden items-center gap-8 text-sm text-graphite/70 lg:flex">{navItems.map((item) => <Link key={item.href} href={item.href} className="header-link">{item.label}</Link>)}</nav><div className="flex items-center gap-3 text-sm"><Link href="/request-basket" className="header-request hidden sm:inline-flex">سبد درخواست</Link><Link href="/login" className="header-account">ورود</Link><details className="mobile-menu relative lg:hidden"><summary aria-label="بازکردن منوی سایت" className="cursor-pointer list-none border-r border-silver pr-3 text-graphite/70">منو</summary><div className="absolute left-0 z-30 mt-5 w-64 border border-silver bg-ivory p-4 shadow-xl"><nav aria-label="ناوبری موبایل" className="grid gap-1 text-sm">{navItems.map((item) => <Link key={item.href} href={item.href} className="px-3 py-3 hover:bg-ivory-muted">{item.label}</Link>)}<Link href="/request-basket" className="mt-2 border-t border-silver px-3 py-3 pt-4 text-sapphire">سبد درخواست</Link></nav></div></details></div></div></header>;
}
