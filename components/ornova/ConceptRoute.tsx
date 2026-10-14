import Link from "next/link";

type Concept = {
  number: string;
  name: string;
  eyebrow: string;
  description: string;
  note: string;
  className: string;
};

const concepts: Concept[] = [
  {
    number: "01",
    name: "آرشیو ماهتابی",
    eyebrow: "روایت / قطعه / خاطره",
    description: "صفحه مانند یک پرونده آرام از قطعات و نشانه‌ها باز می‌شود؛ با کپشن‌های کوچک، مکث‌های بلند و محصولی که از دل آرشیو بیرون می‌آید.",
    note: "قوی‌ترین مسیر برای حس شخصی و ماندگار Ornova",
    className: "concept-archive",
  },
  {
    number: "02",
    name: "مدار نقره",
    eyebrow: "فرم / خط / امکان ساخت",
    description: "خطوط فنی، حلقه‌ها و فرم‌های خام به‌آرامی دور یک محور می‌چرخند؛ پیوندی دیداری میان طراحی دیجیتال و قطعه قابل ساخت.",
    note: "متمایزترین مسیر برای نشان‌دادن زبان طراحی دیجیتال",
    className: "concept-orbit",
  },
  {
    number: "03",
    name: "اتاق یاس",
    eyebrow: "نور / میز کار / نزدیک",
    description: "یک صحنه خلوت از آتلیه یاس؛ نور شب، ابزار طراحی و یک قطعه نقره، سه مسیر اصلی تجربه را از دل یک فضای انسانی معرفی می‌کنند.",
    note: "صمیمی‌ترین مسیر برای ساختن رابطه با طراح",
    className: "concept-room",
  },
];

export function ConceptRoute({ concept }: { concept: Concept }) {
  return (
    <article className="overflow-hidden border border-silver bg-ivory-soft">
      <div className={`concept-stage ${concept.className}`} aria-label={`پیش‌نمایش ${concept.name}`}>
        <span className="absolute right-6 top-6 text-xs tracking-[0.22em] text-ivory/60">ORNOVA / {concept.number}</span>
        <div className="concept-mark" aria-hidden="true" />
        <div className="absolute bottom-7 right-7 left-7 flex items-end justify-between gap-4">
          <p className="text-xs leading-6 text-ivory/65">طراحی دیجیتال جواهر<br />فرم اولیه برای بررسی</p>
          <span className="text-3xl font-light text-ivory/80">{concept.number}</span>
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
            <p className="text-sm text-sapphire">Design study / 2026</p>
            <p className="mt-3 text-xs leading-6 text-graphite/55">سه مسیر مستقل برای بررسی صحنه اول Ornova؛ هنوز هیچ‌کدام جایگزین Home نیست.</p>
          </div>
          <div>
            <h1 className="max-w-3xl text-4xl font-semibold leading-[1.45] text-graphite md:text-6xl">سه راه برای ورود به جهان Ornova</h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-graphite/70">هر مسیر از یک Design DNA مشترک استفاده می‌کند: نور کم، نقره، سکوت، فرم قابل ساخت و یک دعوت روشن برای نزدیک‌شدن.</p>
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
            <h2 className="mt-2 text-2xl font-semibold text-graphite">یک مسیر را انتخاب کنیم و به Home تبدیلش کنیم.</h2>
          </div>
          <Link href="/" className="inline-flex w-fit rounded-full bg-sapphire px-6 py-3 text-sm font-medium text-ivory">بازگشت به سایت فعلی</Link>
        </div>
      </section>
    </main>
  );
}
