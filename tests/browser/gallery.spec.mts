import { expect, test, type Locator, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { galleryOrderHistory, galleryStaffCatalog, galleryStaffCookie, galleryTestCookie } from "./gallery-fixture.mjs";

const tray = (page: Page) => page.getByRole("group", { name: "سینی مخمل آبی افغانی", exact: true });
const drawer = (page: Page) => page.getByRole("dialog");
const magazine = (page: Page) => page.getByRole("link", { name: "باز کردن کتاب فهرست همهٔ آثار" });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("ornova.gallery.guide.v1", "5"));
});

for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 740, height: 400 }, { width: 1440, height: 900 }]) {
  test(`the personal ledger fills a ${viewport.width}px viewport`, async ({ page, context }) => {
    await page.setViewportSize(viewport);
    await context.addCookies([galleryTestCookie()]);
    await page.goto("/?galleryPanel=studio");
    const cover = page.getByRole("button", { name: "دفتر شخصی اُرنوا", exact: true });
    await expect(cover).toBeInViewport({ ratio: 1 });
    expect((await cover.boundingBox())?.width).toBeGreaterThan(Math.min(viewport.width * .62, viewport.height * .45, 250));
    if (viewport.width === 390) await expect(page).toHaveScreenshot("ledger-cover.png");
    await cover.click();
    const paper = page.locator('[data-personal-ledger="open"]');
    const leaves = page.getByRole("navigation", { name: "برگ‌های دفتر مشتری" });
    await expect(leaves).toBeVisible();
    const bounds = await paper.boundingBox();
    expect(bounds?.x).toBe(0);
    expect(bounds?.width).toBe(viewport.width);
    expect((bounds?.y ?? 0) + (bounds?.height ?? 0)).toBeGreaterThanOrEqual(viewport.height - 1);
    await expect(drawer(page)).toHaveCSS("backdrop-filter", /blur\(/);
    if (viewport.width === 390) await expect(page).toHaveScreenshot("ledger-open.png");
    await leaves.getByRole("button", { name: "سفارش‌های من" }).click();
    await expect(page.getByRole("heading", { name: "درخواست‌های من" })).toBeVisible();
    await page.getByRole("button", { name: "بستن دفتر" }).click();
    await expect(cover).toBeVisible();
  });
}

test("a guest can open the ledger cover and is asked to sign in", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?galleryPanel=studio");
  await page.getByRole("button", { name: "دفتر شخصی اُرنوا", exact: true }).click();
  await expect(page.locator('input[autocomplete="email"]')).toBeVisible();
  await expect(page.getByRole("navigation", { name: "برگ‌های دفتر مشتری" })).toHaveCount(0);
});

test("mobile order summaries load on demand and keep an open conversation on quote return", async ({ page, context }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await context.addCookies([galleryTestCookie()]);
  let reads = 0;
  const messages: string[] = [];
  await page.route("**/api/account/inquiries", async (route) => {
    reads++;
    if (reads === 1) await route.fulfill({ status: 503, json: { error: "Fixture read failure" } });
    else await route.fulfill({ json: galleryOrderHistory });
  });
  await page.route("**/api/inquiries/*/messages", async (route) => {
    messages.push(route.request().url());
    await route.fulfill({ json: { events: [], messages: [] } });
  });
  await page.goto("/?galleryPanel=studio");
  await page.getByRole("button", { name: "دفتر شخصی اُرنوا", exact: true }).click();
  await expect(page.getByRole("heading", { name: "مشخصات من", exact: true })).toBeVisible();
  expect(reads).toBe(0);
  const leaves = page.getByRole("navigation", { name: "برگ‌های دفتر مشتری" });
  await leaves.getByRole("button", { name: "سفارش‌های من", exact: true }).click();
  await page.getByRole("button", { name: "تلاش دوباره", exact: true }).click();
  const first = page.locator("details > summary").filter({ hasText: "انگشتر نقره «لاجورد شب»" });
  await expect(first).toBeVisible();
  await expect(first).toContainText("پیشنهاد قیمت");
  await expect(page.locator("details > summary").filter({ hasText: "آویز نقره با طرح اختصاصی" })).toBeVisible();
  await expect(page.getByRole("region", { name: "گفت‌وگو و روند درخواست" })).toHaveCount(0);
  expect(messages).toHaveLength(0);
  await first.click();
  const draft = page.getByRole("textbox", { name: "پیام تازه درباره‌ی این درخواست" });
  await draft.fill("پرسش تمرینی دربارهٔ سفارش");
  await expect.poll(() => messages.length).toBe(1);
  expect(messages[0]).toContain(galleryOrderHistory.inquiries[0].id);
  const print = page.getByRole("button", { name: /بازکردن برگهٔ چاپ/ });
  await print.click();
  await expect(page.getByRole("heading", { name: "پیشنهاد قیمت", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "بازگشت به سوابق حساب", exact: true }).click();
  await expect(print).toBeFocused();
  await expect(draft).toHaveValue("پرسش تمرینی دربارهٔ سفارش");
  await first.click();
  await expect(draft).toBeHidden();
  await leaves.getByRole("button", { name: "ایده و سفارش اختصاصی", exact: true }).click();
  await expect(page.getByRole("heading", { name: "ایده و سفارش اختصاصی", exact: true })).toBeVisible();
  await leaves.getByRole("button", { name: "سفارش‌های من", exact: true }).click();
  await first.click();
  await expect(draft).toHaveValue("پرسش تمرینی دربارهٔ سفارش");
  expect(reads).toBe(2);
  expect(messages).toHaveLength(1);
});

test("an archive order uses the full-screen checkout ledger", async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await context.addCookies([galleryTestCookie()]);
  await page.goto("/?galleryPanel=account&complete=1&archive=05");
  await expect(drawer(page).getByRole("heading", { name: "دفتر شخصی اُرنوا" })).toBeVisible();
  const review = drawer(page).getByRole("button", { name: /بازبینی و ثبت سفارش/ });
  await expect(review).toBeVisible();
  const bounds = await drawer(page).locator("aside").boundingBox();
  expect(bounds).toEqual({ x: 0, y: 0, width: 390, height: 844 });
  await review.click();
  await expect(drawer(page).getByRole("heading", { name: "انگشتر با نگین اشکی" })).toBeVisible();
});

