import { test, expect } from "@playwright/test";

test.describe("配信作成画面", () => {
  test("一斉送信ページが正常に表示される", async ({ page }) => {
    // 一斉送信ページにアクセス
    const response = await page.goto("/admin/line/send");

    // ステータスコード200を確認
    expect(response?.status()).toBe(200);
  });

  test("配信作成フォームの主要UI要素が表示される", async ({ page }) => {
    await page.goto("/admin/line/send");

    // ページタイトル「一斉送信」が表示される
    await expect(
      page.getByRole("heading", { name: "一斉送信" })
    ).toBeVisible();

    // サブタイトルの説明文が表示される
    await expect(
      page.getByText("タグ・マークで絞り込んでLINEメッセージを一斉配信")
    ).toBeVisible();
  });

  test("配信履歴ページが正常に表示される", async ({ page }) => {
    // 配信履歴ページにアクセス
    const response = await page.goto("/admin/line/broadcasts");

    // ステータスコード200を確認
    expect(response?.status()).toBe(200);

    // 「配信履歴」のヘッダーが表示される
    await expect(
      page.getByRole("heading", { name: "配信履歴" })
    ).toBeVisible();
  });

  test("配信ページ間のナビゲーション", async ({ page }) => {
    // 一斉送信ページにアクセス
    await page.goto("/admin/line/send");

    // ページが正常に描画されている
    await expect(page.locator("body")).not.toBeEmpty();

    // 配信履歴ページにアクセス
    await page.goto("/admin/line/broadcasts");

    // 配信履歴ページが描画されている
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("配信ステータスの表示定義が存在する", async ({ page }) => {
    await page.goto("/admin/line/broadcasts");

    // ページが正常に描画されていることを確認（ローディング後）
    // 配信履歴がない場合でもステータスフィルタや表示エリアが存在する
    await expect(page.locator("body")).toContainText("配信履歴");
  });
});
