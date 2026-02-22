import { test, expect } from "@playwright/test";

test.describe("管理者認証", () => {
  // このテストはstorageState不要（未認証状態でテスト）
  test.use({ storageState: { cookies: [], origins: [] } });

  test("ログインページが正常に表示される", async ({ page }) => {
    const response = await page.goto("/admin/login");
    expect(response?.status()).toBe(200);
    await expect(page.getByText("管理画面ログイン")).toBeVisible();
  });

  test("ログインフォームのUI要素が表示される", async ({ page }) => {
    await page.goto("/admin/login");

    await expect(page.getByLabel("ユーザーID")).toBeVisible();
    await expect(page.getByLabel("パスワード")).toBeVisible();
    await expect(page.getByRole("button", { name: "ログイン" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: /パスワードを忘れた/ })
    ).toHaveAttribute("href", "/admin/forgot-password");
  });

  test("空のフォームでHTML5バリデーションが動作する", async ({ page }) => {
    await page.goto("/admin/login");
    await expect(page.getByLabel("ユーザーID")).toHaveAttribute("required", "");
    await expect(page.getByLabel("パスワード")).toHaveAttribute("required", "");
  });

  test("不正な認証情報でエラーメッセージが表示される", async ({ page }) => {
    await page.goto("/admin/login");

    await page.getByLabel("ユーザーID").fill("INVALID-USER");
    await page.getByLabel("パスワード").fill("wrong-password");
    await page.getByRole("button", { name: "ログイン" }).click();

    // エラーメッセージの表示を待つ
    await expect(page.locator(".text-red-300")).toBeVisible({ timeout: 10000 });
  });

  test("正しい認証情報でダッシュボードにリダイレクトされる", async ({
    page,
  }) => {
    const username = process.env.E2E_ADMIN_USERNAME;
    const password = process.env.E2E_ADMIN_PASSWORD;
    if (!username || !password) {
      test.skip(true, "E2Eテスト用認証情報が未設定");
      return;
    }

    await page.goto("/admin/login");
    await page.getByLabel("ユーザーID").fill(username);
    await page.getByLabel("パスワード").fill(password);
    await page.getByRole("button", { name: "ログイン" }).click();

    await page.waitForURL("/admin", { timeout: 15000 });
    await expect(page.getByText("ダッシュボード")).toBeVisible();
  });

  test("認証済みセッションがあればログインページからリダイレクトされる", async ({
    browser,
  }) => {
    const username = process.env.E2E_ADMIN_USERNAME;
    const password = process.env.E2E_ADMIN_PASSWORD;
    if (!username || !password) {
      test.skip(true, "E2Eテスト用認証情報が未設定");
      return;
    }

    // まずログイン
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("/admin/login");
    await page.getByLabel("ユーザーID").fill(username);
    await page.getByLabel("パスワード").fill(password);
    await page.getByRole("button", { name: "ログイン" }).click();
    await page.waitForURL("/admin", { timeout: 15000 });

    // ログインページに再アクセス → ダッシュボードにリダイレクトされるはず
    await page.goto("/admin/login");
    await page.waitForURL("/admin", { timeout: 10000 });

    await context.close();
  });
});
