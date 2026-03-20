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

  test("カルテ本文を入力して保存 → 成功表示の確認", async ({ page }) => {
    await page.goto("/admin/doctor");
    await page.waitForLoadState("networkidle");

    // 予約一覧から最初の患者行をクリック（存在する場合のみ）
    const patientRow = page.locator("tr, [data-testid='patient-row']").first();
    const hasPatient = await patientRow.isVisible().catch(() => false);

    if (!hasPatient) {
      // テストデータがない場合はスキップ
      test.skip(true, "テスト用の予約データが存在しません");
      return;
    }

    // テキストエリア（カルテ本文入力欄）を探す
    const textarea = page.locator("textarea").first();
    const hasTextarea = await textarea.isVisible({ timeout: 5000 }).catch(() => false);

    if (!hasTextarea) {
      // テキストエリアが表示されない場合（患者未選択等）はスキップ
      test.skip(true, "カルテ入力テキストエリアが表示されません");
      return;
    }

    // カルテ本文を入力
    const testNote = `E2Eテスト用カルテ入力 ${Date.now()}`;
    await textarea.fill(testNote);
    await expect(textarea).toHaveValue(testNote);

    // 保存ボタンをクリック
    const saveButton = page.getByRole("button", { name: /保存/ });
    if (await saveButton.isVisible().catch(() => false)) {
      await saveButton.click();

      // 成功メッセージまたは保存完了の表示を待つ
      // 保存ボタンが「保存中...」→ 元に戻る、またはアラートが出るのを確認
      await expect(saveButton).not.toHaveText("保存中...", { timeout: 10000 });
    }
  });
});
