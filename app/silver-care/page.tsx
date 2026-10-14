import Link from "next/link";

export const metadata = {
  title: "نگهداری نقره | Ornova by Yas",
  description: "راهنمای آرام و ساده برای نگهداری از قطعات نقره Ornova.",
};

const careNotes = [
  ["پس از استفاده", "قطعه را با پارچه‌ی نرم و خشک پاک کنید تا چربی و رطوبت روی سطح آن نماند."],
  ["هنگام نگهداری", "هر قطعه را جدا از قطعات دیگر، داخل کیسه یا جعبه‌ی خشک و دور از نور مستقیم قرار دهید."],
  ["در زمان استفاده", "پیش از تماس با عطر، کرم، مواد شوینده و آب استخر، جواهر را کنار بگذارید."],
  ["برای تمیزکردن", "از مواد ساینده و برس زبر استفاده نکنید. اگر قطعه سنگ یا جزئیات ظریف دارد، پیش از تمیزکاری با Ornova مشورت کنید."],
];

export default function SilverCarePage() {
  return (
    <main className="bg-ivory">
      <section className="border-b border-silver bg-ivory-soft"><div className="mx-auto max-w-6xl px-5 py-16 md:py-24"><p className="text-sm text-sapphire">راهنمای Ornova / مراقبت</p><h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-[1.5] text-graphite md:text-5xl">نقره با مراقبت ساده، آرام‌تر می‌ماند.</h1><p className="mt-6 max-w-2xl text-base leading-8 text-graphite/70">نگهداری درست به جنس قطعه، سنگ و پوشش آن بستگی دارد. این نکته‌ها برای مراقبت روزمره‌اند؛ برای قطعات خاص، توضیح اختصاصی Ornova را در نظر بگیرید.</p></div></section>
      <section className="mx-auto max-w-6xl px-5 py-16 md:py-20"><div className="grid gap-x-10 gap-y-12 md:grid-cols-2">{careNotes.map(([title, text], index) => <article key={title} className="border-t border-silver pt-5"><p className="text-xs text-sapphire">۰{index + 1}</p><h2 className="mt-4 text-xl font-semibold text-graphite">{title}</h2><p className="mt-4 max-w-xl text-sm leading-8 text-graphite/70">{text}</p></article>)}</div></section>
      <section className="mx-auto max-w-4xl px-5 pb-16 md:pb-24"><div className="border border-silver bg-ivory-muted p-6 md:p-8"><p className="text-sm font-medium text-sapphire">قطعه‌ی شما متفاوت است؟</p><p className="mt-4 text-base leading-8 text-graphite/75">اگر درباره‌ی سنگ، پوشش یا روش تمیزکردن یک قطعه‌ی مشخص پرسشی دارید، نام قطعه را در پیام‌تان بنویسید تا راهنمایی دقیق‌تری دریافت کنید.</p><Link href="/contact" className="mt-6 inline-flex rounded-full bg-sapphire px-6 py-3 text-sm font-medium text-ivory">پرسش درباره قطعه</Link></div></section>
    </main>
  );
}
