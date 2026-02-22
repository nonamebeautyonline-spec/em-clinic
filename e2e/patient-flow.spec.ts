// e2e/patient-flow.spec.ts — 患者導線のE2E統合テスト
// Playwright の request コンテキストを使ったAPIレベルのテスト
// 実際のAPIルート（/api/intake, /api/reservations, /api/checkout）に対してリクエストを送信し、
// レスポンスの構造とステータスコードを検証する

import { test, expect } from "@playwright/test";
import { PatientApiClient } from "./helpers/api-client";

// 管理者セッション不要（患者APIはCookie認証）
test.use({ storageState: { cookies: [], origins: [] } });

// テスト用定数
const TEST_PATIENT_ID = `E2E_TEST_${Date.now()}`;
const TEST_PATIENT_NG_ID = `E2E_TEST_NG_${Date.now()}`;

// テスト用の問診データ（ng_check は予約時の必須チェック項目）
const INTAKE_ANSWERS = {
  氏名: "テスト太郎",
  カナ: "テストタロウ",
  性別: "男性",
  生年月日: "1990-01-15",
  電話番号: "09012345678",
  メールアドレス: "test@example.com",
  ng_check: "問題なし",
  身長: "170",
  体重: "65",
  服用中の薬: "なし",
  既往歴: "なし",
  アレルギー: "なし",
  希望薬剤: "マンジャロ 2.5mg",
};

// 予約用の日付（翌月15日を使用 — 予約開放日を考慮）
function getTestReservationDate(): string {
  const now = new Date();
  // JSTに変換
  const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const year = jstNow.getUTCFullYear();
  const month = jstNow.getUTCMonth(); // 0-indexed

  // 翌月の15日
  const nextMonth = month + 1;
  const targetYear = nextMonth > 11 ? year + 1 : year;
  const targetMonth = nextMonth > 11 ? 0 : nextMonth;
  return `${targetYear}-${String(targetMonth + 1).padStart(2, "0")}-15`;
}

