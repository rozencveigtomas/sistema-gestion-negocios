import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/ui",
  outputDir: ".local-data/ui-results",
  workers: 1,
  reporter: [["list"], ["html", { open: "never", outputFolder: ".local-data/ui-report" }]],
  use: {
    baseURL: "http://127.0.0.1:3100",
    channel: "msedge",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Edge"] } },
    {
      name: "mobile",
      use: {
        ...devices["iPhone 13"],
        defaultBrowserType: "chromium",
        channel: "msedge",
      },
    },
  ],
  webServer: {
    command: "node tests/support/local-app.mjs",
    url: "http://127.0.0.1:3100/acceso",
    reuseExistingServer: false,
    timeout: 120000,
  },
});
