import { test, expect } from "@playwright/test";

test.describe("患者一覧（友達一覧）画面", () => {
  test("友達一覧ページが正常に表示される", async ({ page }) => {
    // 友達一覧ページにアクセス（認証なしでもページ自体は描画される）
    const response = await page.goto("/admin/line/friends");

    // ステータスコード200を確認
    expect(response?.status()).toBe(200);
  });

  test("ページタイトルが表示される", async ({ page }) => {
    await page.goto("/admin/line/friends");

    // 「友達一覧」のヘッダーが表示される
    await expect(page.getByRole("heading", { name: "友達一覧" })).toBeVisible();
  });

  test("検索UIが表示される", async ({ page }) => {
    await page.goto("/admin/line/friends");

    // 名前検索の入力欄が存在する
    const searchInput = page.getByPlaceholder(/名前で検索/);
    await expect(searchInput).toBeVisible();
  });

  test("詳細検索ボタンが表示される", async ({ page }) => {
    await page.goto("/admin/line/friends");

    // 詳細検索ボタンが存在する
    const advSearchButton = page.getByRole("button", { name: /詳細検索/ });
    await expect(advSearchButton).toBeVisible();
  });

  test("友達一覧からLINE機能ページへのナビゲーション", async ({ page }) => {
    // 配信ページへ遷移できることを確認
    const response = await page.goto("/admin/line");

    expect(response?.status()).toBe(200);

    // LINE機能のトップページが表示される
    await expect(page.locator("body")).toContainText("LINE");
  });
});
