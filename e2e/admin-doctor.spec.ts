import { test, expect } from "@playwright/test";

test.describe("診察フロー（Drカルテ）", () => {
  test("Drカルテ画面が表示される", async ({ page }) => {
    await page.goto("/admin/doctor");
    // 日付タブが表示される（7日分）
    await expect(page.locator("button").filter({ hasText: /\d+\/\d+/ }).first()).toBeVisible();
  });

  test("ステータスフィルターが表示される", async ({ page }) => {
    await page.goto("/admin/doctor");

    // フィルターボタンが表示される
    await expect(page.getByText("未診")).toBeVisible();
    await expect(page.getByText("すべて")).toBeVisible();
  });

  test("日付タブの切り替えができる", async ({ page }) => {
    await page.goto("/admin/doctor");

    // 最初の日付タブをクリック
    const dateTab = page.locator("button").filter({ hasText: /\d+\/\d+/ }).first();
    await dateTab.click();

    // アクティブ状態になる（bg-pink-500）
    await expect(dateTab).toHaveClass(/bg-pink-500/);
  });

  test("週送りボタンが動作する", async ({ page }) => {
    await page.goto("/admin/doctor");

    // 現在の日付タブのテキストを取得
    const firstDate = await page
      .locator("button")
      .filter({ hasText: /\d+\/\d+/ })
      .first()
      .textContent();

    // 次の週ボタンをクリック
    await page.getByText("▶").click();

    // 日付が変わっている
    const newFirstDate = await page
      .locator("button")
      .filter({ hasText: /\d+\/\d+/ })
      .first()
      .textContent();

    expect(newFirstDate).not.toBe(firstDate);
  });

  test("ステータスフィルターの切り替えができる", async ({ page }) => {
    await page.goto("/admin/doctor");

    // 「すべて」フィルターをクリック
    await page.getByText("すべて").click();

    // 「すべて」がアクティブになる
    const allButton = page
      .locator("button")
      .filter({ hasText: "すべて" })
      .first();
    await expect(allButton).toHaveClass(/bg-pink-500/);
  });

  test("サイドバーからDrカルテにナビゲーションできる", async ({ page }) => {
    await page.goto("/admin");

    await page.getByRole("link", { name: /Drカルテ/ }).click();
    await page.waitForURL("/admin/doctor");
  });
});
