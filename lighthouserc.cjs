const edge = process.platform === "win32"
  ? `${process.env["PROGRAMFILES(X86)"] ?? "C:\\Program Files (x86)"}\\Microsoft\\Edge\\Application\\msedge.exe`
  : undefined;

module.exports = {
  ci: {
    collect: {
      startServerCommand: "node scripts/gallery-qa-server.mjs start",
      startServerReadyPattern: "Ready in",
      startServerReadyTimeout: 30000,
      chromePath: process.env.CHROME_PATH ?? edge,
      numberOfRuns: 3,
      url: ["http://localhost:3108/"],
      settings: {
        onlyCategories: ["performance"],
        // Identify local audit traffic so middleware does not unwrap the on-wire gzip response.
        emulatedUserAgent: "OrnovaGalleryQA/1.0 (mobile)",
      },
    },
    assert: {
      assertions: {
        "largest-contentful-paint": ["error", { maxNumericValue: 4500, aggregationMethod: "median" }],
        "total-blocking-time": ["error", { maxNumericValue: 350, aggregationMethod: "median" }],
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.1, aggregationMethod: "median" }],
        "resource-summary:script:size": ["error", { maxNumericValue: 240000, aggregationMethod: "median" }],
      },
    },
    upload: { target: "filesystem", outputDir: ".lighthouseci/reports" },
  },
};
