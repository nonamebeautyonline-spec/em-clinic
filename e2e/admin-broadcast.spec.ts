import { test, expect } from "@playwright/test";

test.describe("一斉配信", () => {
  test("一斉送信ページが表示される", async ({ page }) => {
    await page.goto("/admin/line/send");

    await expect(page.getByRole("heading", { name: "一斉送信" })).toBeVisible();
    await expect(
      page.getByText("タグ・マークで絞り込んでLINEメッセージを一斉配信")
    ).toBeVisible();
  });

  test("配信フォームのUI要素が表示される", async ({ page }) => {
    await page.goto("/admin/line/send");

    // 配信名入力
    await expect(page.getByText("配信名（任意）")).toBeVisible();
    await expect(
      page.getByPlaceholder("例: 2月キャンペーン")
    ).toBeVisible();

    // 配信先設定
    await expect(page.getByText("配信先設定")).toBeVisible();

    // メッセージ入力
    await expect(page.getByText("メッセージ")).toBeVisible();
    await expect(
      page.getByPlaceholder("メッセージを入力してください")
    ).toBeVisible();
  });

  test("配信名を入力できる", async ({ page }) => {
    await page.goto("/admin/line/send");

    const nameInput = page.getByPlaceholder("例: 2月キャンペーン");
    await nameInput.fill("テスト配信");
    await expect(nameInput).toHaveValue("テスト配信");
  });

  test("メッセージを入力できる", async ({ page }) => {
    await page.goto("/admin/line/send");

    const messageInput = page.getByPlaceholder(
      "メッセージを入力してください"
    );
    await messageInput.fill("テストメッセージです");
    await expect(messageInput).toHaveValue("テストメッセージです");
  });

  test("配信日時設定が表示される", async ({ page }) => {
    await page.goto("/admin/line/send");

    await expect(page.getByText("登録後すぐに配信する")).toBeVisible();
    await expect(page.getByText("配信日時を指定する")).toBeVisible();
  });

  test("差し込み変数ボタンが表示される", async ({ page }) => {
    await page.goto("/admin/line/send");

    await expect(page.getByText("{name}")).toBeVisible();
    await expect(page.getByText("{patient_id}")).toBeVisible();
  });

  test("配信履歴ページが表示される", async ({ page }) => {
    await page.goto("/admin/line/broadcasts");

    await expect(
      page.getByRole("heading", { name: "配信履歴" })
    ).toBeVisible();
    await expect(
      page.getByText("一斉配信の送信結果を確認")
    ).toBeVisible();
  });

  test("配信履歴のサマリーが表示される", async ({ page }) => {
    await page.goto("/admin/line/broadcasts");
    await page.waitForLoadState("networkidle");

    // サマリー統計が表示される
    await expect(page.getByText("総配信数")).toBeVisible();
  });

  test("配信履歴のビュー切り替えができる", async ({ page }) => {
    await page.goto("/admin/line/broadcasts");

    // リスト/カレンダー切り替えタブが表示される
    await expect(page.getByText("リスト")).toBeVisible();
    await expect(page.getByText("カレンダー")).toBeVisible();
  });
});