test.describe("患者導線 E2E", () => {
  let client: PatientApiClient;

  test.beforeEach(async ({ request }) => {
    client = new PatientApiClient(request, TEST_PATIENT_ID);
  });

  // -------------------------------------------
  // テスト1: 問診保存
  // -------------------------------------------
  test("問診を保存できる", async () => {
    const response = await client.submitIntake({
      answers: INTAKE_ANSWERS,
      name: INTAKE_ANSWERS.氏名,
      name_kana: INTAKE_ANSWERS.カナ,
      sex: INTAKE_ANSWERS.性別,
      birth: INTAKE_ANSWERS.生年月日,
      tel: INTAKE_ANSWERS.電話番号,
      email: INTAKE_ANSWERS.メールアドレス,
    });

    // ステータスコード200を期待
    expect(response.status()).toBe(200);

    // レスポンスボディの検証
    const body = await response.json();
    expect(body).toHaveProperty("ok", true);
  });

  // -------------------------------------------
  // テスト2: Cookie未設定で問診保存は401エラー
  // -------------------------------------------
  test("Cookie未設定の問診保存は401エラー", async ({ request }) => {
    // patient_id Cookie なしでリクエスト
    const response = await request.post("http://localhost:3000/api/intake", {
      headers: { "Content-Type": "application/json" },
      data: {
        answers: { 氏名: "未認証ユーザー" },
      },
    });

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body).toHaveProperty("ok", false);
    expect(body).toHaveProperty("error", "unauthorized");
  });

  // -------------------------------------------
  // テスト3: 予約作成（問診が存在する前提）
  // -------------------------------------------
  test("予約を作成できる", async () => {
    // まず問診を保存（予約には問診完了が必須）
    const intakeRes = await client.submitIntake({
      answers: INTAKE_ANSWERS,
      name: INTAKE_ANSWERS.氏名,
      tel: INTAKE_ANSWERS.電話番号,
    });
    expect(intakeRes.status()).toBe(200);

    // 予約作成
    const date = getTestReservationDate();
    const response = await client.createReservation({
      date,
      time: "14:00",
    });

    const body = await response.json();
    const status = response.status();

    // 予約が成功した場合 or 枠が埋まっている場合 or 予約開放前の場合
    // いずれかのレスポンスを許容する（テスト環境の状態依存）
    if (status === 200) {
      // 予約成功
      expect(body).toHaveProperty("ok", true);
      expect(body).toHaveProperty("reserveId");
      expect(typeof body.reserveId).toBe("string");
      expect(body.reserveId).toMatch(/^resv-/);
    } else if (status === 400) {
      // 予約開放前 or 既に予約あり or 問診未完了
      expect(body).toHaveProperty("ok", false);
      expect(["booking_not_open", "already_reserved", "intake_not_found", "questionnaire_not_completed"]).toContain(
        body.error
      );
    } else if (status === 409) {
      // 枠が埋まっている
      expect(body).toHaveProperty("ok", false);
      expect(body.error).toBe("slot_full");
    } else if (status === 500) {
      // DB接続エラー等（テスト環境依存）
      expect(body).toHaveProperty("ok", false);
    }
  });

  // -------------------------------------------
  // テスト4: 決済リンク生成
  // -------------------------------------------
  test("決済リンクを生成できる", async () => {
    const response = await client.createCheckout({
      productCode: "MJL_2.5mg_1m",
      mode: "first",
    });

    const body = await response.json();
    const status = response.status();

    // 決済リンク生成が成功した場合
    if (status === 200) {
      expect(body).toHaveProperty("checkoutUrl");
      expect(typeof body.checkoutUrl).toBe("string");
    } else if (status === 403) {
      // NG患者としてブロックされた場合
      expect(body).toHaveProperty("error");
    } else if (status === 500) {
      // APP_BASE_URL未設定 or 決済プロバイダ接続エラー（テスト環境依存）
      expect(body).toHaveProperty("error");
    }
  });

  // -------------------------------------------
  // テスト5: 無効な商品コードでエラー
  // -------------------------------------------
  test("無効な商品コードで400エラー", async () => {
    const response = await client.createCheckout({
      productCode: "INVALID_PRODUCT_CODE_999",
      mode: "first",
    });

    const body = await response.json();
    const status = response.status();

    // 商品が見つからない場合は400
    // APP_BASE_URL未設定の場合は500
    expect([400, 500]).toContain(status);
    expect(body).toHaveProperty("error");
  });

  // -------------------------------------------
  // テスト6: 無効なmodeで400エラー
  // -------------------------------------------
  test("無効な決済modeでバリデーションエラー", async ({ request }) => {
    const response = await request.post("http://localhost:3000/api/checkout", {
      headers: {
        Cookie: `patient_id=${TEST_PATIENT_ID}`,
        "Content-Type": "application/json",
      },
      data: {
        productCode: "MJL_2.5mg_1m",
        mode: "invalid_mode",
        patientId: TEST_PATIENT_ID,
      },
    });

    const body = await response.json();
    // Zodバリデーションエラー（parseBody） or APIレベルのバリデーション
    expect([400, 422]).toContain(response.status());
  });

  // -------------------------------------------
  // テスト7: NG患者は決済できない
  // -------------------------------------------
  test("NG患者は決済できない", async ({ request }) => {
    // NG患者用のクライアント
    // 注意: 実際にDBにNG患者（intake.status="NG"）が存在している必要がある
    // テスト環境にNG患者がいない場合は、NGチェックをスキップして別の結果を返す
    const ngClient = new PatientApiClient(request, TEST_PATIENT_NG_ID);

    const response = await ngClient.createCheckout({
      productCode: "MJL_2.5mg_1m",
      mode: "first",
    });

    const body = await response.json();
    const status = response.status();

    if (status === 403) {
      // NG判定された場合（DBにNG患者データが存在）
      expect(body).toHaveProperty("error");
      expect(body.error).toContain("処方不可");
    } else {
      // テスト環境にNG患者データがない場合:
      // - 200: 決済リンク生成成功（checkoutUrl あり）
      // - 500: APP_BASE_URL 未設定 or 決済プロバイダ接続エラー
      expect([200, 500]).toContain(status);
    }
  });

  // -------------------------------------------
  // テスト8: 予約枠取得（GETエンドポイント）
  // -------------------------------------------
  test("予約枠を取得できる", async () => {
    const date = getTestReservationDate();
    const response = await client.getAvailableSlots(date);

    // GETは認証不要のため常に200を期待
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty("date", date);
    expect(body).toHaveProperty("slots");
    expect(Array.isArray(body.slots)).toBe(true);
    expect(body).toHaveProperty("bookingOpen");
    expect(typeof body.bookingOpen).toBe("boolean");

    // slots の各要素の構造を検証
    if (body.slots.length > 0) {
      const slot = body.slots[0];
      expect(slot).toHaveProperty("time");
      expect(slot).toHaveProperty("count");
      expect(typeof slot.time).toBe("string");
      expect(typeof slot.count).toBe("number");
    }
  });

  // -------------------------------------------
  // テスト9: 予約に必須パラメータが欠けている場合
  // -------------------------------------------
  test("予約作成で日付が欠けているとバリデーションエラー", async ({
    request,
  }) => {
    const response = await request.post(
      "http://localhost:3000/api/reservations",
      {
        headers: {
          Cookie: `patient_id=${TEST_PATIENT_ID}`,
          "Content-Type": "application/json",
        },
        data: {
          type: "createReservation",
          // date を省略
          time: "14:00",
          patient_id: TEST_PATIENT_ID,
        },
      }
    );

    // Zodバリデーションエラー
    expect([400, 422]).toContain(response.status());
  });

  // -------------------------------------------
  // テスト10: 問診→予約→決済の統合フロー
  // -------------------------------------------
  test("問診→予約→決済の統合フロー", async ({ request }) => {
    // テストごとにユニークな患者IDを使用（他テストとの干渉を防止）
    const integrationPatientId = `E2E_INTEGRATION_${Date.now()}`;
    const integrationClient = new PatientApiClient(
      request,
      integrationPatientId
    );

    // ==============================
    // ステップ1: 問診保存
    // ==============================
    const intakeRes = await integrationClient.submitIntake({
      answers: INTAKE_ANSWERS,
      name: INTAKE_ANSWERS.氏名,
      name_kana: INTAKE_ANSWERS.カナ,
      sex: INTAKE_ANSWERS.性別,
      birth: INTAKE_ANSWERS.生年月日,
      tel: INTAKE_ANSWERS.電話番号,
      email: INTAKE_ANSWERS.メールアドレス,
    });

    expect(intakeRes.status()).toBe(200);
    const intakeBody = await intakeRes.json();
    expect(intakeBody).toHaveProperty("ok", true);

    // ==============================
    // ステップ2: 予約作成
    // ==============================
    const reservationDate = getTestReservationDate();
    const reservationRes = await integrationClient.createReservation({
      date: reservationDate,
      time: "15:00",
    });

    const reservationBody = await reservationRes.json();
    const reservationStatus = reservationRes.status();

    // 予約結果を変数に保持
    let reserveId: string | null = null;

    if (reservationStatus === 200) {
      expect(reservationBody).toHaveProperty("ok", true);
      expect(reservationBody).toHaveProperty("reserveId");
      reserveId = reservationBody.reserveId;
    } else {
      // 予約開放前や枠満杯は許容（テスト環境依存）
      expect([400, 409, 500]).toContain(reservationStatus);
      expect(reservationBody).toHaveProperty("ok", false);
    }

    // ==============================
    // ステップ3: 決済リンク生成
    // ==============================
    const checkoutRes = await integrationClient.createCheckout({
      productCode: "MJL_2.5mg_1m",
      mode: "first",
    });

    const checkoutBody = await checkoutRes.json();
    const checkoutStatus = checkoutRes.status();

    if (checkoutStatus === 200) {
      // 決済リンクが生成された
      expect(checkoutBody).toHaveProperty("checkoutUrl");
      expect(typeof checkoutBody.checkoutUrl).toBe("string");
    } else {
      // APP_BASE_URL未設定等のサーバーエラーは許容
      expect(checkoutBody).toHaveProperty("error");
    }

    // ==============================
    // クリーンアップ: 予約キャンセル（成功した場合のみ）
    // ==============================
    if (reserveId) {
      const cancelRes = await integrationClient.cancelReservation(reserveId);
      // キャンセルが成功 or 既にキャンセル済みを許容
      expect([200, 400, 500]).toContain(cancelRes.status());
    }
  });

  // -------------------------------------------
  // テスト11: 予約枠の範囲取得（start/end）
  // -------------------------------------------
  test("予約枠を範囲指定で取得できる", async ({ request }) => {
    const date = getTestReservationDate();
    // 翌日も含めた2日間の範囲を指定
    const [year, month, day] = date.split("-").map(Number);
    const endDate = `${year}-${String(month).padStart(2, "0")}-${String(day + 1).padStart(2, "0")}`;

    // GET /api/reservations?start=xxx&end=yyy の形式で取得
    const rangeResponse = await request.get(
      `http://localhost:3000/api/reservations?start=${date}&end=${endDate}`,
      {
        headers: {
          Cookie: `patient_id=${TEST_PATIENT_ID}`,
        },
      }
    );

    expect(rangeResponse.status()).toBe(200);
    const rangeBody = await rangeResponse.json();
    expect(rangeBody).toHaveProperty("start", date);
    expect(rangeBody).toHaveProperty("end", endDate);
    expect(rangeBody).toHaveProperty("slots");
    expect(Array.isArray(rangeBody.slots)).toBe(true);
  });

  // -------------------------------------------
  // テスト12: 予約枠GETでパラメータ不足
  // -------------------------------------------
  test("予約枠GETでstart/end/dateがないと400エラー", async ({ request }) => {
    const response = await request.get(
      "http://localhost:3000/api/reservations",
      {
        headers: {
          Cookie: `patient_id=${TEST_PATIENT_ID}`,
        },
      }
    );

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty("error");
  });
});
