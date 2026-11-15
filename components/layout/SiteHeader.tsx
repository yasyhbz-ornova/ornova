import Link from "next/link";
import { HeaderMenu } from "./HeaderMenu";

export function SiteHeader() {
  return <header className="site-header bg-ivory/95">
    <div className="mx-auto flex w-full min-w-0 max-w-[1440px] items-center justify-between gap-3 px-5 py-4 lg:gap-8 lg:px-12">
      <Link href="/" className="site-wordmark shrink-0" aria-label="Ornova by Yas، خانه"><span>ORNOVA</span><small>by Yas</small></Link>
      <nav aria-label="ناوبری اصلی" className="hidden items-center gap-7 text-sm text-graphite/75 lg:flex">
        <Link href="/" className="header-link">خانه</Link><HeaderMenu /><Link href="/custom-design" className="header-link">طراحی اختصاصی</Link><Link href="/ring-builder" className="header-link">طراحی انگشتر</Link><Link href="/guide" className="header-link">راهنما</Link>
      </nav>
      <div className="flex min-w-0 items-center gap-2 text-xs sm:text-sm">
        <Link href="/?galleryPanel=basket" className="header-request hidden sm:inline-flex">صندوق درخواست</Link>
        <Link href="/login" className="header-account inline-flex min-h-11 items-center">حساب من</Link><HeaderMenu mobile />
      </div>
    </div>
  </header>;
}