test("magazine filters preserve the exact work and its focus on return", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await magazine(page).click();
  const search = drawer(page).getByRole("searchbox", { name: "نام اثر" });
  const category = drawer(page).getByRole("combobox", { name: "دسته", exact: true });
  const collection = drawer(page).getByRole("combobox", { name: "مجموعه", exact: true });
  const result = drawer(page).getByRole("link", { name: "نمایش انگشتر با نگین اشکی روی سینی", exact: true });
  await search.fill("اشكي");
  await category.selectOption("rings");
  await expect(result).toBeVisible();
  await result.click();
  await expect(tray(page).locator('[data-gallery-product-number="05"]')).toBeVisible();
  await page.getByRole("button", { name: /بازگشت به نتایج/ }).click();
  await expect(result).toBeFocused();
  await expect(search).toHaveValue("اشكي");
  await collection.selectOption("birth-months");
  await expect(drawer(page).getByText("اثری با این جست‌وجو پیدا نشد.")).toBeVisible();
  await drawer(page).getByRole("button", { name: "پاک‌کردن فیلترها" }).click();
  await expect(search).toBeFocused();
  await category.selectOption("pendants");
  await collection.selectOption("fibonacci-birth-month");
  await expect(drawer(page).getByRole("list", { name: "نتیجهٔ جست‌وجوی آثار" }).getByRole("listitem").first()).toBeVisible();
  await expect(page).toHaveScreenshot("magazine-filtered.png");
});

test("magazine chapters show the same cutouts as the tray and retain the selected month", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await magazine(page).click();
  await drawer(page).getByRole("link", { name: "انگشتر", exact: true }).click();
  await expect(page).toHaveURL(/galleryPanel=magazine&category=rings$/);
  const rings = drawer(page).getByRole("region", { name: "انگشتر", exact: true });
  const lapis = rings.getByRole("link", { name: /نمایش انگشتر نقره «لاجورد شب» روی سینی/ });
  const horizontal = /lajvard-shab-tray-horizontal-v2\.webp$/;
  await expect(rings.locator("header img")).toHaveAttribute("src", horizontal);
  await expect(lapis.locator("img")).toHaveAttribute("src", horizontal);
  await lapis.click();
  await expect(tray(page).locator("[data-table-product] img")).toHaveAttribute("src", horizontal);
  await page.getByRole("button", { name: /بازگشت به صفحهٔ مجله/ }).click();
  await expect(lapis).toBeFocused();
  await expect(page).toHaveURL(/galleryPanel=magazine&category=rings$/);
  await drawer(page).getByRole("link", { name: /بازگشت به فهرست/ }).click();
  await drawer(page).getByRole("link", { name: "ماه‌های تولد", exact: true }).click();
  await expect(page).toHaveURL(/galleryPanel=magazine&collection=birth-months$/);
  await page.reload();

  const leaf = drawer(page).getByRole("region", { name: "ماه‌های تولد", exact: true });
  const picker = leaf.getByRole("group", { name: "انتخاب ماه تولد" });
  const monthLinks = await picker.getByRole("link").all();
  expect(monthLinks).toHaveLength(12);
  const photos = new Set<string>();
  let pending = 0;
  for (const month of monthLinks) {
    await month.click();
    const cutouts = await leaf.locator("[data-collection-photo] img").all();
    for (const cutout of cutouts) {
      const source = await cutout.evaluate(async (img: HTMLImageElement) => { await img.decode(); return img.getAttribute("src")!; });
      expect(source).toMatch(/\/gallery\/tray-cutouts\//);
      photos.add(source);
    }
    pending += await leaf.getByText("عکس این طرح در حال تطبیق است.", { exact: true }).count();
  }
  expect(photos.size).toBe(29);
  expect(pending).toBe(7);
  const esfand = picker.getByRole("link", { name: "اسفند", exact: true });
  const bracelet = leaf.locator('[data-collection-photo="20"]');
  const braceletSrc = await bracelet.locator("img").getAttribute("src");
  await bracelet.click();
  await expect(tray(page).locator('[data-gallery-product-number="20"] img')).toHaveAttribute("src", braceletSrc!);
  await page.getByRole("button", { name: /بازگشت به دفتر/ }).click();
  await expect(esfand).toHaveAttribute("aria-current", "true");
  await expect(bracelet).toBeFocused();
  await expect(page).toHaveURL(/galleryPanel=magazine&collection=birth-months&month=esfand$/);
});

test.describe("magazine before client scripts load", () => {
  test.use({ javaScriptEnabled: false });

  test("the room link, chapter links and return work as server-rendered pages", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await magazine(page).click();
    await expect(drawer(page).getByRole("heading", { name: "فهرست آثار", exact: true })).toBeVisible();
    await drawer(page).getByRole("link", { name: "فیبوناچی", exact: true }).click();
    await expect(page).toHaveURL(/galleryPanel=magazine&collection=fibonacci-birth-month$/);
    await expect(drawer(page).getByRole("region", { name: "گل‌های ماه تولد", exact: true }).getByRole("listitem")).toHaveCount(8);
    await drawer(page).getByRole("link", { name: /بازگشت به فهرست/ }).click();
    await drawer(page).getByRole("link", { name: "انگشتر", exact: true }).click();
    await expect(page).toHaveURL(/galleryPanel=magazine&category=rings$/);
    await expect(drawer(page).getByRole("heading", { name: "انگشتر", exact: true })).toBeVisible();
    await drawer(page).getByRole("link", { name: "بستن پنل" }).click();
    await expect(drawer(page)).toHaveCount(0);
  });

  test("the full tray opens exact catalog and archive works and restores the source chapter", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/?galleryPanel=magazine&category=rings");
    const lapis = drawer(page).getByRole("link", { name: /نمایش انگشتر نقره «لاجورد شب» روی سینی/ });
    const lapisSource = await lapis.locator("img").getAttribute("src");
    await lapis.click();
    await expect(tray(page).locator("[data-table-product] img")).toHaveAttribute("src", lapisSource!);
    await expect(tray(page).getByRole("heading", { name: /لاجورد شب/ })).toBeVisible();
    const backToChapter = page.getByRole("link", { name: /بازگشت به صفحهٔ مجله/ });
    await expect(backToChapter).toBeInViewport();
    await page.reload();
    await expect(tray(page).getByRole("heading", { name: /لاجورد شب/ })).toBeVisible();
    await backToChapter.click();
    await expect(lapis).toBeVisible();

    await page.goto("/?galleryPanel=magazine&collection=birth-months");
    const esfand = drawer(page).getByRole("link", { name: "اسفند", exact: true });
    await esfand.click();
    const bracelet = drawer(page).locator('[data-collection-photo="20"]');
    const braceletSource = await bracelet.locator("img").getAttribute("src");
    await bracelet.click();
    const archiveImage = tray(page).locator('[data-gallery-product-number="20"] img');
    await expect(archiveImage).toHaveAttribute("src", braceletSource!);
    await expect(archiveImage).toBeInViewport();
    await expect(tray(page).getByRole("article", { name: "شناسنامهٔ اثر روی میز" })).toContainText("اسفند");
    await page.getByRole("link", { name: /بازگشت به دفتر/ }).click();
    await expect(esfand).toHaveAttribute("aria-current", "true");
    await expect(bracelet).toBeVisible();

    await page.goto("/?galleryPanel=product&archive=01");
    await expect(tray(page)).toHaveCount(0);
  });
});

