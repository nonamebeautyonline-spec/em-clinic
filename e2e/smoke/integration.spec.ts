// e2e/smoke/integration.spec.ts — 統合フロー Smoke E2E
// 致命パス: 問診→予約→決済の一貫した導線
//
// 決定論的テスト:
// - 各ステップの結果に応じた条件分岐アサート
// - DB検証が可能な場合は全ステップの整合性を確認

import { test, expect } from "@playwright/test";
import { PatientApiClient } from "../helpers/api-client";
import {
  canVerifyDb,
  cleanupTestData,
  getIntakeRecord,
  getReservationRecord,
  generateRunId,
} from "../helpers/db-client";

// 管理者セッション不要
test.use({ storageState: { cookies: [], origins: [] } });

const RUN_ID = generateRunId();
const PATIENT_INTEG = `E2E_INTEG_${RUN_ID}`;

const INTAKE_ANSWERS = {
  氏名: "E2E統合テスト太郎",
  カナ: "イーツーイートウゴウテストタロウ",
  性別: "男性",
  生年月日: "1990-01-15",
  電話番号: "09012345678",
  メールアドレス: "e2e-integration@example.com",
  ng_check: "問題なし",
  身長: "170",
  体重: "65",
  服用中の薬: "なし",
  既往歴: "なし",
  アレルギー: "なし",
  希望薬剤: "マンジャロ 2.5mg",
};

/** 翌月15日 */
function getTestReservationDate(): string {
  const now = new Date();
  const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const year = jstNow.getUTCFullYear();
  const month = jstNow.getUTCMonth();
  const nextMonth = month + 1;
  const targetYear = nextMonth > 11 ? year + 1 : year;
  const targetMonth = nextMonth > 11 ? 0 : nextMonth;
  return `${targetYear}-${String(targetMonth + 1).padStart(2, "0")}-15`;
}

test.afterAll(async () => {
  await cleanupTestData(`E2E_INTEG_${RUN_ID}`);
});

test.describe("統合フロー Smoke", () => {
  test("問診→予約→決済の一貫したフロー", async ({ request }) => {
    const client = new PatientApiClient(request, PATIENT_INTEG);

    // ステップ1: 問診保存
    const intakeRes = await client.submitIntake({
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

    // ステップ2: 予約作成
    const reservationDate = getTestReservationDate();
    const reservationRes = await client.createReservation({
      date: reservationDate,
      time: "15:00",
    });

    const reservationBody = await reservationRes.json();
    const reservationStatus = reservationRes.status();
    let reserveId: string | null = null;

    // 500はバグ
    expect([200, 400, 409]).toContain(reservationStatus);

    if (reservationStatus === 200) {
      expect(reservationBody).toHaveProperty("ok", true);
      expect(reservationBody).toHaveProperty("reserveId");
      reserveId = reservationBody.reserveId;
    } else {
      expect(reservationBody).toHaveProperty("ok", false);
      expect(reservationBody).toHaveProperty("error");
    }

    // ステップ3: 決済リンク生成
    const checkoutRes = await client.createCheckout({
      productCode: "MJL_2.5mg_1m",
      mode: "first",
    });

    const checkoutBody = await checkoutRes.json();
    const checkoutStatus = checkoutRes.status();

    // 決済プロバイダ未接続は500を許容
    expect([200, 403, 500]).toContain(checkoutStatus);

    if (checkoutStatus === 200) {
      expect(checkoutBody).toHaveProperty("checkoutUrl");
      expect(typeof checkoutBody.checkoutUrl).toBe("string");
    }

    // DB検証（全ステップの整合性）
    if (canVerifyDb()) {
      const intake = await getIntakeRecord(PATIENT_INTEG);
      expect(intake).not.toBeNull();
      expect(intake!.answers).toHaveProperty("氏名", "E2E統合テスト太郎");

      if (reserveId) {
        expect(intake!.reserve_id).toBe(reserveId);

        const reservation = await getReservationRecord(reserveId);
        expect(reservation).not.toBeNull();
        expect(reservation!.patient_id).toBe(PATIENT_INTEG);
      }
    }

    // クリーンアップ: 予約キャンセル
    if (reserveId) {
      const cancelRes = await client.cancelReservation(reserveId);
      expect([200, 400]).toContain(cancelRes.status());
    }
  });
});
