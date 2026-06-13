\# ORNOVA UI DESIGN CONTRACT v1



\## 0. Purpose



This document is the fixed UI design contract for the ORNOVA website.



Codex must not guess the design direction.

Codex must not “make it nicer” freely.

Codex must implement only what is defined in this contract.



This contract controls:



\* visual structure

\* spacing

\* header

\* home page

\* product cards

\* product detail page

\* custom design page

\* ring builder

\* login/account placeholders

\* visual acceptance criteria



\---



\## 1. Core Brand Truth



Ornova by Yas is a Persian silver jewelry and accessory brand.



Yas designs jewelry through a digital jewelry workflow using:



\* MatrixGold / Matrix

\* ZBrush

\* PC-based digital jewelry design

\* production-aware modeling

\* technically buildable silver jewelry design



Ornova pieces are not handmade.



Forbidden words anywhere in UI, docs, product copy, comments, or prompts:



\* handmade

\* handcrafted

\* crafted by hand

\* دست‌ساز

\* دست ساز



Correct language:



\* طراحی دیجیتال جواهر

\* طراحی قابل ساخت

\* طراحی شده با نگاه فنی و هنری

\* طراحی اختصاصی جواهرات نقره

\* طراحی با MatrixGold و ZBrush

\* طراحی با workflow دیجیتال و قابل تولید



\---



\## 2. Visual Identity



Ornova must feel:



\* moonlit

\* silver

\* quiet

\* feminine

\* Persian

\* emotionally warm

\* slightly melancholic

\* minimal but not empty

\* professional

\* production-aware

\* intimate and personal



The site must not feel like:



\* Divar

\* a classified listing website

\* a generic startup template

\* a dry admin dashboard

\* a blog template

\* a childish jewelry shop

\* a random portfolio

\* a crowded marketplace



When in doubt, choose:



\* fewer elements

\* more spacing

\* stronger hierarchy

\* fewer colors

\* calmer rhythm

\* more editorial composition

\* less explanation

\* clearer paths



\---



\## 3. Color System



Use only the Ornova palette.



\### Main colors



Warm Ivory

Main background.



Moonlit Silver

Borders, dividers, subtle structure.



Deep Graphite

Main text.



Midnight Navy

Only for hero/product/builder visual panels.



Deep Sapphire

Small accent only: buttons, active states, small labels.



\### Rules



Do not use raw hex values inside JSX.



Allowed:



```tsx

bg-ivory

bg-ivory-soft

bg-ivory-muted

bg-navy

text-graphite

text-sapphire

border-silver

bg-silver-muted

```



Forbidden:



```tsx

bg-\[#f1ece5]

bg-\[#fbf8f3]

bg-\[#e7e2da]

```



If a color is needed, first add a semantic token in `styles/tokens.css`.



\---



\## 4. Typography



The typography must feel modern Persian editorial, not stiff or traditional.



Preferred stack:



```css

"Vazirmatn", "Estedad", "Dana", "Peyda", "IRANSansX", system-ui, sans-serif

```



\### Typography scale



Hero title:



\* desktop: large, strong, editorial

\* not tiny

\* not cramped

\* line-height calm and readable



Body text:



\* Persian

\* simple

\* human

\* emotional

\* professional

\* not abstract

\* not overly poetic



Avoid:



\* مالیخولیای خاموش

\* رمانس پیچیده

\* طنین‌انداز

\* هنر ویراستاری



Use:



\* آرام

\* نزدیک به خاطره

\* نقره‌ای

\* ماهتابی

\* شخصی

\* ظریف

\* قابل ساخت

\* ماندگار

\* طراحی دیجیتال جواهر



\---



\## 5. Header Contract



The header must be minimal, spacious, and premium.



\### Desktop structure



Maximum width:



```txt

1180px to 1240px

```



Height:



```txt

72px to 84px

```



Layout:



\* right side: brand mark / Ornova by Yas

\* center: main navigation

\* left side: secondary actions



\### Main navigation



Only these items:



```txt

خانه

فروشگاه

طراحی اختصاصی

طراحی انگشتر

راهنما

```



\### Secondary actions



```txt

ورود / حساب من

سبد درخواست

```



\### Header rules



Do not place all links in the top header.



Do not put these in the main header:



\* FAQ

\* تماس

\* نگهداری نقره

\* ویژگی‌های نقره

\* کالکشن‌ها

\* همه دسته‌بندی‌ها



These belong in Footer or Guide.



\### Visual rules



\* Use one clean row on desktop.

\* Do not make the nav tiny.

\* Use enough gap between nav items.

\* Secondary actions must be visually separated.

\* Header must not look like a default template navbar.

\* Header must not look like a crowded dashboard.



