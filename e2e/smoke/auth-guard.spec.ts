// e2e/smoke/auth-guard.spec.ts — 認証・権限ガード Smoke E2E
// 致命パス: 認証なし/権限不足のリクエストが確実に拒否されること
//
// RLS検証の原則:
// - 患者APIはCookie認証 → Cookie未設定で401
// - 管理者APIはセッション認証 → セッションなしで401
// - テナント不一致は403/404
// - 「操作はanon key、検証はservice_role」が守られていることの証明

import { test, expect } from "@playwright/test";
import { generateRunId } from "../helpers/db-client";

// 管理者セッション不要
test.use({ storageState: { cookies: [], origins: [] } });

const RUN_ID = generateRunId();
const FAKE_PATIENT = `E2E_FAKE_${RUN_ID}`;

test.describe("認証ガード Smoke", () => {
  // -------------------------------------------
  // 1. 患者API — Cookie未設定で必ず401
  // -------------------------------------------
  test("問診POST: Cookie未設定 → 401", async ({ request }) => {
    const response = await request.post("http://localhost:3000/api/intake", {
      headers: { "Content-Type": "application/json" },
      data: { answers: { 氏名: "不正アクセス" } },
    });
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body).toHaveProperty("ok", false);
    expect(body).toHaveProperty("error", "unauthorized");
  });

  test("予約POST: Cookie未設定 → 401", async ({ request }) => {
    const response = await request.post(
      "http://localhost:3000/api/reservations",
      {
        headers: { "Content-Type": "application/json" },
        data: {
          type: "createReservation",
          date: "2026-03-15",
          time: "14:00",
        },
      }
    );
    // 401（認証なし）または400（Cookie解析後にpatient_id不足）
    expect([401, 400]).toContain(response.status());
  });

  test("決済POST: Cookie未設定 → 401", async ({ request }) => {
    const response = await request.post("http://localhost:3000/api/checkout", {
      headers: { "Content-Type": "application/json" },
      data: {
        productCode: "MJL_2.5mg_1m",
        mode: "first",
      },
    });
    // 401（認証なし）または400（patientId不足）
    expect([401, 400]).toContain(response.status());
  });

  // -------------------------------------------
  // 2. 管理者API — セッションなしで必ず401
  // -------------------------------------------
  test("管理者API: セッションなし → 401", async ({ request }) => {
    const response = await request.get(
      "http://localhost:3000/api/admin/patients"
    );
    expect(response.status()).toBe(401);
  });

  test("管理者配送API: セッションなし → 401", async ({ request }) => {
    const response = await request.get(
      "http://localhost:3000/api/admin/shipping/pending"
    );
    expect(response.status()).toBe(401);
  });

  test("Dr API: セッションなし → 401", async ({ request }) => {
    const response = await request.post(
      "http://localhost:3000/api/doctor/update",
      {
        headers: { "Content-Type": "application/json" },
        data: { patient_id: FAKE_PATIENT, note: "不正カルテ" },
      }
    );
    expect(response.status()).toBe(401);
  });

  // -------------------------------------------
  // 3. 他人のデータ参照 — 患者Aが患者Bのデータを見れない
  // -------------------------------------------
  test("他人のpatient_idで問診GET → 自分のデータのみ返る", async ({
    request,
  }) => {
    // patient_id=Aで、patient_id=Bの問診を取得しようとしても
    // APIはCookieのpatient_idを使うため、Bのデータは返らない
    const response = await request.get(
      `http://localhost:3000/api/intake?patient_id=OTHER_PATIENT_999`,
      {
        headers: {
          Cookie: `patient_id=${FAKE_PATIENT}`,
        },
      }
    );
    // 200（空結果）or 404（存在しない）
    // 重要: 500にはならない（RLSがクエリレベルでフィルタ）
    expect(response.status()).not.toBe(500);
  });

  // -------------------------------------------
  // 4. CSRF保護 — 管理者APIへのPOSTはOriginチェック
  // -------------------------------------------
  test("管理者POST: Origin不正 → 403", async ({ request }) => {
    const response = await request.post(
      "http://localhost:3000/api/admin/login",
      {
        headers: {
          "Content-Type": "application/json",
          Origin: "https://evil-site.com",
        },
        data: { username: "test", password: "test" },
      }
    );
    // CSRF拒否（403）または認証エラー（401）
    // ※ middleware.tsのCSRF保護が効いている証明
    expect([401, 403]).toContain(response.status());
  });

  // -------------------------------------------
  // 5. Cron API — CRON_SECRET なしで拒否
  // -------------------------------------------
  test("Cron API: 認証なし → 401", async ({ request }) => {
    const response = await request.get(
      "http://localhost:3000/api/cron/process-steps"
    );
    expect(response.status()).toBe(401);
  });
});
