import { test, expect } from "@playwright/test";

test.describe("再処方管理", () => {
  test("再処方リストページが表示される", async ({ page }) => {
    await page.goto("/admin/reorders");

    await expect(
      page.getByRole("heading", { name: "再処方リスト" })
    ).toBeVisible();
    await expect(page.getByText("再処方申請の承認・却下")).toBeVisible();
  });

  test("フィルターが表示される", async ({ page }) => {
    await page.goto("/admin/reorders");

    // フィルターセレクトが表示される
    await expect(page.getByText("承認待ちのみ")).toBeVisible();
  });

  test("テーブルのカラムヘッダーが表示される", async ({ page }) => {
    await page.goto("/admin/reorders");

    // データ取得完了を待つ
    await page.waitForLoadState("networkidle");

    // 主要カラム
    await expect(page.getByText("申請日時")).toBeVisible();
    await expect(page.getByText("患者名")).toBeVisible();
    await expect(page.getByText("商品名")).toBeVisible();
    await expect(page.getByText("ステータス")).toBeVisible();
  });

  test("フィルター切り替えで表示が更新される", async ({ page }) => {
    await page.goto("/admin/reorders");
    await page.waitForLoadState("networkidle");

    // 「すべて表示」に切り替え
    await page.getByRole("combobox").selectOption("all");

    // データ再取得を待つ
    await page.waitForLoadState("networkidle");
  });

  test("サイドバーから再処方リストにナビゲーションできる", async ({
    page,
  }) => {
    await page.goto("/admin");

    await page.getByRole("link", { name: /再処方リスト/ }).click();
    await page.waitForURL("/admin/reorders");
  });
});