test("the Fibonacci leaf opens each matched flower and keeps unconfirmed months unlabeled on the tray", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/?galleryPanel=magazine");
  await drawer(page).getByRole("link", { name: "فیبوناچی", exact: true }).click();
  const leaf = drawer(page).getByRole("region", { name: "فیبوناچی", exact: true });
  const matched = leaf.getByRole("region", { name: "گل‌های ماه تولد", exact: true });
  const pending = leaf.getByRole("region", { name: "عکس‌های در حال تطبیق", exact: true });
  await expect(matched.getByRole("link")).toHaveCount(8);
  await expect(pending.getByRole("listitem")).toHaveText([
    "شهریورآستر با نگین یاسی", "آذرکاملیا با نگین قرمز تیره", "دیگل برف با نگین شفاف", "بهمنبنفشه با نگین بنفش پررنگ",
  ]);
  await expect(pending.getByRole("link")).toHaveCount(0);
  const matchNumbers = ["25", "31", "26", "28", "09", "24", "29", "23"];
  for (const number of matchNumbers) {
    const work = matched.locator(`[data-archive-photo="${number}"]`);
    const source = await work.locator("img").getAttribute("src");
    await work.click();
    await expect(tray(page).locator(`[data-gallery-product-number="${number}"] img`)).toHaveAttribute("src", source!);
    await expect(tray(page).getByRole("article", { name: "شناسنامهٔ اثر روی میز" })).toContainText("ماه تولد");
    await page.getByRole("button", { name: /بازگشت به دفتر/ }).click();
    await expect(work).toBeFocused();
  }
  const archive = leaf.getByRole("region", { name: "آویزهای آرشیوی مجموعه", exact: true });
  await expect(archive.getByRole("link")).toHaveCount(3);
  await archive.locator('[data-archive-photo="27"]').click();
  await expect(tray(page).locator('[data-gallery-product-number="27"]')).toBeVisible();
  await expect(tray(page).getByRole("article", { name: "شناسنامهٔ اثر روی میز" })).not.toContainText("ماه تولد");
});

test("keyboard tray navigation announces the chosen work without announcing automatic changes", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await page.clock.install();
  await page.getByRole("button", { name: "نمایش انگشتر روی میز", exact: true }).click();
  const heading = tray(page).getByRole("heading");
  const status = tray(page).getByRole("status");
  const initialTitle = await heading.innerText();
  await expect(status).toBeEmpty();

  const next = page.getByRole("button", { name: "اثر بعدی" });
  await next.press("Enter");
  const selectedTitle = await heading.innerText();
  expect(selectedTitle).not.toBe(initialTitle);
  await expect(next).toBeFocused();
  await expect(status).toHaveText(selectedTitle);

  await page.clock.fastForward(13_000);
  await expect(heading).not.toHaveText(selectedTitle);
  await expect(status).toBeEmpty();
});

test("mobile tray and cashier retain their layout", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const emblems = page.locator('img[data-category-symbol][src*="silver-emblem-"]');
  await expect(emblems).toHaveCount(6);
  await Promise.all((await emblems.all()).map((emblem) => emblem.evaluate((img: HTMLImageElement) => img.decode())));
  const welcome = page.getByText("welcome", { exact: true });
  await expect(welcome).toBeVisible();
  expect(await welcome.evaluate((element) => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(9);
  await page.getByRole("button", { name: "نمایش انگشتر روی میز", exact: true }).click();
  await expect(tray(page)).toBeVisible();
  await expect(page.getByRole("button", { name: "اثر بعدی" })).toBeVisible();
  await expect(page).toHaveScreenshot("tray.png");
  await page.getByRole("button", { name: /بازگشت به گالری/ }).click();
  await page.getByRole("link", { name: "باز کردن صندوق درخواست‌ها" }).click();
  await expect(drawer(page).getByRole("button", { name: /پاکت صندوق/ })).toBeVisible();
  await expect(page).toHaveScreenshot("cashier.png");
});

test("a portrait phone shows the complete room and opens the real showcase boxes", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("ornova.gallery.guide.v1", "0");
    window.dispatchEvent(new Event("storage"));
  });
  await expect(page.getByRole("group", { name: "دسته‌های ویترین" })).toHaveCount(0);
  await expect(page.getByRole("complementary", { name: "راهنمای بازدید" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "راهنمای بازدید", exact: true })).toHaveCSS("width", "44px");
  const room = page.getByRole("img", { name: /سالن اُرنوا/ });
  const image = await room.evaluate(async (element: HTMLImageElement) => {
    await element.decode();
    const bounds = element.getBoundingClientRect();
    return { src: element.currentSrc, left: bounds.left, right: bounds.right, top: bounds.top, bottom: bounds.bottom };
  });
  expect(image.src).toContain("hatam-portrait-v2-");
  expect(image.left).toBeLessThanOrEqual(0);
  expect(image.right).toBeGreaterThanOrEqual(320);
  expect(image.top).toBeLessThanOrEqual(0);
  expect(image.bottom).toBeGreaterThanOrEqual(568);

  const boxes = await page.locator("[data-stand-id]").all();
  expect(boxes).toHaveLength(6);
  for (const box of boxes) {
    expect(await box.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return bounds.width >= 24 && bounds.height >= 24 && element.contains(document.elementFromPoint(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2));
    })).toBe(true);
    await box.click();
    await expect(tray(page)).toBeVisible();
    await page.getByRole("button", { name: "بازگشت به گالری" }).click();
  }
});

