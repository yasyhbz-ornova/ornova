import Link from "next/link";

export function AdminAccessDenied({ returnTo }: { returnTo: string }) {
  return <main dir="rtl" className="account-space mx-auto max-w-2xl px-5 py-16">
    <h1 className="text-2xl text-graphite">دسترسی به میز مدیریت</h1>
    <p className="mt-4 text-sm leading-8 text-graphite/75">این نشست به میز مدیریت دسترسی ندارد. اگر با حساب مدیر وارد شده‌اید، از حساب خارج شوید و با همان ایمیل دوباره وارد شوید.</p>
    <Link href={`/?galleryPanel=account&next=${encodeURIComponent(returnTo)}`} className="mt-6 inline-block border-b border-silver pb-1 text-sm text-sapphire">بازگشت به حساب</Link>
  </main>;
}
