import { test as setup, expect } from "@playwright/test";

const authFile = "e2e/.auth/admin.json";

setup("管理者ログイン", async ({ page }) => {
  const username = process.env.E2E_ADMIN_USERNAME;
  const password = process.env.E2E_ADMIN_PASSWORD;

  if (!username || !password) {
    throw new Error(
      "E2E_ADMIN_USERNAME / E2E_ADMIN_PASSWORD が e2e/.env.test に設定されていません"
    );
  }

  await page.goto("/admin/login");

  // ログインフォーム入力
  await page.getByLabel("ユーザーID").fill(username);
  await page.getByLabel("パスワード").fill(password);
  await page.getByRole("button", { name: "ログイン" }).click();

  // ダッシュボードへのリダイレクトを待つ
  await page.waitForURL("/admin", { timeout: 15000 });
  await expect(page.getByText("ダッシュボード")).toBeVisible();

  // 認証状態を保存
  await page.context().storageState({ path: authFile });
});
