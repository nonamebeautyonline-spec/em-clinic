import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";

// E2Eテスト用環境変数を読み込み
dotenv.config({ path: path.resolve(__dirname, "e2e/.env.test") });

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/admin.json",
      },
      dependencies: ["setup"],
    },
    {
      // 患者APIテスト（旧: 統合ファイル — 後方互換）
      name: "patient-api",
      testMatch: /patient-flow\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: { cookies: [], origins: [] },
      },
    },
    {
      // ドメイン別 Smoke E2E（問診・予約・決済・統合）
      // retries: 0 — フレークをリトライで隠さない（"固定"の原則）
      name: "smoke",
      testDir: "./e2e/smoke",
      testMatch: /\.spec\.ts$/,
      retries: 0,
      timeout: 30_000,
      use: {
        ...devices["Desktop Chrome"],
        storageState: { cookies: [], origins: [] },
      },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});