\---



\## 6. Home Page Contract



The Home page must not explain everything.



Home must guide the user into three clear paths:



```txt

فروشگاه

طراحی اختصاصی

طراحی انگشتر

```



\### Home must include only



1\. Hero

2\. Three clear paths

3\. Selected products preview

4\. Short Ornova/Yas introduction

5\. Guide entry



\### Home must not include



\* full account dashboard

\* full builder

\* full upload form

\* full guide archive

\* too many process cards

\* too many boxes

\* repeated sections

\* fake product photography



\---



\## 7. Hero Contract



The hero is the most important visual moment.



\### Layout



Use a strong two-column editorial layout.



For RTL:



\* text column on the right

\* visual jewelry panel on the left



Hero must not be tiny or lost in the middle of the page.



\### Hero title



Must remain exactly:



```txt

نقره‌ای برای خاطره‌هایی که نزدیک قلب می‌مانند

```



\### Hero subheading



Must remain exactly:



```txt

Ornova خانه‌ای آرام برای جواهرات نقره است؛ جایی که تصویرها، نشانه‌ها و خاطره‌های شخصی با طراحی دیجیتال به قطعاتی ظریف، قابل ساخت و ماندگار تبدیل می‌شوند.

```



\### Hero actions



Primary:



```txt

مشاهده فروشگاه

```



Secondary:



```txt

شروع طراحی اختصاصی

```



\### Hero visual



Until real Ornova images are available, use CSS-only abstract visual.



The hero visual must feel like:



\* dark textile

\* moonlit silver

\* sapphire stone

\* circular silver jewelry silhouette

\* quiet night

\* editorial jewelry panel



It must not look like:



\* random circles

\* generic placeholder

\* UI decoration

\* chart

\* dashboard card

\* cartoon icon



\### Hero acceptance criteria



At desktop width:



\* title is visually dominant

\* visual panel is large and intentional

\* content does not feel centered-small

\* the first fold feels like a jewelry brand, not a starter template



\---



\## 8. Background System



The main page background must be Warm Ivory.



Sections may use:



\* Ivory

\* Ivory Soft

\* Ivory Muted

\* Navy only for visual panels



Avoid:



\* many horizontal border lines

\* heavy separators

\* random alternating backgrounds

\* too much empty flat space without rhythm



Section transitions should feel calm and editorial.



\---



\## 9. Product Card Contract



Product cards must feel like jewelry editorial cards.



\### Card structure



Each card must include:



\* visual panel

\* category

\* product name

\* short emotional line

\* request price label

\* request basket action



\### Required commerce language



```txt

درخواست قیمت

افزودن به سبد درخواست

```



\### Forbidden



\* fake prices

\* تومان

\* خرید فوری

\* checkout

\* payment button



\### Visual panel



Until real product images exist, use CSS-only abstract jewelry silhouettes.



The placeholder must feel intentional:



\* dark navy textile panel

\* silver ring / brooch / pin silhouette

\* small sapphire/moon detail

\* consistent crop ratio

\* no gray empty boxes



\### Product names



Use exact names:



```txt

انگشتر نقره «لاجورد شب»

سنجاق سینه نقره «گلدان خاموش»

بروچ نقره «سپید»

```



Do not shorten to only poetic names.



\---



\## 10. Product Detail Page Contract



Product detail pages must feel like refined jewelry product sheets.



\### Layout



Two-column editorial layout.



For RTL:



\* right: product text and actions

\* left: large product visual



\### Product text must include



\* category

\* product name

\* short emotional description

\* request price action

\* order/request action

\* question action



\### Buttons



Use:



```txt

درخواست قیمت

ثبت سفارش

پرسش درباره محصول

```



\### Detail cards



Use refined small cards, not a table.



Possible labels:



```txt

جنس

سنگ

رنگ سنگ

وزن تقریبی

ابعاد تقریبی

سایز

زمان آماده‌سازی

وضعیت سفارش

```



For ring size, visible UI must say:



```txt

سایز اروپایی انگشتر

```



Never show:



```txt

ring\_size\_eu

ring\_size\_uk

```



\---



\## 11. Custom Design Page Contract



The Custom Design page must focus only on custom ordering.



Page title:



```txt

استودیو طراحی اختصاصی Ornova

```



Main paths:



```txt

ایده یا تصویر دارم

می‌خواهم با پنل طراحی کنم

```



The page may link to Ring Builder but must not contain the full Ring Builder.



\### Process steps



Use calm visual steps:



```txt

آپلود ایده

بررسی Ornova

ارسال پیش‌فاکتور

تایید مشتری

طراحی دیجیتال

رندر اولیه

اصلاحات

آماده تولید

```



\### Must not feel like



