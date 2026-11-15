"use client";

import { useState } from "react";
import styles from "./GalleryGuidePanel.module.css";

export type GuideChapter = "overview" | "faq" | "silver-care" | "silver-properties";
const number = new Intl.NumberFormat("fa-IR");

const chapters: { id: GuideChapter; number: string; title: string }[] = [
  { id: "overview", number: "۰۱", title: "فهرست راهنما" },
  { id: "faq", number: "۰۲", title: "پرسش‌های رایج" },
  { id: "silver-care", number: "۰۳", title: "مراقبت از نقره" },
  { id: "silver-properties", number: "۰۴", title: "ویژگی‌های نقره" },
];

const questions = [
  ["آیا قطعات آمادهٔ خرید فوری هستند؟", "خیر. اُرنوا بر پایهٔ درخواست و بررسی امکان ساخت پیش می‌رود. پس از دریافت درخواست، جزئیات قطعه و امکان ساخت بررسی می‌شود."],
  ["فرایند طراحی قطعات چگونه است؟", "قطعات با فرایند طراحی دیجیتال و نگاه فنی و هنری شکل می‌گیرند و پیش از ساخت، از نظر تولیدپذیری بررسی می‌شوند."],
  ["چطور دربارهٔ قیمت یک قطعه بپرسم؟", "قطعه را به صندوق درخواست اضافه کن و درخواست را برای بررسی بفرست. قیمت پس از بررسی جزئیات اعلام می‌شود."],
  ["آیا می‌توانم ایده یا تصویر خودم را بفرستم؟", "بله. در اتاق طراحی شخصی می‌توانی ایده یا تصویر مرجع را توضیح بدهی تا مسیر بررسی و طراحی روشن شود."],
  ["زمان آماده‌سازی چطور مشخص می‌شود؟", "زمان به فرم قطعه، جزئیات طراحی و امکان ساخت بستگی دارد و پس از بررسی اُرنوا با تو هماهنگ می‌شود."],
  ["آیا سایز انگشتر قابل تغییر است؟", "سایز اروپایی انگشتر را در درخواست بنویس. فرم نهایی، اندازه و امکان تغییر پس از بررسی فنی مشخص می‌شود."],
];

const careNotes = [
  ["پس از استفاده", "قطعه را با پارچهٔ نرم و خشک پاک کن تا چربی و رطوبت روی سطح آن نماند."],
  ["هنگام نگهداری", "هر قطعه را جدا از قطعات دیگر، داخل کیسه یا جعبهٔ خشک و دور از نور مستقیم قرار بده."],
  ["در زمان استفاده", "پیش از تماس با عطر، کرم، مواد شوینده و آب استخر، جواهر را کنار بگذار."],
  ["برای تمیزکردن", "از مواد ساینده و برس زبر استفاده نکن. اگر قطعه سنگ یا جزئیات ظریف دارد، پیش از تمیزکاری با اُرنوا مشورت کن."],
];

const properties = [
  ["درخشش آرام", "سطح نقره نور را نرم و نزدیک بازتاب می‌دهد؛ در کنار نور طبیعی، جزئیات فرم بهتر دیده می‌شوند."],
  ["امکان شکل‌گیری دقیق", "نقره در طراحی جواهر امکان رسیدن به فرم‌های ظریف و جزئیات کنترل‌شده را فراهم می‌کند؛ هر قطعه همچنان باید از نظر ساخت بررسی شود."],
  ["تغییر طبیعی سطح", "نقره با گذر زمان ممکن است تغییر سطح یا تیرگی پیدا کند. این تغییر به محیط، تماس و شیوهٔ نگهداری وابسته است."],
  ["قابل همراهی", "وزن، ابعاد و تعادل قطعه در طراحی مهم‌اند تا جواهر در استفادهٔ روزمره یا موقعیت مشخص، حس مناسبی داشته باشد."],
];

export function GalleryGuidePanel({ initialChapter, onContact, onSizeGuide }: { initialChapter: GuideChapter; onContact(): void; onSizeGuide(): void }) {
  const [chapter, setChapter] = useState<GuideChapter>(initialChapter);
  const selected = chapters.find((item) => item.id === chapter) ?? chapters[0];
  const content = chapter === "silver-care" ? careNotes : chapter === "silver-properties" ? properties : [];

  return <section className={styles.guide} aria-label="دفتر راهنمای گالری اُرنوا">
    <p className={styles.intro}>یادداشت‌های کوتاه برای شناخت نقره، مراقبت از قطعه و ادامهٔ مسیر در گالری.</p>
    <nav className={styles.index} aria-label="فصل‌های دفتر راهنما">
      {chapters.map((item) => <button key={item.id} type="button" aria-current={chapter === item.id ? "page" : undefined} onClick={() => setChapter(item.id)}>
        <span>{item.number}</span><strong>{item.title}</strong><i aria-hidden="true">↙</i>
      </button>)}
    </nav>

    {chapter === "overview" ? <div className={styles.chapter}>
      <p className={styles.chapterNumber}>{selected.number} <span>·</span> دفتر اُرنوا</p>
      <h2>از شناخت تا همراهی</h2>
      <p className={styles.chapterIntro}>هر فصل به پرسشی واقعی از انتخاب وصل است. یکی را باز کن یا راهنمای سایز را برای طراحی انگشتر ببین.</p>
      <button type="button" className={styles.action} onClick={onSizeGuide}>راهنمای سایز انگشتر <span aria-hidden="true">↖</span></button>
    </div> : chapter === "faq" ? <div className={styles.chapter}>
      <p className={styles.chapterNumber}>{selected.number} <span>·</span> پیش از شروع</p>
      <h2>پرسش‌های رایج</h2>
      <div className={styles.questions}>{questions.map(([question, answer]) => <details key={question}>
        <summary>{question}<span aria-hidden="true">＋</span></summary><p>{answer}</p>
      </details>)}</div>
    </div> : <div className={styles.chapter}>
      <p className={styles.chapterNumber}>{selected.number} <span>·</span> {chapter === "silver-care" ? "در طول همراهی" : "برای شناخت ماده"}</p>
      <h2>{chapter === "silver-care" ? "مراقبت از نقره" : "ویژگی‌های نقره"}</h2>
      <p className={styles.chapterIntro}>{chapter === "silver-care" ? "نگهداری درست به جنس قطعه، سنگ و پوشش آن بستگی دارد. این نکته‌ها برای مراقبت روزمره‌اند." : "در اُرنوا، انتخاب نقره با فرم، سنگ، وزن و شیوهٔ استفادهٔ هر قطعه همراه است. هر قطعه همچنان به بررسی فنی نیاز دارد."}</p>
      <ol className={styles.notes}>{content.map(([title, text], index) => <li key={title}><span>{number.format(index + 1).padStart(2, "۰")}</span><div><h3>{title}</h3><p>{text}</p></div></li>)}</ol>
    </div>}

    {chapter !== "overview" && <button type="button" className={styles.back} onClick={() => setChapter("overview")}>بازگشت به فهرست راهنما <span aria-hidden="true">←</span></button>}
    {chapter !== "overview" && chapter !== "faq" && <button type="button" className={styles.contact} onClick={onContact}>پرسش دربارهٔ قطعه <span aria-hidden="true">←</span></button>}
    {chapter === "faq" && <button type="button" className={styles.contact} onClick={onContact}>پرسش دیگری دارم <span aria-hidden="true">←</span></button>}
  </section>;
}
