import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 120000,
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    browserName: "chromium",
    headless: true,
    viewport: {
      width: 1440,
      height: 900
    },
    trace: "retain-on-failure"
  },
  webServer: [
    {
      command: "npm run dev:server",
      url: "http://127.0.0.1:3001/api/meta/providers",
      reuseExistingServer: !process.env.CI,
      timeout: 120000
    },
    {
      command: "npm run dev:client -- --host 127.0.0.1 --port 4173",
      url: "http://127.0.0.1:4173",
      reuseExistingServer: !process.env.CI,
      timeout: 120000
    }
  ]
});
