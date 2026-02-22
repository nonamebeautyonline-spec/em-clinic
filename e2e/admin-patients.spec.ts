import { test, expect } from "@playwright/test";

// 認証済み storageState を使用（playwright.config.ts で設定済み）

test.describe("患者管理（友だち一覧）", () => {
  test("友だち一覧ページが表示される", async ({ page }) => {
    await page.goto("/admin/line/friends");
    await expect(page.getByRole("heading", { name: "友達一覧" })).toBeVisible();
    await expect(page.getByText("LINE連携済みの患者を管理")).toBeVisible();
  });

  test("検索フィルターが表示される", async ({ page }) => {
    await page.goto("/admin/line/friends");

    // 検索入力欄
    await expect(
      page.getByPlaceholder("氏名 or IDで検索")
    ).toBeVisible();

    // 詳細検索ボタン
    await expect(page.getByText("詳細検索")).toBeVisible();
  });

  test("患者テーブルのヘッダーが表示される", async ({ page }) => {
    await page.goto("/admin/line/friends");

    // テーブルの主要カラムが表示される
    await expect(page.getByText("患者")).toBeVisible();
    await expect(page.getByText("タグ")).toBeVisible();
  });

  test("検索フィルターにテキスト入力ができる", async ({ page }) => {
    await page.goto("/admin/line/friends");

    const searchInput = page.getByPlaceholder("氏名 or IDで検索");
    await searchInput.fill("テスト");
    await expect(searchInput).toHaveValue("テスト");
  });

  test("詳細検索モーダルが開閉する", async ({ page }) => {
    await page.goto("/admin/line/friends");

    // 詳細検索ボタンをクリック
    await page.getByText("詳細検索").click();

    // モーダルが表示される
    await expect(page.getByText("この条件で検索")).toBeVisible();

    // モーダルを閉じる（背景クリックまたはキャンセル）
    await page.keyboard.press("Escape");
  });

  test("サイドバーから友だち一覧にナビゲーションできる", async ({ page }) => {
    await page.goto("/admin");

    // サイドバーのLINE機能リンクをクリック
    await page.getByRole("link", { name: /LINE機能/ }).click();
    await page.waitForURL(/\/admin\/line/);
  });
});
