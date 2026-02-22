import { test, expect } from "@playwright/test";

test.describe("発送管理", () => {
  test("本日発送予定ページが表示される", async ({ page }) => {
    await page.goto("/admin/shipping/pending");

    // ページのロードを待つ（データ取得完了）
    await page.waitForLoadState("networkidle");

    // ページがエラーなく表示される
    expect(await page.title()).toBeTruthy();
  });

  test("発送管理ページが表示される", async ({ page }) => {
    await page.goto("/admin/shipping");

    await expect(page.getByText("配送管理")).toBeVisible();
  });

  test("追跡番号付与ページが表示される", async ({ page }) => {
    await page.goto("/admin/shipping/tracking");
    await page.waitForLoadState("networkidle");
    expect(await page.title()).toBeTruthy();
  });

  test("サイドバーから発送管理にナビゲーションできる", async ({ page }) => {
    await page.goto("/admin");

    await page.getByRole("link", { name: /本日発送予定/ }).click();
    await page.waitForURL("/admin/shipping/pending");
  });
});