test("the narrow mobile tray fits the full catalog card beneath the product", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/");
  await page.getByRole("button", { name: "نمایش انگشتر روی میز", exact: true }).click();
  await page.evaluate(() => document.fonts.ready.then(() => true));
  const ring = tray(page).locator('[data-table-product="lajvard-shab-ring"]');
  const image = await ring.locator("img").evaluate(async (element: HTMLImageElement) => {
    await element.decode();
    const displayWidth = Math.min(element.clientWidth, element.clientHeight * element.naturalWidth / element.naturalHeight);
    const slot = element.closest<HTMLElement>('[data-tray-category="rings"]');
    return { source: element.currentSrc, displayWidth, slotWidth: slot?.clientWidth ?? 0 };
  });
  expect(image.source).toContain("lajvard-shab-tray-horizontal-v2.webp");
  expect(image.displayWidth / image.slotWidth).toBeGreaterThan(.68);
  expect(image.displayWidth / image.slotWidth).toBeLessThan(.76);
  const product = await ring.boundingBox();
  const card = tray(page).getByRole("article");
  const position = await card.boundingBox();
  expect(position!.y).toBeGreaterThan(product!.y + product!.height);
  expect(await card.evaluate((element) => element.scrollHeight - element.clientHeight)).toBeLessThanOrEqual(1);
  await expect(card.getByText("ابعاد", { exact: true })).toBeInViewport({ ratio: 1 });
  await expect(page.getByRole("button", { name: "ثبت سفارش", exact: true })).toBeInViewport({ ratio: 1 });
});

