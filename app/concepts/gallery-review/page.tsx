import Image from "next/image";
import Link from "next/link";
import { OrnovaBrandMark } from "@/components/ornova/OrnovaBrandMark";
import styles from "./GalleryReview.module.css";

export const metadata = {
  title: "بازبینی گالری | Ornova by Yas",
  description: "مقایسه‌ی قاب فعلی گالری اُرنوا با چند پیشنهاد مفهومی برای نور، ویترین‌ها و چیدمان.",
  robots: { index: false, follow: false },
};

export default function GalleryReviewPage() {
  return (
    <main className={styles.page} dir="rtl">
      <header className={styles.heading}>
        <Link href="/" className={styles.returnLink}>بازگشت به گالری <span aria-hidden="true">↖</span></Link>
        <a href="#stand-form-title" className={styles.reviewAnchor}>رفتن مستقیم به مقایسه‌ی فرم استندها <span aria-hidden="true">↓</span></a>
        <h1>بازبینی قاب گالری</h1>
        <p>قاب فعلی و چند پیشنهاد مفهومی را کنار هم ببین؛ هیچ‌کدام عکس واقعی فضا یا اندازه‌ی قطعی استندها نیستند.</p>
      </header>

      <div className={styles.comparison}>
        <figure className={`${styles.figure} ${styles.featuredFigure}`}>
          <div className={`${styles.imageFrame} ${styles.conceptImageFrame}`}>
            <Image
              src="/images/ornova/gallery/review/entry-ornova-blue-benches-v15.webp"
              alt="پیش‌نمایش سالن با حروف کاهگلی ORNOVA، درِ قوسی شش‌ضلعی، میز شیشه‌ای در وسط فرش لاکی با دو نیمکت پارچه‌ای آبی افغانی در دو طرف، و ویترین چوبی شش‌طبقه"
              fill
              sizes="(max-width: 760px) 100vw, 94vw"
              priority
            />
            <div className={styles.conceptPlaque}><OrnovaBrandMark className={styles.brandMark} /></div>
            <Link href="/?galleryPanel=account" className={styles.conceptDoor} aria-label="ورود به اتاق طراحی و حساب کاربری"><span>welcome</span></Link>
          </div>
          <figcaption>
            <h2>سالن بازبینی · دو نیمکت آبی کنار میز</h2>
            <p>میز نمایش تک‌محصول در وسط فرش لاکی قرار دارد و دو نیمکت کم‌ارتفاع با فرم عکس مرجع، نشیمن آبی افغانی و پایه‌های چوبی در دو سوی آن هستند. طاق سمت چپ حذف شده؛ ارکیده‌های کوچک سفید و زرد کنار دیوار ساده قرار دارند. حروف کاهگلی ORNOVA، درِ شش‌ضلعیِ کارگاه روشن، تلفن و صندوق روی پیشخوان جلو حفظ شده‌اند.</p>
            <p>شش طبقهٔ چوب و شیشه برای استندهای آبی و عکس‌های اصلی آثار خالی گذاشته شده‌اند. نور طبقات از نور عمومی سالن برجسته‌تر است؛ کتاب فهرست زیر ویترین قرار دارد. نشان بالای در و نوشتهٔ دست‌نویس «welcome» روی کارت با کد سایت قرار گرفته‌اند تا خوانا بمانند.</p>
            <p className={styles.notice}>این قاب تصویر مفهومیِ فضاست. جای‌گذاری استندها، گردش محصولات، نمای میز و خرید در گالری اصلی هنوز در دست پیاده‌سازی و آزمون‌اند.</p>
            <Link href="/concepts/gallery-interactive" className={styles.interactiveLink}>آزمایش ویترین و نمایش محصول روی میز ←</Link>
          </figcaption>
        </figure>
        <figure className={`${styles.figure} ${styles.featuredFigure}`}>
          <div className={styles.imageFrame}>
            <Image
              src="/images/ornova/gallery/review/entry-gallery-soft-ivory-distinct-stands-v6.png"
              alt="قاب مفهومی ورودی ثابت گالری با چهار استند آبیِ خالی و متفاوت، نور عاجی گرم، فرش گرد ایرانی، اتاق طراحی و میز کوچک"
              fill
              sizes="(max-width: 760px) 100vw, 94vw"
              priority
            />
            <div className={styles.wallBrand}><OrnovaBrandMark className={styles.brandMark} /></div>
            <div className={styles.labels} aria-hidden="true">
              <span>RINGS</span><span>BROOCHES</span><span>HALF SET</span><span>CHARMS</span>
            </div>
            <div className={styles.productPlacements} aria-hidden="true">
              <span className={styles.ringPlacement}><Image src="/images/ornova/gallery/review/product-lajvard-shab-ring-cutout-review.png" alt="" fill sizes="140px" /></span>
              <span className={styles.broochPlacement}><Image src="/images/ornova/gallery/review/product-04-brooch-cutout-review.png" alt="" fill sizes="140px" /></span>
              <span className={styles.halfSetPlacement}><Image src="/images/ornova/gallery/review/product-12-half-set-cutout-review.png" alt="" fill sizes="140px" /></span>
              <span className={styles.pendantPlacement}><Image src="/images/ornova/gallery/review/product-15-fibonacci-pendant-cutout-review.png" alt="" fill sizes="140px" /></span>
            </div>
          </div>
          <figcaption>
            <h2>پیشنهاد تازه · چهار نامزد محصول روی استند</h2>
            <p>نمای ورودی ثابت با نور عاجیِ ملایم، فرش گرد قرمز، ارکیده در پاسیو و میز کوچک. بج #۰۴، نیم‌ست #۱۲، آویز فیبوناچی #۱۵ و انگشتر «لاجورد شب» روی استندهای دسته‌ی خود قرار گرفته‌اند.</p>
            <p className={styles.notice}>پیکسل‌های محصول بازطراحی نشده‌اند؛ ته‌رنگ گرم #۱۵ از نور عکس مرجع است و اصلاح نشده. برش انگشتر کوچک است و ماسکش هنوز نیاز به تأیید لبه‌ها دارد. این ترکیب وبی روی تصویرسازیِ گالری است، نه عکس فضای واقعی؛ مقیاس و روش نصب ثابت نشده و فرم استند برای ساخت تأیید نیست.</p>
          </figcaption>
        </figure>

        <figure className={`${styles.figure} ${styles.featuredFigure}`}>
          <div className={styles.imageFrame}>
            <Image
              src="/images/ornova/gallery/review/entry-owner-preferred-varied-niches-empty-stands-candidate-v1.png"
              alt="تصویر مفهومی ورودی گالری با نور گرم عاجی، چهار طاقچهٔ متفاوت و استندهای آبی خالی، فرش گرد قرمز، میز کوچک و ارکیده در پاسیو"
              fill
              sizes="(max-width: 760px) 100vw, 94vw"
            />
            <div className={styles.wallBrand}><OrnovaBrandMark className={styles.brandMark} /></div>
          </div>
          <figcaption>
            <h2>نامزد تازهٔ ورودی · استندهای متمایز و خالی</h2>
            <p>چهار فرم طاقچه با پایه‌های آبی جداگانه، اتاق طراحی در مرکز، فرش گرد ایرانی، میز کوچک با تلفن و صندوق مکانیکی، و ارکیده در پاسیو.</p>
            <p className={styles.notice}>این تصویر فقط برای بازبینی ترکیب فضاست؛ عکس واقعی گالری یا محصول نیست. استندها هنوز اندازه‌گیری و تأیید نشده‌اند و هیچ نقشه یا روش ساختی از آن برداشت نمی‌شود.</p>
          </figcaption>
        </figure>

        <figure className={styles.figure}>
          <div className={styles.imageFrame}>
            <Image
              src="/images/ornova/gallery/ornova-gallery-entry-four-deep-niches-v2.webp"
              alt="قاب فعلی ورودی گالری اُرنوا با چهار ویترین دسته‌بندی‌شده و اتاق طراحی در مرکز"
              fill
              sizes="(max-width: 760px) 100vw, (max-width: 1100px) 50vw, 33vw"
              priority
            />
            <div className={styles.wallBrand}><OrnovaBrandMark className={styles.brandMark} /></div>
            <div className={styles.labels} aria-hidden="true">
              <span>RINGS</span><span>BROOCHES</span><span>HALF SET</span><span>CHARMS</span>
            </div>
          </div>
          <figcaption>
            <h2>قاب فعلی</h2>
            <p>نور کهربایی‌تر و استندهای پایه‌دارِ یک‌شکل.</p>
          </figcaption>
        </figure>

        <figure className={styles.figure}>
          <div className={styles.imageFrame}>
            <Image
              src="/images/ornova/gallery/review/entry-wall-no-plaque-ivory-candle-v3.webp"
              alt="پیشنهاد مفهومی گالری با نور عاجی گرم، چهار استند متفاوت، شمع روشن و فرش گرد قرمز"
              fill
              sizes="(max-width: 760px) 100vw, 50vw"
            />
            <div className={styles.wallBrand}><OrnovaBrandMark className={styles.brandMark} /></div>
            <div className={styles.labels} aria-hidden="true">
              <span>RINGS</span><span>BROOCHES</span><span>HALF SET</span><span>CHARMS</span>
            </div>
          </div>
          <figcaption>
            <h2>پیشنهاد بازنگری‌شده</h2>
            <p>نور عاجی گرم‌تر، نشان روی گچِ دیوار، استندهای متمایز و میز چوبی کوچک.</p>
            <p className={styles.notice}>تصویر مفهومی است؛ شکل زیورها و نسبت فیزیکی آن‌ها با استند تأیید نشده و عکس محصول واقعی محسوب نمی‌شود.</p>
          </figcaption>
        </figure>

        <figure className={styles.figure}>
          <div className={styles.imageFrame}>
            <Image
              src="/images/ornova/gallery/review/entry-ivory-empty-stands-review-v4.webp"
              alt="قاب مفهومی ورودی گالری با چهار طاقچه‌ی فرورفته، استندهای آبی خالی، اتاق طراحی، فرش قرمز و ارکیده‌ی پاسیو"
              fill
              sizes="(max-width: 760px) 100vw, (max-width: 1100px) 50vw, 33vw"
            />
            <div className={styles.wallBrand}><OrnovaBrandMark className={styles.brandMark} /></div>
            <div className={styles.labels} aria-hidden="true">
              <span>RINGS</span><span>BROOCHES</span><span>HALF SET</span><span>CHARMS</span>
            </div>
          </div>
          <figcaption>
            <h2>پیشنهاد با استندهای خالی</h2>
            <p>نور عاجیِ گرم‌تر، دیوار یکدست برای نشان واقعی، و حذف زیورهای تصویرسازی‌شده تا محصول معتبر جداگانه روی استند قرار بگیرد.</p>
            <p className={styles.notice}>این قاب همچنان تصویرسازی است. فرم استند نیم‌ست، تناسب اندازه‌ها و چیدمان نهایی نیاز به بازبینی دارد؛ مقیاس واقعی را ثابت نمی‌کند.</p>
          </figcaption>
        </figure>

        <figure className={styles.figure}>
          <div className={styles.imageFrame}>
            <Image
              src="/images/ornova/gallery/review/entry-table-props-review-v2-desktop.webp"
              alt="پیش‌نمایش میز گالری با تلفن آنتیک، مجله‌ی بسته و صندوق مکانیکی قدیمی"
              fill
              sizes="(max-width: 760px) 100vw, (max-width: 1100px) 50vw, 33vw"
            />
          </div>
          <figcaption>
            <h2>پیش‌نمایش تلفن، مجله و صندوق قدیمی</h2>
            <p>صندوق مکانیکی حساب‌وکتاب، مجله‌ی بسته و تلفن آنتیک در هر دو قاب روی میز قرار گرفته‌اند. تصویر برای بازبینی ترکیب‌بندی است؛ دوربین و ویترین‌ها تغییر نکرده‌اند.</p>
            <p className={styles.notice}>این چیدمان از تصویرسازی مفهومی ساخته شده و عکس فضای واقعی نیست.</p>
          </figcaption>
        </figure>

        <figure className={styles.figure}>
          <div className={styles.imageFrame}>
            <Image
              src="/images/ornova/gallery/review/entry-table-cashier-concept-v5.png"
              alt="طرح مفهومی گالری با نور عاجی، چهار طاقچه‌ی آبی، فرش قرمز گرد، ارکیده و میز دارای مجله‌ی بسته، تلفن آنتیک، صندوق مکانیکی و شمع روشن"
              fill
              sizes="(max-width: 760px) 100vw, (max-width: 1100px) 50vw, 33vw"
            />
            <div className={styles.wallBrand}><OrnovaBrandMark className={styles.brandMark} /></div>
            <div className={styles.labels} aria-hidden="true">
              <span>RINGS</span><span>BROOCHES</span><span>HALF SET</span><span>CHARMS</span>
            </div>
          </div>
          <figcaption>
            <h2>ترکیب یکپارچه با صندوق مکانیکی</h2>
            <p>پیشنهاد نور عاجیِ گرم با چهار طاقچه‌ی متمایز و سه وسیله‌ی کاربردی روی میز: مجله‌ی بسته، تلفن آنتیک و صندوق حساب‌وکتاب؛ شمع روشن نیز در قاب حفظ شده است.</p>
            <p className={styles.notice}>این تصویر فقط طرح مفهومی برای بازبینی نور و ترکیب‌بندی است. زیورها، استندها و صندوق عکس یا مشخصات تأییدشده‌ی محصول واقعی نیستند و مقیاس فیزیکی را نشان نمی‌دهند.</p>
          </figcaption>
        </figure>
      </div>

      <section className={styles.cameraViews} aria-labelledby="varied-camera-title">
        <header className={styles.cameraHeading}>
          <p className={styles.studyKicker}>بازبینی زاویه و قاب موبایل</p>
          <h2 id="varied-camera-title">یک گالری، دو نقطهٔ دید</h2>
          <p>هر چهار قاب از یک فضای مفهومی‌اند. نمای ورودی و زاویهٔ دوم در دسکتاپ و موبایل کنار هم آمده‌اند تا پیوستگی اتاق و جای ویترین‌ها سنجیده شود.</p>
        </header>
        <div className={styles.cameraGrid}>
          <figure className={styles.cameraFigure}>
            <div className={`${styles.imageFrame} ${styles.cameraWideFrame}`}>
              <Image src="/images/ornova/gallery/review/entry-varied-niches-desktop-candidate-v1.webp" alt="نامزد نمای ورودی دسکتاپ با چهار طاقچهٔ متفاوت، اتاق طراحی مرکزی و فرش گرد قرمز" fill sizes="(max-width: 760px) 100vw, 50vw" />
              <div className={`${styles.wallBrand} ${styles.cameraBrand}`}><OrnovaBrandMark className={styles.brandMark} /></div>
            </div>
            <figcaption><h3>ورودی · دسکتاپ</h3><p>قاب اصلی با چهار طاقچهٔ ناهم‌شکل.</p></figcaption>
          </figure>
          <figure className={styles.cameraFigure}>
            <div className={`${styles.imageFrame} ${styles.cameraWideFrame}`}>
              <Image src="/images/ornova/gallery/review/entry-varied-niches-second-view-desktop-candidate-v1.webp" alt="نامزد زاویهٔ دوم دسکتاپ از همان گالری و همان چهار طاقچه" fill sizes="(max-width: 760px) 100vw, 50vw" />
              <div className={`${styles.wallBrand} ${styles.cameraBrand}`}><OrnovaBrandMark className={styles.brandMark} /></div>
            </div>
            <figcaption><h3>زاویهٔ دوم · دسکتاپ</h3><p>دید مایل از همان اتاق، با میز و ویترین‌ها در یک قاب.</p></figcaption>
          </figure>
          <figure className={styles.cameraFigure}>
            <div className={`${styles.imageFrame} ${styles.cameraPortraitFrame}`}>
              <Image src="/images/ornova/gallery/review/entry-varied-niches-mobile-candidate-v1.webp" alt="نامزد قاب موبایل از ورودی گالری با چهار طاقچهٔ متفاوت و میز مرکزی" fill sizes="(max-width: 760px) 100vw, 28vw" />
              <div className={`${styles.wallBrand} ${styles.cameraBrand} ${styles.cameraBrandMobile}`}><OrnovaBrandMark className={styles.brandMark} /></div>
            </div>
            <figcaption><h3>ورودی · موبایل</h3><p>چهار طاقچه، اتاق طراحی، میز و بخش بزرگی از فرش در قاب.</p></figcaption>
          </figure>
          <figure className={styles.cameraFigure}>
            <div className={`${styles.imageFrame} ${styles.cameraPortraitFrame}`}>
              <Image src="/images/ornova/gallery/review/entry-varied-niches-second-view-mobile-candidate-v1.webp" alt="نامزد قاب موبایل از زاویهٔ دوم همان گالری" fill sizes="(max-width: 760px) 100vw, 28vw" />
              <div className={`${styles.wallBrand} ${styles.cameraBrand} ${styles.cameraBrandMobile}`}><OrnovaBrandMark className={styles.brandMark} /></div>
            </div>
            <figcaption><h3>زاویهٔ دوم · موبایل</h3><p>همان هویت فضا با دید مایل و قاب عمودی.</p></figcaption>
          </figure>
        </div>
        <p className={styles.standFormNotice}>این چهار تصویر نامزدهای بازبینی‌اند و هنوز به گالری اصلی وصل نشده‌اند. محصول واقعی داخل آن‌ها نیست. پیش از جایگزینی، مختصات هر ویترین، تصویرِ محصول روی استند، نقطهٔ فوکوس و عملکرد کلیک در هر دو اندازهٔ صفحه باید بررسی شود؛ این تصاویر نقشهٔ ساخت استند نیستند.</p>
      </section>

      <section className={styles.standStudy} aria-labelledby="half-set-study-title">
        <div className={styles.studyCopy}>
          <p className={styles.studyKicker}>مطالعه‌ی نزدیک · فقط برای بازبینی</p>
          <h2 id="half-set-study-title">استند اختصاصی نیم‌ست #۱۲</h2>
          <p>برش تأییدشده‌ی خودِ نیم‌ست روی یک تکیه‌گاه عمودیِ آبی آمده تا فرم استند با پایه‌ی ساده‌ی چارم یکی نباشد. خود قطعه در این ترکیب بازطراحی نشده است.</p>
          <p className={styles.notice}>این ماکت، عکس فضای واقعی یا نقشه‌ی ساخت نیست. اندازه‌ی فیزیکیِ محصول و استند، زاویه‌ی نصب و تناسب نهایی هنوز اندازه‌گیری و تأیید نشده‌اند.</p>
        </div>
        <figure className={styles.studyFigure}>
          <div className={styles.studyImage}>
            <Image
              src="/images/ornova/gallery/review/half-set-12-stand-detail-study-v2.webp"
              alt="مطالعه‌ی مفهومی نزدیک از نیم‌ست شماره ۱۲ روی تکیه‌گاه عمودی آبی افغان"
              fill
              sizes="(max-width: 760px) 100vw, 50vw"
            />
          </div>
          <figcaption>برش اصلی #۱۲ برای بازبینی چیدمان روی استند.</figcaption>
        </figure>
      </section>

      <section className={styles.standStudy} aria-labelledby="brooch-study-title">
        <div className={styles.studyCopy}>
          <p className={styles.studyKicker}>مطالعه‌ی نزدیک · فقط برای بازبینی</p>
          <h2 id="brooch-study-title">استند بج سینه #۰۴</h2>
          <p>خود بج از عکس مرجع #۰۴ جدا شده و بدون بازطراحی روی یک پایه‌ی مفهومیِ آبی قرار گرفته است. فرم پایه با تکیه‌گاه مستقل و سنگ نامنظم، مخصوص نمایش یک بج است.</p>
          <p className={styles.notice}>پایه تصویرسازی شده و اندازه‌ی بج یا استند از این ترکیب قابل استنتاج نیست. این تصویر برای کاتالوگ، فروش یا دستور ساخت تأیید نشده است.</p>
        </div>
        <figure className={styles.studyFigure}>
          <div className={styles.studyImage}>
            <Image
              src="/images/ornova/gallery/review/brooch-04-stand-detail-study-v1.webp"
              alt="مطالعه‌ی مفهومی از بج سینه‌ی عکس شماره ۰۴ روی یک استند آبی افغان با پایه‌ی سنگی نامنظم"
              fill
              sizes="(max-width: 760px) 100vw, 50vw"
            />
          </div>
          <figcaption>برش محصول #۰۴ روی پایه‌ی بازبینی؛ مقیاس فیزیکی اندازه‌گیری نشده است.</figcaption>
        </figure>
      </section>

      <section className={styles.standFormReview} aria-labelledby="stand-form-title">
        <header className={styles.standFormHeading}>
          <p className={styles.studyKicker}>تصمیم باز · پیش از طراحی جزئیات</p>
          <h2 id="stand-form-title">مقایسه‌ی فرم استندها</h2>
          <p>هر برگه چهار فرم متفاوت برای نمایش زیور را کنار هم می‌گذارد. هنوز هیچ فرم به دسته‌ای نسبت داده نشده و سنگ‌ها فقط عنصر تصویریِ مطالعه‌اند.</p>
        </header>
        <div className={styles.standFormGrid}>
          <figure className={styles.standFormFigure}>
            <div className={styles.standFormImage}>
              <Image
                src="/images/ornova/gallery/review/stand-form-study-v1.png"
                alt="برگه‌ی مفهومی نسخه‌ی یک با چهار فرم متفاوت استند آبی در طاقچه‌های عاجی"
                fill
                sizes="(max-width: 760px) 100vw, 50vw"
              />
            </div>
            <figcaption>
              <h3>نسخه‌ی یک</h3>
              <p>فرم‌های کوتاه و پایه‌دار، تکیه‌گاه عمودی، قلاب آویز و تکیه‌گاه افقی.</p>
            </figcaption>
          </figure>
          <figure className={styles.standFormFigure}>
            <div className={styles.standFormImage}>
              <Image
                src="/images/ornova/gallery/review/stand-form-study-v2.png"
                alt="برگه‌ی مفهومی نسخه‌ی دو با چهار فرم متفاوت استند آبی در طاقچه‌های عاجی"
                fill
                sizes="(max-width: 760px) 100vw, 50vw"
              />
            </div>
            <figcaption>
              <h3>نسخه‌ی دو</h3>
              <p>فرم‌های مخروطی، تکیه‌گاه زاویه‌دار، قوس آویز و پایه‌ی افقی برای مقایسه‌ی سیلوئت‌ها.</p>
            </figcaption>
          </figure>
        </div>
        <p className={styles.standFormNotice}>این‌ها طرح‌های مفهومی‌اند؛ دسته‌بندی نهایی، جنس، ابعاد، روش اتصال و مقیاس فیزیکی باید جداگانه بازبینی و اندازه‌گیری شوند. هنوز نقشه یا راهنمای ساخت نیستند.</p>
      </section>
    </main>
  );
}
