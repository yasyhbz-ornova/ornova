import { expect, test, type Page } from "@playwright/test";
import { galleryTestCookie } from "./gallery-fixture.mjs";

const tray = (page: Page) => page.getByRole("group", { name: "سینی مخمل آبی افغانی", exact: true });
const drawer = (page: Page) => page.getByRole("dialog");
const magazine = (page: Page) => page.getByRole("button", { name: "باز کردن کتاب فهرست همهٔ آثار" });

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
  const result = drawer(page).getByRole("button", { name: "نمایش انگشتر با نگین اشکی روی سینی", exact: true });
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
