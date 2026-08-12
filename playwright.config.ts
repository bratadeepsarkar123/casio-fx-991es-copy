import { defineConfig, devices } from "@playwright/test";

const port = 4173;
const base = process.env.VITE_BASE ?? "/casio-fx-991es-copy/";

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: `http://127.0.0.1:${port}${base}`,
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run build && npm run preview -- --host 127.0.0.1 --port 4173",
    url: `http://127.0.0.1:${port}${base}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    {
      name: "tablet",
      use: {
        ...devices["Desktop Chrome"],
        viewport: devices["iPad Mini"].viewport,
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
});
