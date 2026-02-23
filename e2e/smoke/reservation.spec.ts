// e2e/smoke/reservation.spec.ts — 予約ドメイン Smoke E2E
// 致命パス: 予約枠取得・予約作成・バリデーション
//
// 決定論的テスト:
// - 予約作成は環境依存（開放日・枠数）のため、200/400/409 を区別してアサート
// - 500は常にバグ扱い

import { test, expect } from "@playwright/test";
import { PatientApiClient } from "../helpers/api-client";
import {
  canVerifyDb,
  seedTestPatient,
  seedTestIntake,
  cleanupTestData,
  getIntakeRecord,
  getReservationRecord,
  generateRunId,
} from "../helpers/db-client";

// 管理者セッション不要
test.use({ storageState: { cookies: [], origins: [] } });

const RUN_ID = generateRunId();
const PATIENT_RESV = `E2E_RSV_${RUN_ID}`;

const INTAKE_ANSWERS = {
  氏名: "E2E予約テスト",
  カナ: "イーツーイーヨヤクテスト",
  性別: "男性",
  生年月日: "1990-01-15",
  電話番号: "09012345678",
  ng_check: "問題なし",
  希望薬剤: "マンジャロ 2.5mg",
};

/** 翌月15日（予約開放日を考慮した安全な日付） */
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
  await cleanupTestData(`E2E_RSV_${RUN_ID}`);
});

test.describe("予約ドメイン Smoke", () => {
  // -------------------------------------------
  // 1. 予約枠GET — 常に200
  // -------------------------------------------
  test("予約枠GETは200を返し構造が正しい", async ({ request }) => {
    const client = new PatientApiClient(request, PATIENT_RESV);
    const date = getTestReservationDate();

    const response = await client.getAvailableSlots(date);

    // 厳密: 200のみ
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty("date", date);
    expect(body).toHaveProperty("slots");
    expect(Array.isArray(body.slots)).toBe(true);
    expect(body).toHaveProperty("bookingOpen");
    expect(typeof body.bookingOpen).toBe("boolean");

    // スロット構造検証
    if (body.slots.length > 0) {
      const slot = body.slots[0];
      expect(slot).toHaveProperty("time");
      expect(slot).toHaveProperty("count");
      expect(typeof slot.time).toBe("string");
      expect(typeof slot.count).toBe("number");
    }
  });

  // -------------------------------------------
  // 2. date未指定は必ず400
  // -------------------------------------------
  test("予約GETでdate未指定は400エラー", async ({ request }) => {
    const response = await request.get(
      "http://localhost:3000/api/reservations",
      { headers: { Cookie: `patient_id=${PATIENT_RESV}` } }
    );

    // 厳密: 400のみ
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty("error");
  });

  // -------------------------------------------
  // 3. 範囲指定で予約枠取得
  // -------------------------------------------
  test("予約枠を範囲指定で取得できる", async ({ request }) => {
    const date = getTestReservationDate();
    const [year, month, day] = date.split("-").map(Number);
    const endDate = `${year}-${String(month).padStart(2, "0")}-${String(day + 1).padStart(2, "0")}`;

    const response = await request.get(
      `http://localhost:3000/api/reservations?start=${date}&end=${endDate}`,
      { headers: { Cookie: `patient_id=${PATIENT_RESV}` } }
    );

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty("start", date);
    expect(body).toHaveProperty("end", endDate);
    expect(body).toHaveProperty("slots");
    expect(Array.isArray(body.slots)).toBe(true);
  });

  // -------------------------------------------
  // 4. 予約作成（問診完了前提）
  // -------------------------------------------
  test("問診完了後に予約を作成できる", async ({ request }) => {
    if (canVerifyDb()) {
      await seedTestPatient(PATIENT_RESV, { name: "E2E予約テスト" });
      await seedTestIntake(PATIENT_RESV, { answers: INTAKE_ANSWERS });
    }

    const client = new PatientApiClient(request, PATIENT_RESV);

    // 問診を保存
    const intakeRes = await client.submitIntake({
      answers: INTAKE_ANSWERS,
      name: INTAKE_ANSWERS.氏名,
      tel: INTAKE_ANSWERS.電話番号,
    });
    expect(intakeRes.status()).toBe(200);

    // 予約作成
    const date = getTestReservationDate();
    const response = await client.createReservation({ date, time: "14:00" });
    const body = await response.json();
    const status = response.status();

    // 500はバグ
    expect([200, 400, 409]).toContain(status);

    if (status === 200) {
      expect(body).toHaveProperty("ok", true);
      expect(body).toHaveProperty("reserveId");
      expect(typeof body.reserveId).toBe("string");
      expect(body.reserveId).toMatch(/^resv-/);

      // DB検証
      if (canVerifyDb()) {
        const reservation = await getReservationRecord(body.reserveId);
        expect(reservation).not.toBeNull();
        expect(reservation!.patient_id).toBe(PATIENT_RESV);
        expect(reservation!.reserved_date).toBe(date);

        const intake = await getIntakeRecord(PATIENT_RESV);
        expect(intake).not.toBeNull();
        expect(intake!.reserve_id).toBe(body.reserveId);
      }
    } else if (status === 400) {
      expect(body).toHaveProperty("ok", false);
      expect(body).toHaveProperty("error");
      expect([
        "booking_not_open",
        "already_reserved",
        "intake_not_found",
        "questionnaire_not_completed",
      ]).toContain(body.error);
    } else if (status === 409) {
      expect(body).toHaveProperty("ok", false);
      expect(body.error).toBe("slot_full");
    }
  });

  // -------------------------------------------
  // 5. 日付欠落でバリデーションエラー
  // -------------------------------------------
  test("予約作成で日付欠落はバリデーションエラー", async ({ request }) => {
    const response = await request.post(
      "http://localhost:3000/api/reservations",
      {
        headers: {
          Cookie: `patient_id=${PATIENT_RESV}`,
          "Content-Type": "application/json",
        },
        data: {
          type: "createReservation",
          time: "14:00",
          patient_id: PATIENT_RESV,
        },
      }
    );

    // 厳密: 400 or 422
    expect([400, 422]).toContain(response.status());
  });
});