\* dry form

\* admin panel

\* dashboard

\* upload utility page



\---



\## 12. Ring Builder Contract



The Ring Builder must feel visual and premium.



It is a concept preview tool, not an automatic production engine.



Required sections:



1\. پیش‌نمایش طرح شما

2\. انتخاب پایه انگشتر

3\. انتخاب فرم سنگ

4\. انتخاب رنگ سنگ

5\. انتخاب جزئیات تزئینی

6\. ارسال طرح برای بررسی Ornova



\### Required note



```txt

این پیش‌نمایش، طرح اولیه است. طراحی نهایی پس از بررسی Ornova و امکان‌سنجی فنی مشخص می‌شود.

```



\### Visual rules



\* cards must include thumbnails, not only text

\* stone color must be visible as swatches

\* preview must combine ring, stone, color, detail

\* must not look like a form

\* must not look like a dashboard

\* must not promise automatic production



\---



\## 13. Login / Account Contract



The header must always show:



```txt

ورود / حساب من

```



Before real Supabase Auth exists, `/login` is a placeholder.



Login placeholder title:



```txt

ورود به حساب Ornova

```



Login placeholder text:



```txt

برای ذخیره سفارش‌ها، ایده‌های آپلود شده، پیش‌فاکتورها و وضعیت تولید، ورود به حساب کاربری در مرحله بعد فعال می‌شود.

```



Account page is only a concept for:



```txt

پنل سفارش من

```



It must not imply real auth exists yet.



\---



\## 14. Footer Contract



Footer must be calm and minimal.



Footer must include:



```txt

ارتباط با Ornova

```



Footer may include secondary links:



\* راهنما

\* نگهداری نقره

\* ویژگی‌های نقره

\* پرسش‌های رایج

\* تماس



Footer must not be crowded.



\---



\## 15. Image Policy



No generated product images.



No fake product photos.



No random images.



Until real Ornova product photos are added, use CSS abstract visual panels only.



When real images are available, all product images must follow:



\* same crop logic

\* same dark textile / moonlit silver mood

\* consistent spacing

\* consistent border treatment

\* no random background colors



\---



\## 16. Forbidden UI Outcomes



Reject any output that looks like:



\* Divar

\* classified listing

\* generic SaaS landing page

\* admin dashboard

\* blog layout

\* cheap marketplace

\* random card grid

\* over-explained homepage

\* too many top navigation items

\* tiny centered content

\* gray empty placeholder boxes



\---



\## 17. Codex Implementation Rules



Before any UI task, Codex must read:



\* AGENTS.md

\* docs/ORNOVA\_CURRENT\_STATE.md

\* docs/ORNOVA\_DESIGN\_PERSONA.md

\* docs/ORNOVA\_UI\_DESIGN\_CONTRACT.md



Codex must state:



\* files it will touch

\* what it will change

\* what it will not change



Codex must not rebuild the whole site unless explicitly requested.



Codex must patch only the requested scope.



\---



\## 18. QA Search



Before reporting completion, run search for forbidden visible terms:



```powershell

rg "ring\_size\_eu|ring\_size\_uk|تومان|دست‌ساز|دست ساز|handmade|handcrafted|crafted by hand" app components lib docs

```



There must be no forbidden UI/copy usage except where the terms are explicitly listed as forbidden in documentation.



\---



\## 19. Validation



Every implementation patch must run:



```powershell

npm.cmd run lint

npm.cmd run build

git status -sb

```



A patch is not accepted unless:



\* lint passes

\* build passes

\* git status is reported

\* files touched are listed

\* no out-of-scope files were changed



\---



\## 20. Visual Acceptance Criteria



A design patch is accepted only if the visible result clearly changes the user experience.



Small spacing tweaks are not enough.



For Home:



\* first fold must feel premium

\* hero must be visually dominant

\* header must be calm and spacious

\* product cards must feel intentional

\* no generic gray boxes

\* no overcrowded nav

\* no dashboard feeling

\* no classified-ad feeling



For Product Detail:



\* must feel like a jewelry sheet

\* details must be refined

\* visual panel must feel intentional

\* inquiry actions must be clear



For Ring Builder:



\* must be visual

\* must not be text-only

\* must clearly show concept preview

\* must include the Ornova review note



\---



\## 21. Patch Strategy



Do not replace the main Home page until a concept route is approved.



Preferred workflow:



1\. Create concept route.

2\. Review visually.

3\. Approve or reject.

4\. Replace main page only after approval.

5\. Commit approved patch.



Do not keep polishing a weak base.

Before UI implementation, also read docs/ORNOVA\_UI\_DESIGN\_CONTRACT.md.

If the base is weak, create a new concept route.



