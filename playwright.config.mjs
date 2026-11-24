import { defineConfig } from "@playwright/test";
import { galleryQA } from "./tests/browser/gallery-fixture.mjs";

export default defineConfig({
  testDir: "./tests/browser",
  snapshotPathTemplate: "{testDir}/snapshots/{arg}-{platform}{ext}",
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 2,
  use: { baseURL: galleryQA.app, browserName: "chromium", channel: process.platform === "win32" ? "msedge" : undefined, reducedMotion: "reduce", trace: "retain-on-failure" },
  expect: { toHaveScreenshot: { animations: "disabled", maxDiffPixelRatio: 0.015 } },
  webServer: { command: "node scripts/gallery-qa-server.mjs start", url: galleryQA.app, reuseExistingServer: false },
});
