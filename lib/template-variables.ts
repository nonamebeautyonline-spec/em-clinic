// lib/template-variables.ts — 統一テンプレート変数リゾルバー
//
// 全メッセージ送信箇所で使う変数展開関数。
// テンプレートを先にスキャンして必要なデータだけ遅延取得する。
//
// 対応変数:
//   {name}                 — 患者名
//   {patient_id}           — 患者ID
//   {send_date}            — 送信日（日本語形式）
//   {tel}                  — 電話番号
//   {line_display_name}    — LINE表示名
//   {next_reservation_date} — 次回予約日
//   {next_reservation_time} — 次回予約時間
//   {metadata.KEY}         — メタデータ任意キー
//   {#if_FIELD}...{/if_FIELD} — 条件ブロック（FIELDが存在する場合のみ表示）
//
// 使い方:
//   import { expandTemplate } from "@/lib/template-variables";
//   const text = await expandTemplate("こんにちは{name}さん", { patientId: "P001", tenantId: "..." });

import { supabaseAdmin } from "@/lib/supabase";
import { withTenant } from "@/lib/tenant";

// ---------------------------------------------------------------------------
// コンテキスト型
// ---------------------------------------------------------------------------

export interface TemplateContext {
  patientId: string;
  tenantId: string;
}

// ---------------------------------------------------------------------------
// 変数検出
// ---------------------------------------------------------------------------

/** テンプレート内の変数名を検出する */
function detectVariables(template: string): Set<string> {
  const vars = new Set<string>();
  // 通常変数: {name}, {metadata.city} 等
  const varPattern = /\{([a-zA-Z_][a-zA-Z0-9_.]*)\}/g;
  let match;
  while ((match = varPattern.exec(template)) !== null) {
    vars.add(match[1]);
  }
  // 条件ブロック: {#if_tel}...{/if_tel}
  const ifPattern = /\{#if_([a-zA-Z_][a-zA-Z0-9_.]*)\}/g;
  while ((match = ifPattern.exec(template)) !== null) {
    vars.add(match[1]);
  }
  return vars;
}

/** 変数名からどのデータソースが必要か判定する */
function classifyVars(vars: Set<string>): {
  needsPatient: boolean;
  needsReservation: boolean;
  metadataKeys: string[];
} {
  let needsPatient = false;
  let needsReservation = false;
  const metadataKeys: string[] = [];

  const patientFields = new Set(["name", "patient_id", "tel", "line_display_name"]);
  const reservationFields = new Set(["next_reservation_date", "next_reservation_time"]);

  for (const v of vars) {
    if (v === "send_date") continue; // ローカル計算
    if (patientFields.has(v)) {
      needsPatient = true;
    } else if (reservationFields.has(v)) {
      needsReservation = true;
    } else if (v.startsWith("metadata.")) {
      needsPatient = true; // metadata は patients テーブルから取得
      metadataKeys.push(v.slice("metadata.".length));
    }
  }

  return { needsPatient, needsReservation, metadataKeys };
}

// ---------------------------------------------------------------------------
// データ取得
// ---------------------------------------------------------------------------

interface PatientData {
  name: string | null;
  patient_id: string;
  tel: string | null;
  line_display_name: string | null;
  metadata: Record<string, unknown> | null;
}

interface ReservationData {
  reserved_date: string | null;
  reserved_time: string | null;
}

async function fetchPatient(
  patientId: string,
  tenantId: string,
): Promise<PatientData | null> {
  const { data } = await withTenant(
    supabaseAdmin
      .from("patients")
      .select("name, patient_id, tel, line_display_name, metadata")
      .eq("patient_id", patientId)
      .maybeSingle(),
    tenantId,
  );
  return data as PatientData | null;
}

async function fetchNextReservation(
  patientId: string,
  tenantId: string,
): Promise<ReservationData | null> {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await withTenant(
    supabaseAdmin
      .from("reservations")
      .select("reserved_date, reserved_time")
      .eq("patient_id", patientId)
      .gte("reserved_date", today)
      .not("status", "in", '("canceled","NG")')
      .order("reserved_date", { ascending: true })
      .limit(1)
      .maybeSingle(),
    tenantId,
  );
  return data as ReservationData | null;
}

// ---------------------------------------------------------------------------
// 変数展開
// ---------------------------------------------------------------------------

/**
 * テンプレート文字列の変数を展開する。
 *
 * 必要なデータだけDBから取得する（lazy fetch）。
 * 変数が見つからない場合は空文字に置換する。
 */
export async function expandTemplate(
  template: string,
  context: TemplateContext,
): Promise<string> {
  // 変数がなければそのまま返す
  if (!template.includes("{")) return template;

  const vars = detectVariables(template);
  if (vars.size === 0) return template;

  const { needsPatient, needsReservation } = classifyVars(vars);

  // 必要なデータだけ並列取得
  const [patient, reservation] = await Promise.all([
    needsPatient ? fetchPatient(context.patientId, context.tenantId) : null,
    needsReservation
      ? fetchNextReservation(context.patientId, context.tenantId)
      : null,
  ]);

  // 値マップを構築
  const values: Record<string, string> = {
    send_date: new Date().toLocaleDateString("ja-JP"),
    patient_id: context.patientId,
  };

  if (patient) {
    values.name = patient.name || "";
    values.tel = patient.tel || "";
    values.line_display_name = patient.line_display_name || "";

    // メタデータ展開
    if (patient.metadata && typeof patient.metadata === "object") {
      for (const [key, val] of Object.entries(patient.metadata)) {
        values[`metadata.${key}`] = val != null ? String(val) : "";
      }
    }
  }

  if (reservation) {
    values.next_reservation_date = reservation.reserved_date || "";
    values.next_reservation_time = reservation.reserved_time || "";
  }

  let result = template;

  // 条件ブロック展開: {#if_FIELD}内容{/if_FIELD}
  result = result.replace(
    /\{#if_([a-zA-Z_][a-zA-Z0-9_.]*)\}([\s\S]*?)\{\/if_\1\}/g,
    (_match, field: string, content: string) => {
      const val = values[field];
      return val ? content : "";
    },
  );

  // 通常変数展開: {name} → 患者名
  result = result.replace(
    /\{([a-zA-Z_][a-zA-Z0-9_.]*)\}/g,
    (_match, varName: string) => {
      return values[varName] ?? "";
    },
  );

  return result;
}
