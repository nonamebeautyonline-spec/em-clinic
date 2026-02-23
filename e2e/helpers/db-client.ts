// e2e/helpers/db-client.ts — E2Eテスト用DB検証クライアント
// テスト用Supabase接続が設定されている場合のみDB検証を実行
// 未設定の場合は全てのDB検証をスキップ（APIレベルテストのみ）

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

let _client: SupabaseClient | null = null;

/**
 * テスト実行ごとのユニークID生成
 * UUID v4 の先頭8文字を使用（CI並行実行でも衝突しない）
 * タイムスタンプと異なり、他の実行と完全に独立
 */
export function generateRunId(): string {
  return randomUUID().slice(0, 8);
}

/** テスト用Supabaseクライアントを取得（未設定ならnull） */
export function getTestDbClient(): SupabaseClient | null {
  if (_client) return _client;

  const url = process.env.E2E_SUPABASE_URL;
  const key = process.env.E2E_SUPABASE_SERVICE_KEY;

  if (!url || !key) return null;

  _client = createClient(url, key);
  return _client;
}

/** DB検証が可能か */
export function canVerifyDb(): boolean {
  return !!process.env.E2E_SUPABASE_URL && !!process.env.E2E_SUPABASE_SERVICE_KEY;
}

/** テナントID（設定されている場合） */
export function getTestTenantId(): string | undefined {
  return process.env.E2E_TENANT_ID || undefined;
}

// ========================================
// テストデータ Seed / Cleanup
// ========================================

/** テスト用患者データを作成 */
export async function seedTestPatient(patientId: string, opts?: {
  name?: string;
  tel?: string;
  lineId?: string;
  tenantId?: string;
}) {
  const db = getTestDbClient();
  if (!db) return null;

  const tenantId = opts?.tenantId || getTestTenantId();
  const payload: Record<string, unknown> = {
    patient_id: patientId,
    name: opts?.name || "E2Eテスト患者",
    tel: opts?.tel || "09000000000",
    line_id: opts?.lineId || `U_E2E_${patientId}`,
  };
  if (tenantId) payload.tenant_id = tenantId;

  const { data, error } = await db
    .from("patients")
    .upsert(payload, { onConflict: "patient_id" })
    .select()
    .single();

  if (error) console.error("[e2e/seed] patients insert error:", error);
  return data;
}

/** テスト用問診データを作成 */
export async function seedTestIntake(patientId: string, opts?: {
  answers?: Record<string, unknown>;
  tenantId?: string;
}) {
  const db = getTestDbClient();
  if (!db) return null;

  const tenantId = opts?.tenantId || getTestTenantId();

  // 既存レコードを確認
  let builder = db
    .from("intake")
    .select("id")
    .eq("patient_id", patientId);

  if (tenantId) builder = builder.eq("tenant_id", tenantId);

  const { data: existing } = await builder
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const intakePayload: Record<string, unknown> = {
    patient_id: patientId,
    answers: opts?.answers || {
      氏名: "E2Eテスト患者",
      カナ: "イーツーイーテストカンジャ",
      性別: "男性",
      生年月日: "1990-01-01",
      電話番号: "09000000000",
      ng_check: "問題なし",
    },
  };
  if (tenantId) intakePayload.tenant_id = tenantId;

  if (existing) {
    const { error } = await db
      .from("intake")
      .update(intakePayload)
      .eq("id", existing.id);
    if (error) console.error("[e2e/seed] intake update error:", error);
    return existing;
  } else {
    const { data, error } = await db
      .from("intake")
      .insert(intakePayload)
      .select()
      .single();
    if (error) console.error("[e2e/seed] intake insert error:", error);
    return data;
  }
}

/** テストデータをクリーンアップ（E2Eプレフィックス付きのデータを削除） */
export async function cleanupTestData(patientIdPrefix = "E2E_") {
  const db = getTestDbClient();
  if (!db) return;

  // 逆依存順で削除
  const tables = [
    "webhook_events",
    "orders",
    "reorders",
    "reservations",
    "intake",
    "patients",
  ];

  for (const table of tables) {
    const column = table === "webhook_events" ? "event_id" : "patient_id";
    const { error } = await db
      .from(table)
      .delete()
      .like(column, `${patientIdPrefix}%`);

    if (error) {
      console.warn(`[e2e/cleanup] ${table} cleanup warning:`, error.message);
    }
  }
}

// ========================================
// DB アサーション ヘルパー
// ========================================

/** 患者レコードが存在するか確認 */
export async function assertPatientExists(patientId: string) {
  const db = getTestDbClient();
  if (!db) return null;

  const { data } = await db
    .from("patients")
    .select("patient_id, name, tel, line_id")
    .eq("patient_id", patientId)
    .maybeSingle();

  return data;
}

/** 問診レコードを取得 */
export async function getIntakeRecord(patientId: string) {
  const db = getTestDbClient();
  if (!db) return null;

  const { data } = await db
    .from("intake")
    .select("id, patient_id, answers, reserve_id, status")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data;
}

/** 予約レコードを取得 */
export async function getReservationRecord(reserveId: string) {
  const db = getTestDbClient();
  if (!db) return null;

  const { data } = await db
    .from("reservations")
    .select("reserve_id, patient_id, reserved_date, reserved_time, status")
    .eq("reserve_id", reserveId)
    .maybeSingle();

  return data;
}

/** 注文レコードを取得 */
export async function getOrderRecord(orderId: string) {
  const db = getTestDbClient();
  if (!db) return null;

  const { data } = await db
    .from("orders")
    .select("id, patient_id, payment_status, shipping_status, amount")
    .eq("id", orderId)
    .maybeSingle();

  return data;
}

/** webhook_events で冪等チェック */
export async function getWebhookEvent(source: string, eventId: string) {
  const db = getTestDbClient();
  if (!db) return null;

  const { data } = await db
    .from("webhook_events")
    .select("id, event_source, event_id, status")
    .eq("event_source", source)
    .eq("event_id", eventId)
    .maybeSingle();

  return data;
}
