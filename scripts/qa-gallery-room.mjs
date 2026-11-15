import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const modulePath = createRequire(import.meta.url).resolve(process.env.ORNOVA_PLAYWRIGHT_MODULE || 'playwright');
const playwright = await import(pathToFileURL(modulePath).href);
const { chromium } = playwright.default ?? playwright;
const output=process.env.ORNOVA_QA_OUTPUT || join(tmpdir(),'ornova-gallery-qa');
mkdirSync(output,{recursive:true});
const base=new URL(process.env.ORNOVA_QA_URL || 'http://localhost:3008/').origin + '/';
(async()=>{
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:960}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
await page.goto(base);await page.waitForTimeout(1300);
if(await page.locator('[data-stand-id]').count()!==6) console.error(JSON.stringify({url:page.url(),body:(await page.locator('body').innerText()).slice(0,800),errors}));
assert.equal(await page.locator('[data-stand-id]').count(),6);
assert.equal(await page.locator('[data-gallery-product-number]').count(),6,'each stand has one final image');
const set=page.getByRole('button',{name:'بازکردن ویترین نیم‌ست',exact:true});
await set.hover();await page.waitForTimeout(250);await page.mouse.move(20,20);await page.waitForTimeout(1000);
assert.equal(await page.getByRole('dialog').count(),0,'brief crossing opens nothing');
const visibleImage=()=>set.locator('[data-gallery-product-number]').getAttribute('src');
const imageBefore=await visibleImage();await page.waitForTimeout(7300);assert.notEqual(await visibleImage(),imageBefore,'rotation changes image');
await set.hover();await page.waitForTimeout(1150);assert.equal(await page.getByRole('dialog').count(),1);
assert.equal(page.url(),base);
const frozen=await visibleImage();await page.waitForTimeout(7300);assert.equal(await visibleImage(),frozen,'open display pauses timer');
await page.getByRole('button',{name:'اثر بعدی',exact:true}).click();assert.notEqual(await visibleImage(),frozen,'next changes exact scene image');
await page.waitForTimeout(1000);await page.screenshot({path:join(output,'ornova-room-pilot-detail.png')});
await page.keyboard.press('Escape');await page.waitForTimeout(1750);assert.equal(await page.getByRole('dialog').count(),0,'no reopening after closing');
for (const [name,pattern] of [['تلفن؛ پشتیبانی و ارتباط با اُرنوا',/ارتباط|پشتیبانی/],['صندوق گالری؛ انتخاب‌ها و سفارش',/صندوق|انتخاب|درخواست/],['مجله؛ دسته‌ها و کالکشن‌ها',/فهرست گالری/]]) {
 await page.getByRole('button',{name,exact:true}).click();assert.equal(await page.getByRole('dialog').count(),1);assert.match(await page.getByRole('dialog').innerText(),pattern);assert.equal(page.url(),base);await page.keyboard.press('Escape');await page.waitForTimeout(350);
}
await page.mouse.move(20,20);await page.waitForTimeout(1000);await page.screenshot({path:join(output,'ornova-room-pilot.png')});
assert.equal(await page.locator('[data-gallery-product-number]').evaluateAll(images=>images.every(image=>image instanceof HTMLImageElement && image.complete && image.naturalWidth>0)),true,'all six final images load');
for (const [id,label] of [['ring-display','انگشتر'],['brooch-display','سنجاق‌سینه'],['ear-display','گوشواره'],['set-display','نیم‌ست'],['pendant-display','آویز گردنبند'],['bracelet-display','دستبند']]) {
 await page.locator(`[data-stand-id="${id}"]`).click();await page.waitForTimeout(1050);
 assert.match(await page.getByRole('dialog').innerText(),new RegExp(label),'each stand opens its matching dossier');
 await page.screenshot({path:join(output,`ornova-room-${id}-detail.png`)});
 await page.keyboard.press('Escape');await page.waitForTimeout(1450);
}
await page.setViewportSize({width:390,height:844});await page.waitForTimeout(1000);await page.screenshot({path:join(output,'ornova-room-mobile.png')});
await page.getByRole('button',{name:/ویترین‌های راست/}).click();await page.waitForTimeout(1000);await page.screenshot({path:join(output,'ornova-room-mobile-right.png')});
await set.click();await page.waitForTimeout(1200);assert.equal(await page.getByRole('dialog').count(),1);await page.screenshot({path:join(output,'ornova-room-mobile-detail.png')});
await page.keyboard.press('Tab');assert.equal(await page.getByRole('dialog').evaluate(el=>el.contains(document.activeElement)),true,'focus stays inside modal');await page.keyboard.press('Escape');
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false,'no horizontal document overflow');
await page.emulateMedia({reducedMotion:'reduce'});await page.reload();await page.waitForTimeout(1200);const still=await visibleImage();await page.waitForTimeout(7300);assert.equal(await visibleImage(),still,'reduced motion stays still');
assert.deepEqual(errors,[]);
console.log(JSON.stringify({passed:['six stands','brief hover cancelled','timed rotation','intent hover opens in place','pause in detail','next updates scene','Escape and cooldown','telephone','cashier','magazine','mobile right view and detail','keyboard containment','no document overflow','reduced motion'],url:page.url(),errors},null,2));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
