// e2e/smoke/intake.spec.ts — 問診ドメイン Smoke E2E
// 致命パス: intake テーブルへの書き込みが壊れたら即死
//
// 決定論的テスト:
// - 各テストは厳密に1つのステータスコードのみ期待
// - 500は常にバグ扱い（許容しない）
// - DB検証が可能な環境では、テーブルの状態もアサート

import { test, expect } from "@playwright/test";
import { PatientApiClient } from "../helpers/api-client";
import {
  canVerifyDb,
  cleanupTestData,
  getIntakeRecord,
  generateRunId,
} from "../helpers/db-client";

// 管理者セッション不要
test.use({ storageState: { cookies: [], origins: [] } });

// テスト用定数（UUID v4 でユニーク化 — CI並行実行でも衝突しない）
const RUN_ID = generateRunId();
const PATIENT_INTAKE = `E2E_INT_${RUN_ID}`;

// 問診データ
const INTAKE_ANSWERS = {
  氏名: "E2Eテスト太郎",
  カナ: "イーツーイーテストタロウ",
  性別: "男性",
  生年月日: "1990-01-15",
  電話番号: "09012345678",
  メールアドレス: "e2e-test@example.com",
  ng_check: "問題なし",
  身長: "170",
  体重: "65",
  服用中の薬: "なし",
  既往歴: "なし",
  アレルギー: "なし",
  希望薬剤: "マンジャロ 2.5mg",
};

test.afterAll(async () => {
  await cleanupTestData(`E2E_INT_${RUN_ID}`);
});

test.describe("問診ドメイン Smoke", () => {
  // -------------------------------------------
  // 1. 問診保存 — 最重要パス
  // -------------------------------------------
  test("問診を保存して200を返す", async ({ request }) => {
    const client = new PatientApiClient(request, PATIENT_INTAKE);

    const response = await client.submitIntake({
      answers: INTAKE_ANSWERS,
      name: INTAKE_ANSWERS.氏名,
      name_kana: INTAKE_ANSWERS.カナ,
      sex: INTAKE_ANSWERS.性別,
      birth: INTAKE_ANSWERS.生年月日,
      tel: INTAKE_ANSWERS.電話番号,
      email: INTAKE_ANSWERS.メールアドレス,
    });

    // 厳密: 200のみ
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty("ok", true);

    // DB検証
    if (canVerifyDb()) {
      const intake = await getIntakeRecord(PATIENT_INTAKE);
      expect(intake).not.toBeNull();
      expect(intake!.answers).toHaveProperty("氏名", "E2Eテスト太郎");
      expect(intake!.answers).toHaveProperty("ng_check", "問題なし");
    }
  });

  // -------------------------------------------
  // 2. 認証なしは必ず401
  // -------------------------------------------
  test("Cookie未設定の問診保存は401エラー", async ({ request }) => {
    const response = await request.post("http://localhost:3000/api/intake", {
      headers: { "Content-Type": "application/json" },
      data: { answers: { 氏名: "未認証ユーザー" } },
    });

    // 厳密: 401のみ
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body).toHaveProperty("ok", false);
    expect(body).toHaveProperty("error", "unauthorized");
  });

  // -------------------------------------------
  // 3. 問診の冪等性（同一患者で2回保存しても壊れない）
  // -------------------------------------------
  test("同一患者の問診を2回保存しても正常", async ({ request }) => {
    const client = new PatientApiClient(request, PATIENT_INTAKE);

    // 1回目
    const res1 = await client.submitIntake({
      answers: { ...INTAKE_ANSWERS, 備考: "1回目" },
      name: INTAKE_ANSWERS.氏名,
      tel: INTAKE_ANSWERS.電話番号,
    });
    expect(res1.status()).toBe(200);

    // 2回目（更新）
    const res2 = await client.submitIntake({
      answers: { ...INTAKE_ANSWERS, 備考: "2回目" },
      name: INTAKE_ANSWERS.氏名,
      tel: INTAKE_ANSWERS.電話番号,
    });
    expect(res2.status()).toBe(200);

    // DB検証: 最新の回答が保存されている
    if (canVerifyDb()) {
      const intake = await getIntakeRecord(PATIENT_INTAKE);
      expect(intake).not.toBeNull();
      expect(intake!.answers).toHaveProperty("備考", "2回目");
    }
  });
});
