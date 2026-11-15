import Link from "next/link";
import Image from "next/image";

type Concept = {
  number: string;
  name: string;
  eyebrow: string;
  description: string;
  note: string;
  className: string;
  href: string;
  image: string;
  imageAlt: string;
  entry: string;
  rhythm: string;
};

const concepts: Concept[] = [
  {
    number: "۰۱",
    name: "آرشیو ماهتابی",
    eyebrow: "روایت / قطعه / خاطره",
    description: "صفحه مانند یک پرونده آرام از قطعات و نشانه‌ها باز می‌شود؛ با کپشن‌های کوچک، مکث‌های بلند و محصولی که از دل آرشیو بیرون می‌آید.",
    note: "جهت روایت آرشیوی؛ خانه‌ی اصلی را تغییر نمی‌دهد.",
    className: "concept-archive",
    href: "/concepts/archive",
    image: "/images/ornova/lajvard-shab-03.png",
    imageAlt: "انگشتر نقره‌ی لاجورد شب در نور کم، برای مسیر آرشیو ماهتابی",
    entry: "ورود از یک قطعه‌ی واقعی",
    rhythm: "پرونده‌خوانی آرام، سپس انتخاب مسیر",
  },
  {
    number: "۰۲",
    name: "ردّ فرم",
    eyebrow: "فرم / خط / امکان ساخت",
    description: "یک قطعه‌ی واقعی نقطه‌ی شروع است؛ تصویر، روایت کوتاه و امکان درخواست در ادامه‌ی همان مسیر می‌آیند.",
    note: "جهت کشف فرم؛ خانه‌ی اصلی را تغییر نمی‌دهد.",
    className: "concept-orbit",
    href: "/concepts/trace",
    image: "/images/ornova/goldan-khamoosh-02.jpg",
    imageAlt: "سنجاق سینه‌ی گلدان خاموش روی کت تیره، در فضای روایی ردّ فرم",
    entry: "ورود از ماده و جزئیات",
    rhythm: "کشف مرحله‌ای فرم، سپس دیدن مجموعه",
  },
  {
    number: "۰۳",
    name: "پژواک",
    eyebrow: "فاصله / خاطره / همراهی",
    description: "تصویر تمام‌صفحه نقطه‌ی آغاز است؛ روایت کوتاه و فهرست قطعات آرام‌آرام وارد می‌شوند، بی‌آنکه متن یا حرکت روی محصول غلبه کند.",
    note: "جهت تصویرمحور و صمیمی؛ خانه‌ی اصلی را تغییر نمی‌دهد.",
    className: "concept-echo",
    href: "/concepts/echo",
    image: "/images/ornova/lajvard-shab-01.jpg",
    imageAlt: "انگشتر لاجورد شب بر دست؛ تصویر نزدیک برای کانسپت پژواک",
    entry: "ورود از نزدیکیِ تصویر",
    rhythm: "مکث سینمایی، سپس همراهی با قطعه",
  },
  {
    number: "۰۴",
    name: "ماندِ تصویر",
    eyebrow: "حضور / سکوت / انتخاب",
    description: "به‌جای آن‌که متن بر تصویر بنشیند، قطعه فرصت دیده‌شدن پیدا می‌کند؛ بعد، پرونده‌ی محصول و راه درخواست در امتداد همان نگاه باز می‌شود.",
    note: "جهت محصول‌محور با مسیر درخواست واقعی؛ خانه‌ی اصلی را تغییر نمی‌دهد.",
    className: "concept-afterimage",
    href: "/concepts/afterimage",
    image: "/images/ornova/lajvard-shab-03.png",
    imageAlt: "انگشتر لاجورد شب بر دست، در قاب نزدیک و آرام کانسپت ماندِ تصویر",
    entry: "ورود از حضورِ یک قطعه",
    rhythm: "نگاه نزدیک، پرونده‌ی محصول، انتخاب آگاهانه",
  },
];

export function ConceptRoute({ concept }: { concept: Concept }) {
  return (
    <article className="concept-route overflow-hidden border border-silver bg-ivory-soft">
      <div className={`concept-stage concept-stage--photo ${concept.className}`}>
        <Image src={concept.image} alt={concept.imageAlt} fill sizes="(max-width: 768px) 100vw, 48vw" className="concept-stage-image object-cover" />
        <div className="concept-stage-shade" aria-hidden="true" />
        <span className="absolute right-6 top-6 text-xs tracking-[0.18em] text-ivory/80">پیش‌نمایش / {concept.number}</span>
        <div className="absolute bottom-6 right-6 left-6 flex items-end justify-between gap-4">
          <p className="text-xs leading-6 text-ivory/85">{concept.entry}<br />{concept.rhythm}</p>
          <span className="text-3xl font-light text-ivory/90">{concept.number}</span>
        </div>
      </div>
      <div className="grid gap-5 p-6 md:grid-cols-[0.7fr_1.3fr] md:p-8">
        <div>
          <p className="text-xs font-medium text-sapphire">{concept.eyebrow}</p>
          <h2 className="mt-3 text-2xl font-semibold text-graphite">{concept.name}</h2>
        </div>
        <div>
          <p className="max-w-xl text-sm leading-8 text-graphite/75">{concept.description}</p>
          <p className="mt-4 text-xs text-graphite/55">{concept.note}</p>
          <Link href={concept.href} className="concept-open mt-5 inline-flex text-sm text-sapphire">دیدن کانسپت ←</Link>
        </div>
      </div>
    </article>
  );
}

export function ConceptIndex() {
  return (
    <main className="bg-ivory">
      <section className="mx-auto max-w-6xl px-5 pb-14 pt-16 md:pb-20 md:pt-24">
        <div className="grid gap-10 md:grid-cols-[0.65fr_1.35fr] md:items-end">
          <div>
            <p className="text-sm text-sapphire">مطالعه‌ی طراحی / ۱۴۰۵</p>
            <p className="mt-3 text-xs leading-6 text-graphite/55">چهار جهت برای مقایسه؛ هیچ‌کدام هنوز جایگزین صفحه‌ی فعال نیست.</p>
          </div>
          <div>
            <h1 className="max-w-3xl text-4xl font-semibold leading-[1.45] text-graphite md:text-6xl">چهار راه برای ورود به جهان Ornova</h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-graphite/70">آرشیو از خودِ قطعه آغاز می‌شود؛ ردّ فرم از جزئیات؛ پژواک از نزدیکیِ تصویر؛ ماندِ تصویر از حضور آرام محصول و مسیر روشن درخواست. هر مسیر را جدا ببین و بعد درباره‌ی خانه تصمیم بگیر.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-5 pb-20">
        {concepts.map((concept) => <ConceptRoute key={concept.number} concept={concept} />)}
      </section>

      <section className="border-t border-silver bg-ivory-muted">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-14 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-sapphire">قدم بعدی</p>
            <h2 className="mt-2 text-2xl font-semibold text-graphite">هیچ‌کدام تا انتخاب یاس جای خانه را نمی‌گیرد.</h2>
          </div>
          <Link href="/" className="inline-flex w-fit rounded-full bg-sapphire px-6 py-3 text-sm font-medium text-ivory">بازگشت به سایت فعلی</Link>
        </div>
      </section>
    </main>
  );
}
