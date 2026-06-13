import Link from "next/link";

const footerLinks = [
  { href: "/size-guide", label: "راهنمای سایز" },
  { href: "/silver-care", label: "نگهداری نقره" },
  { href: "/silver-properties", label: "ویژگی‌های نقره" },
  { href: "/faq", label: "پرسش‌های رایج" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-silver/70 bg-ivory-muted">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 md:grid-cols-[1.15fr_1fr] md:items-start">
        <div>
          <p className="text-sm text-sapphire">Ornova by Yas</p>
          <h2 className="mt-3 text-xl font-semibold text-graphite">ارتباط با Ornova</h2>
          <p className="mt-3 max-w-md text-sm leading-7 text-graphite/70">
            برای سفارش طراحی اختصاصی، پرسش درباره محصولات یا هماهنگی ساخت، از صفحه تماس با ما پیام بفرستید.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-3 border-t border-silver/60 pt-6 text-sm text-graphite/70 md:justify-end md:border-t-0 md:pt-1">
          {footerLinks.map((link) => (
            <Link key={link.href} href={link.href} className="transition hover:text-sapphire">
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