test("staff can update a dossier while its old tray photo stays withdrawn, then approve a replacement", async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await context.addCookies([galleryStaffCookie()]);
  const withdrawn = "/images/ornova/gallery/products/goldan-khamoosh-stand-cutout-preview-v1.webp";
  const replacement = "/images/ornova/catalog-media/43ac8e1e-e7e6-413a-b782-743f684f53c8.png";
  let record = { ...galleryStaffCatalog[0], slug: "silent-vase-pin", name: "گلدان خاموش", revision: 2, category_id: "brooches-pins", category_label: "سنجاق سینه", stand_image_path: withdrawn };
  const saves: { stand_image_path: string; gallery_placement_verified: boolean }[] = [];
  const pixels = await sharp({ create: { width: 36, height: 36, channels: 4, background: { r: 170, g: 190, b: 210, alpha: 1 } } })
    .extend({ top: 12, bottom: 12, left: 12, right: 12, background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  await page.route(`**${replacement}`, (route) => route.fulfill({ contentType: "image/png", body: pixels }));
  await page.route("**/api/admin/catalog/media", (route) => route.fulfill({ status: 201, json: { path: replacement } }));
  await page.route("**/api/admin/catalog", (route) => {
    if (route.request().method() === "GET") return route.fulfill({ json: { products: [record] } });
    const update = route.request().postDataJSON();
    saves.push(update);
    record = { ...record, ...update, revision: record.revision + 1 };
    return route.fulfill({ json: { product: record } });
  });

  await page.goto("/admin/catalog");
  await page.getByRole("button", { name: /^گلدان خاموش/ }).click();
  const checkbox = page.getByRole("checkbox", { name: /جای‌گذاری اثر روی سینی/ });
  const save = page.getByRole("button", { name: "ذخیرهٔ اثر", exact: true });
  await expect(page.getByText(/این عکس از سینی کنار گذاشته شده است/)).toBeVisible();
  await expect(page.getByRole("group", { name: "تنظیم عکس روی سینی" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "خواندن اندازهٔ عکس استند" })).toHaveCount(0);
  await expect(checkbox).not.toBeChecked();
  await expect(checkbox).toBeDisabled();
  await page.locator('[name="dossier-stone"]').fill("بدون سنگ");
  await save.click();
  await expect(page.getByText("شناسنامه ذخیره شد. عکس سینی همچنان کنار گذاشته شده است.", { exact: true })).toBeVisible();
  expect(saves[0]).toMatchObject({ stand_image_path: withdrawn, gallery_placement_verified: true });
  await expect(checkbox).not.toBeChecked();

  await page.getByLabel("بارگذاری برش سینی", { exact: true }).setInputFiles({ name: "replacement.png", mimeType: "image/png", buffer: pixels });
  await expect(page.getByRole("img", { name: "پیش‌نمایش تصویر اثر روی سینی" })).toBeVisible();
  await expect(checkbox).toBeEnabled();
  await expect(checkbox).not.toBeChecked();
  await checkbox.check();
  await save.click();
  await expect.poll(() => saves.length).toBe(2);
  expect(saves[1]).toMatchObject({ stand_image_path: replacement, gallery_placement_verified: true });
});

test("staff preview matches both public tray layouts and flags a scrolling card before saving", async ({ page, context }) => {
  async function measure(surface: Locator) {
    return surface.evaluate(async (element: HTMLElement) => {
      const backdrop = element.querySelector<HTMLImageElement>("picture img")!;
      const work = element.querySelector<HTMLImageElement>('img[alt]:not([alt=""])')!;
      const dossier = element.querySelector<HTMLElement>("article")!;
      await Promise.all([backdrop.decode(), work.decode(), document.fonts.ready]);
      const origin = element.getBoundingClientRect();
      const placement = (item: HTMLElement) => {
        const box = item.getBoundingClientRect();
        return [
          (box.left - origin.left) / origin.width, (box.top - origin.top) / origin.height,
          box.width / origin.width, box.height / origin.height,
        ].map((value) => Math.round(value * 1000));
      };
      return { frame: [element.offsetWidth, element.offsetHeight], backdrop: backdrop.currentSrc, work: work.currentSrc, composition: [placement(work), placement(dossier)] };
    });
  }

  const openRing = () => page.getByRole("button", { name: "نمایش انگشتر روی میز", exact: true }).click();
  const publicTray = page.getByRole("region", { name: "نمای نزدیک میز و سینی" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await openRing();
  const phone = await measure(publicTray);
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect.poll(() => publicTray.locator("picture img").evaluate((image: HTMLImageElement) => image.currentSrc)).toContain("velvet-tray-desktop-v1.webp");
  const desktop = await measure(publicTray);

  await context.addCookies([galleryStaffCookie()]);
  await page.goto("/admin/catalog");
  await page.getByRole("button", { name: /^انگشتر نقره «لاجورد شب»/ }).click();
  const preview = page.getByRole("figure", { name: "پیش‌نمایش سینی در گالری" });
  await expect(preview.getByRole("img", { name: "پیش‌نمایش تصویر اثر روی سینی" })).toBeVisible();
  expect(await measure(preview.locator('[data-tray-preview="phone"]'))).toEqual(phone);
  await preview.getByRole("button", { name: "دسکتاپ", exact: true }).click();
  expect(await measure(preview.locator('[data-tray-preview="desktop"]'))).toEqual(desktop);
  await preview.getByRole("button", { name: "گوشی", exact: true }).click();
  await page.getByRole("textbox", { name: "ابعاد تقریبی", exact: true }).fill("ابعاد دقیقِ مورد نیاز برای بازبینیِ این اثر ".repeat(5));
  await expect(preview.getByRole("status")).toContainText("داخل کارت پیمایش کنید");
  const overflow = await preview.getByRole("article").evaluate((card) => card.scrollHeight - card.clientHeight);
  expect(overflow).toBeGreaterThan(1);
});

test("the weight atlas is staff-only and its estimates stay out of the public dossier field", async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const marker = "نام آزمایشی بانک خصوصی وزن";
  const publicPage = await page.request.get("/?galleryPanel=product&product=lajvard-shab-ring");
  expect(await publicPage.text()).not.toContain(marker);
  const guestPage = await page.request.get("/admin/catalog", { maxRedirects: 0 });
  expect(guestPage.status()).toBe(307);
  expect(await guestPage.text()).not.toContain(marker);
  await context.addCookies([galleryTestCookie()]);
  const customerPage = await page.request.get("/admin/catalog");
  expect(await customerPage.text()).not.toContain(marker);
  await page.goto("/admin/catalog");
  await expect(page.getByText(/بانک داخلی برآورد وزن/)).toHaveCount(0);

  await context.addCookies([galleryStaffCookie()]);
  await page.goto("/admin/catalog");
  await page.getByText("بانک داخلی برآورد وزن (۱ اثر)", { exact: true }).click();
  await expect(page.getByRole("list", { name: "برآورد وزن آثار" })).toContainText(marker);
  await page.getByRole("button", { name: /^انگشتر نقره «لاجورد شب»/ }).click();
  await expect(page.getByText(/برآورد داخلی وزن نقره/)).toContainText("۶٫۳۷ گرم");
  await expect(page.getByRole("textbox", { name: "وزن تقریبی", exact: true })).toHaveValue("پس از طراحی مشخص می‌شود");
  await expect(page.getByRole("figure", { name: "پیش‌نمایش سینی در گالری" })).not.toContainText("۶٫۳۷ گرم");
});

test("staff can preview turns, retry and apply a separate transparent tray image", async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await context.addCookies([galleryStaffCookie()]);
  const uploadedPath = "/images/ornova/catalog-media/43ac8e1e-e7e6-413a-b782-743f684f53c8.png";
  let uploaded: Buffer | undefined;
  let uploadAttempts = 0;
  let catalogWrites = 0;
  await page.route(`**${uploadedPath}`, (route) => route.fulfill({ contentType: "image/png", body: uploaded }));
  await page.route("**/api/admin/catalog", (route) => {
    if (route.request().method() === "POST") catalogWrites++;
    return route.continue();
  });
  await page.route("**/api/admin/catalog/media", async (route) => {
    uploadAttempts++;
    if (uploadAttempts === 1) return route.fulfill({ status: 503, json: { error: "بارگذاری آزمایشی انجام نشد." } });
    const request = route.request();
    const data = await new Request(request.url(), {
      method: "POST", headers: request.headers(), body: new Uint8Array(request.postDataBuffer()!),
    }).formData();
    const file = data.get("file");
    expect(data.get("purpose")).toBe("tray");
    expect(file).toBeInstanceOf(File);
    if (!(file instanceof File)) throw new Error("Missing rotated image");
    expect(file.type).toBe("image/png");
    uploaded = Buffer.from(await file.arrayBuffer());
    return route.fulfill({ status: 201, json: { path: uploadedPath } });
  });

  await page.goto("/admin/catalog");
  await page.getByRole("button", { name: /^انگشتر نقره «لاجورد شب»/ }).click();
  const preview = page.getByRole("figure", { name: "پیش‌نمایش سینی در گالری" });
  const work = preview.getByRole("img", { name: "پیش‌نمایش تصویر اثر روی سینی" });
  const rotation = preview.getByRole("group", { name: "تنظیم عکس روی سینی" });
  const tilt = () => work.evaluate((element) => getComputedStyle(element.parentElement!).rotate);
  const pathInput = page.getByRole("textbox", { name: "تصویر اثر روی سینی", exact: true });
  await rotation.getByRole("button", { name: "۹۰° چپ", exact: true }).click();
  expect(await tilt()).toBe("270deg");
  await rotation.getByRole("button", { name: "بازنشانی زاویه", exact: true }).click();
  expect(await tilt()).toBe("0deg");
  await rotation.getByRole("button", { name: "۹۰° راست", exact: true }).click();
  await preview.getByRole("button", { name: "دسکتاپ", exact: true }).click();
  expect(await tilt()).toBe("90deg");
  await expect(pathInput).toHaveValue(/lajvard-shab-stand-cutout-preview-v1\.webp$/);
  expect(uploadAttempts).toBe(0);

  const apply = rotation.getByRole("button", { name: "استفاده از این چرخش", exact: true });
  await apply.click();
  await expect(page.getByRole("alert").filter({ hasText: "بارگذاری آزمایشی انجام نشد." })).toBeVisible();
  expect(await tilt()).toBe("90deg");
  await apply.click();
  await expect(pathInput).toHaveValue(uploadedPath);
  await expect(work).toBeVisible();
  expect(await tilt()).toBe("0deg");
  expect(await work.evaluate((image: HTMLImageElement) => [image.naturalWidth, image.naturalHeight])).toEqual([182, 490]);
  await expect(page.getByRole("checkbox", { name: /جای‌گذاری اثر روی سینی/ })).not.toBeChecked();
  expect(catalogWrites).toBe(0);

  const image = await sharp(uploaded!).ensureAlpha().raw().toBuffer();
  const original = await sharp("public/images/ornova/gallery/products/lajvard-shab-tray-horizontal-v2.webp").rotate(90).raw().toBuffer();
  expect(image.length).toBe(original.length);
  let changedPixels = 0;
  for (let index = 3; index < image.length; index += 4) {
    if (image[index] !== original[index] || (image[index] === 255 && image.readUInt32BE(index - 3) !== original.readUInt32BE(index - 3))) changedPixels++;
  }
  expect(changedPixels).toBe(0);
});

test("staff can remove asymmetric transparent margins and keep the crop during a turn", async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await context.addCookies([galleryStaffCookie()]);
  const loadedPath = "/images/ornova/catalog-media/ef84ff23-2ba9-4813-8b7c-03624b555643.png";
  const adjustedPath = "/images/ornova/catalog-media/da23678f-ab11-431f-b9ad-c2136958bd08.png";
  const piece = Buffer.alloc(79 * 35 * 4);
  for (let y = 0; y < 35; y++) {
    for (let x = 0; x < 79; x++) {
      const offset = (y * 79 + x) * 4;
      piece.set(x === 0 || y === 0 ? [48, 104, 160, 16] : [24, 96, 144, 255], offset);
    }
  }
  const background = { r: 0, g: 0, b: 0, alpha: 0 };
  const native = await sharp(piece, { raw: { width: 79, height: 35, channels: 4 } }).png().toBuffer();
  const padded = await sharp({ create: { width: 410, height: 244, channels: 4, background } }).composite([{ input: native, left: 281, top: 196 }]).png().toBuffer();
  let uploaded: Buffer | undefined;
  let requests = 0;
  await page.route(`**${loadedPath}`, (route) => route.fulfill({ contentType: "image/png", body: padded }));
  await page.route(`**${adjustedPath}`, (route) => route.fulfill({ contentType: "image/png", body: uploaded }));
  await page.route("**/api/admin/catalog/media", async (route) => {
    requests++;
    const request = route.request();
    const fields = await new Request(request.url(), { method: "POST", headers: request.headers(), body: new Uint8Array(request.postDataBuffer()!) }).formData();
    const file = fields.get("file");
    expect(fields.get("purpose")).toBe("tray");
    if (!(file instanceof File)) throw new Error("Missing adjusted tray image");
    uploaded = Buffer.from(await file.arrayBuffer());
    return route.fulfill({ status: 201, json: { path: adjustedPath } });
  });

  await page.goto("/admin/catalog");
  await page.getByRole("button", { name: /^انگشتر نقره «لاجورد شب»/ }).click();
  const pathInput = page.getByRole("textbox", { name: "تصویر اثر روی سینی", exact: true });
  await pathInput.fill(loadedPath);
  const preview = page.getByRole("figure", { name: "پیش‌نمایش سینی در گالری" });
  const work = preview.getByRole("img", { name: "پیش‌نمایش تصویر اثر روی سینی" });
  const center = preview.getByRole("button", { name: "وسط‌چین کردن اثر", exact: true });
  await center.click();
  await expect(work).toHaveJSProperty("width", 81);
  await expect(work).toHaveJSProperty("height", 37);
  await preview.getByRole("button", { name: "بازنشانی کادر", exact: true }).click();
  await expect(work).toHaveJSProperty("naturalWidth", 410);
  await center.click();
  await preview.getByRole("button", { name: "۹۰° راست", exact: true }).click();
  await preview.getByRole("button", { name: "دسکتاپ", exact: true }).click();
  expect(await work.evaluate((element) => getComputedStyle(element.parentElement!).rotate)).toBe("90deg");
  await expect(work).toHaveJSProperty("width", 81);
  await expect(pathInput).toHaveValue(loadedPath);
  expect(requests).toBe(0);

  await preview.getByRole("button", { name: "استفاده از این کادر", exact: true }).click();
  await expect(pathInput).toHaveValue(adjustedPath);
  await expect(work).toHaveJSProperty("naturalWidth", 37);
  await expect(work).toHaveJSProperty("naturalHeight", 81);
  await center.click();
  await expect(preview.getByRole("status").filter({ hasText: "حاشیه‌ای برای برش ندارد" })).toBeVisible();
  expect(requests).toBe(1);

  const { data: pixels, info } = await sharp(uploaded!).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const paddedPixels = await sharp(padded).ensureAlpha().raw().toBuffer();
  expect([info.width, info.height]).toEqual([37, 81]);
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const output = (y * info.width + x) * 4;
      const source = ((231 - x) * 410 + 280 + y) * 4;
      expect(pixels[output + 3]).toBe(paddedPixels[source + 3]);
      if (pixels[output + 3] === 255) expect(pixels.readUInt32BE(output)).toBe(paddedPixels.readUInt32BE(source));
    }
  }
});

