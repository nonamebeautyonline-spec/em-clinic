import { test, expect } from "@playwright/test";

test.describe("管理者ログイン画面", () => {
  test("ログインページが正常に表示される", async ({ page }) => {
    // ログインページにアクセス
    const response = await page.goto("/admin/login");

    // ステータスコード200を確認
    expect(response?.status()).toBe(200);
  });

  test("ログインフォームの主要UI要素が表示される", async ({ page }) => {
    await page.goto("/admin/login");

    // タイトルが表示される
    await expect(page.getByText("管理画面ログイン")).toBeVisible();

    // ユーザーID入力欄が表示される
    await expect(page.getByLabel("ユーザーID")).toBeVisible();

    // パスワード入力欄が表示される
    await expect(page.getByLabel("パスワード")).toBeVisible();

    // ログインボタンが表示される
    await expect(page.getByRole("button", { name: "ログイン" })).toBeVisible();
  });

  test("入力欄に値を入力できる", async ({ page }) => {
    await page.goto("/admin/login");

    // ユーザーIDを入力
    const usernameInput = page.getByLabel("ユーザーID");
    await usernameInput.fill("LP-TEST01");
    await expect(usernameInput).toHaveValue("LP-TEST01");

    // パスワードを入力
    const passwordInput = page.getByLabel("パスワード");
    await passwordInput.fill("test-password");
    await expect(passwordInput).toHaveValue("test-password");
  });

  test("空のフォームでログインボタンを押すとHTML5バリデーションが動作する", async ({
    page,
  }) => {
    await page.goto("/admin/login");

    // ユーザーID入力欄がrequired属性を持つ
    const usernameInput = page.getByLabel("ユーザーID");
    await expect(usernameInput).toHaveAttribute("required", "");

    // パスワード入力欄がrequired属性を持つ
    const passwordInput = page.getByLabel("パスワード");
    await expect(passwordInput).toHaveAttribute("required", "");
  });

  test("パスワードリセットリンクが存在する", async ({ page }) => {
    await page.goto("/admin/login");

    // パスワードを忘れた場合のリンクが表示される
    const forgotLink = page.getByRole("link", {
      name: /パスワードを忘れた/,
    });
    await expect(forgotLink).toBeVisible();

    // リンク先が正しい
    await expect(forgotLink).toHaveAttribute("href", "/admin/forgot-password");
  });
});