test("the brooch label stays beside the cabinet and the first work is upright", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const brooch = page.getByRole("button", { name: "نمایش سنجاق‌سینه روی میز", exact: true });
  await brooch.hover();
  const tooltip = page.getByRole("tooltip");
  await expect(tooltip).toBeVisible();
  const [label, box] = await Promise.all([tooltip.boundingBox(), brooch.boundingBox()]);
  expect(label!.x + label!.width).toBeLessThan(box!.x);
  await brooch.click();
  await expect(tray(page).getByRole("heading")).toHaveText("سنجاق‌سینهٔ نواری مشبک");
  await expect(tray(page).getByRole("img", { name: "سنجاق‌سینهٔ نواری مشبک" })).toHaveCSS("transform", "none");
  const next = page.getByRole("button", { name: "اثر بعدی" });
  const titles = new Set<string>();
  for (;;) {
    const title = (await tray(page).getByRole("heading").textContent())!;
    if (titles.has(title)) break;
    titles.add(title);
    await next.click();
  }
  expect(titles).toEqual(new Set(["سنجاق‌سینهٔ نواری مشبک", "سنجاق‌سینهٔ دندان تاج‌دار", "نشان سینهٔ ترازوی عدالت"]));
});

test("the visit guide marks its objects and restores keyboard focus on finish and replay", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/");
  const replay = page.getByRole("button", { name: "راهنمای بازدید", exact: true });
  const guide = page.getByRole("complementary", { name: "راهنمای بازدید" });
  const next = guide.getByRole("button", { name: "بخش بعدی", exact: true });
  await replay.press("Enter");
  await expect(next).toBeFocused();

  for (const [stop, target] of [
    ["showcase", page.getByRole("button", { name: "نمایش انگشتر روی میز", exact: true })],
    ["magazine", magazine(page)],
    ["cashier", page.getByRole("link", { name: "باز کردن صندوق درخواست‌ها", exact: true })],
    ["phone", page.getByRole("link", { name: "ارتباط با اُرنوا از تلفن گالری", exact: true })],
    ["studio", page.getByRole("link", { name: "ورود به کارگاه طراحی", exact: true })],
  ] as const) {
    await expect(guide).toHaveAttribute("data-guide-stop", stop);
    await expect(guide).toBeInViewport({ ratio: 1 });
    await expect(target).toHaveAttribute("data-guide-current", "true");
    if (stop === "studio") await guide.getByRole("button", { name: "پایان راهنما" }).press("Enter");
    else await next.press("Enter");
  }
  await expect(replay).toBeFocused();
  await replay.press("Enter");
  await expect(next).toBeFocused();
  await guide.getByRole("button", { name: "رد کردن راهنما" }).press("Enter");
  await expect(replay).toBeFocused();
});

test.describe("touch gallery orientation", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: "no-preference" });

  test("lights each object in turn while keeping its touch target usable", async ({ page }) => {
    let releaseArt!: () => void;
    const artResponse = new Promise<void>((resolve) => { releaseArt = resolve; });
    await page.route(/\/entry-ornova-orosi-hatam-portrait-v\d+-\d+\.(?:avif|webp)$/, async (route) => {
      await artResponse;
      await route.continue();
    });
    try {
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await expect.poll(() => magazine(page).evaluate((element) => getComputedStyle(element, "::before").animationPlayState)).toBe("paused");
      expect(await magazine(page).evaluate((element) => getComputedStyle(element, "::before").visibility)).toBe("hidden");
    } finally {
      releaseArt();
    }
    await expect(page.locator('[data-room-art-ready="true"]')).toBeAttached();
    const targets = [
      magazine(page),
      page.getByRole("link", { name: "باز کردن صندوق درخواست‌ها", exact: true }),
      page.getByRole("link", { name: "ارتباط با اُرنوا از تلفن گالری", exact: true }),
      page.getByRole("link", { name: "ورود به کارگاه طراحی", exact: true }),
    ];
    const cues = await Promise.all(targets.map((target) => target.evaluate(async (element) => {
      const animation = element.getAnimations({ subtree: true })[0];
      const timing = animation.effect!.getTiming();
      const delay = timing.delay ?? 0;
      const duration = Number(timing.duration);
      animation.pause();
      animation.currentTime = delay + 290;
      await new Promise(requestAnimationFrame);
      const cue = getComputedStyle(element, "::before");
      const peakOpacity = Number(cue.opacity);
      const pointerEvents = cue.pointerEvents;
      animation.currentTime = delay + duration + 1;
      await new Promise(requestAnimationFrame);
      return { delay, duration, iterations: timing.iterations, peakOpacity, pointerEvents, endOpacity: Number(getComputedStyle(element, "::before").opacity) };
    })));
    for (const [index, cue] of cues.entries()) {
      expect(cue.peakOpacity).toBeGreaterThan(.75);
      expect(cue.pointerEvents).toBe("none");
      expect(cue.endOpacity).toBe(0);
      expect(cue.iterations).toBe(1);
      const previous = cues[index - 1];
      if (previous) expect(cue.delay).toBeGreaterThan(previous.delay + previous.duration);
    }

    await page.emulateMedia({ reducedMotion: "reduce" });
    expect(await targets[0].evaluate((element) => getComputedStyle(element, "::before").animationName)).toBe("none");
    await page.getByRole("button", { name: "راهنمای بازدید", exact: true }).tap();
    await expect(page.getByRole("complementary", { name: "راهنمای بازدید" })).toBeVisible();
    expect(await targets[0].evaluate((element) => getComputedStyle(element, "::before").visibility)).toBe("hidden");
    await page.getByRole("button", { name: "رد کردن راهنما", exact: true }).tap();

    await targets[0].tap();
    await expect(drawer(page).getByRole("heading", { name: "فهرست آثار", exact: true })).toBeVisible();
    await drawer(page).getByRole("link", { name: "بستن پنل", exact: true }).tap();
    await targets[1].tap();
    await expect(drawer(page).getByRole("button", { name: /پاکت صندوق/ })).toBeVisible();
    await drawer(page).getByRole("button", { name: "بستن پنل", exact: true }).tap();
    await targets[2].tap();
    await expect(drawer(page).getByRole("tab", { name: "دربارهٔ اُرنوا" })).toBeVisible();
    await drawer(page).getByRole("button", { name: "بستن پنل", exact: true }).tap();
    await targets[3].tap();
    await expect(drawer(page).getByRole("button", { name: "دفتر شخصی اُرنوا", exact: true })).toBeVisible();
  });
});

test("the tray selection stays attached to the order and its named receipt", async ({ page, context }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await context.addCookies([galleryTestCookie()]);
  const receiptId = "39fe816c-5c30-4cde-8200-611bcfb2afd0";
  const catalogReceiptId = "41111111-4444-4444-8444-411111111111";
  const date = "2026-11-24T10:00:00Z";
  const title = "انگشتر با نگین اشکی";
  let submissions = 0;
  await page.route("**/api/inquiries", async (route) => {
    expect(route.request().method()).toBe("POST");
    const sent = route.request().postDataJSON();
    expect(sent.archive_photo).toBe("05");
    expect(sent.items).toEqual([]);
    submissions++;
    await route.fulfill({ status: 201, json: { id: receiptId } });
  });
  await page.route("**/api/account/inquiries?view=receipts&*", async (route) => {
    const id = new URL(route.request().url()).searchParams.get("receiptId");
    if (id) {
      expect(id).toBe(receiptId);
      await route.fulfill({ json: {
        receipt: { id, items: [] }, archiveTitle: title, archiveNumber: "05", registeredAt: date,
        status: "received", price: { kind: "pending" },
      } });
      return;
    }
    await route.fulfill({ json: { receipts: [
      { id: receiptId, status: "received", created_at: date, workName: title, additionalWorks: 0, archiveNumber: "05" },
      { id: catalogReceiptId, status: "reviewing", created_at: date, workName: "انگشتر نقره «لاجورد شب»", additionalWorks: 1, archiveNumber: null },
    ], hasMore: false } });
  });

  await page.goto("/");
  await page.clock.install();
  await page.getByRole("button", { name: "نمایش انگشتر روی میز", exact: true }).click();
  const selected = tray(page).locator('[data-gallery-product-number="05"]');
  for (let step = 0; step < 12 && !(await selected.count()); step++) {
    await page.getByRole("button", { name: "اثر بعدی" }).click();
  }
  await expect(selected).toBeVisible();
  await tray(page).getByRole("heading", { name: title }).scrollIntoViewIfNeeded();
  await page.getByRole("link", { name: "ثبت سفارش", exact: true }).click();
  await expect(page).toHaveURL(/galleryPanel=account&complete=1&archive=05$/);
  await page.clock.fastForward(25_000);
  await drawer(page).getByRole("button", { name: /بازبینی و ثبت سفارش/ }).click();
  await expect(drawer(page).getByRole("heading", { name: title, exact: true })).toBeVisible();
  await drawer(page).getByRole("textbox", { name: "نام", exact: true }).fill("مشتری آزمایشی");
  await drawer(page).getByRole("textbox", { name: "راه ارتباطی", exact: true }).fill("receipt-test@example.test");
  await drawer(page).getByRole("button", { name: "ارسال درخواست برای Ornova", exact: true }).click();
  await drawer(page).getByRole("button", { name: /دیدن رسید در صندوق/ }).click();
  await expect(page).toHaveURL(new RegExp(`receipt=${receiptId}$`));
  const issued = drawer(page).getByRole("article", { name: "رسید ثبت درخواست اُرنوا" });
  await expect(issued).toContainText(`${title} · عکس ۰۵`);
  const backToList = drawer(page).getByRole("button", { name: "بازگشت به فهرست رسیدها" });
  await backToList.click();
  await expect(page).toHaveURL(/view=receipts$/);
  const archiveRow = drawer(page).getByRole("button", { name: new RegExp(title) });
  await expect(archiveRow).toBeFocused();
  await expect(archiveRow).toContainText("عکس ۰۵");
  await expect(drawer(page).getByRole("button", { name: /لاجورد شب.*و ۱ اثر دیگر/ })).toBeVisible();
  await archiveRow.click();
  await expect(backToList).toBeFocused();
  await expect(page).toHaveURL(new RegExp(`receipt=${receiptId}$`));
  await expect(issued).toContainText(title);
  await backToList.click();
  await expect(archiveRow).toBeFocused();
  await expect(page).toHaveURL(/view=receipts$/);
  await drawer(page).getByRole("button", { name: "بستن پنل" }).click();
  await expect(selected).toBeVisible();
  await page.goto("/?galleryPanel=basket&view=receipts");
  await expect(archiveRow).toBeVisible();
  await archiveRow.click();
  await page.reload();
  await expect(issued).toContainText(title);
  expect(submissions).toBe(1);
});

test("downloaded archive receipts include the stamp and only their confirmed amount", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const acceptedId = "39fe816c-5c30-4cde-8200-611bcfb2afd0";
  const pendingId = "41111111-4444-4444-8444-411111111111";
  const quoteId = "02222222-2222-4222-8222-222222222222";
  const totalRial = "9007199254740993";
  const totalLabel = "۹٬۰۰۷٬۱۹۹٬۲۵۴٬۷۴۰٬۹۹۳";
  await page.route("**/api/account/inquiries?view=receipts&receiptId=*", async (route) => {
    const id = new URL(route.request().url()).searchParams.get("receiptId");
    const accepted = id === acceptedId;
    await route.fulfill({ json: {
      receipt: { id, items: [] },
      archiveTitle: "آویز دندان",
      archiveNumber: "02",
      registeredAt: "2026-11-24T10:00:00Z",
      status: "received",
      price: accepted ? { kind: "accepted", quoteId, totalRial } : { kind: "pending" },
    } });
  });

  for (const [id, accepted] of [[acceptedId, true], [pendingId, false]] as const) {
    await page.goto(`/?galleryPanel=basket&view=receipts&receipt=${id}`);
    const receipt = page.getByRole("article", { name: "رسید ثبت درخواست اُرنوا" });
    await expect(receipt.getByText("ثبت شد", { exact: true })).toBeVisible();
    await expect(receipt).toContainText("آویز دندان · عکس ۰۲");
    if (accepted) await expect(receipt).toContainText(`${totalLabel} ریال`);
    else await expect(receipt.locator("[data-receipt-total]")).toHaveCount(0);

    const downloadButton = page.getByRole("button", { name: "دریافت رسید" });
    const pocket = await page.getByRole("button", { name: "بستن پاکت صندوق" }).boundingBox();
    const action = await downloadButton.boundingBox();
    if (!pocket || !action) throw new Error("The receipt download controls are missing");
    expect(action.y).toBeGreaterThan(pocket.y + pocket.height);
    const [download] = await Promise.all([page.waitForEvent("download"), downloadButton.click()]);
    expect(download.suggestedFilename()).toBe(`ornova-receipt-${id}.html`);
    const path = await download.path();
    if (!path) throw new Error("The receipt file was not saved");
    const html = await readFile(path, "utf8");
    expect(html).toContain("<html lang=\"fa\" dir=\"rtl\">");
    expect(html).toContain('data-receipt-stamp="true"');
    expect(html).toContain("عکس ۰۲");
    expect(html.includes(totalLabel)).toBe(accepted);
    expect(html.includes("مبلغ تأییدشده")).toBe(accepted);
  }
});
