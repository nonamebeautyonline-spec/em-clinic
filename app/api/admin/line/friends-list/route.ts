import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";

// Supabase Pro: max_rows=5000 に設定済み
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchAll(buildQuery: () => any, pageSize = 5000) {
  const all: any[] = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await buildQuery().range(offset, offset + pageSize - 1);
    if (error) return { data: all, error };
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < pageSize) break;
    offset += pageSize;
  }
  return { data: all, error: null };
}

// 友達一覧（タグ・マーク・友達情報を統合して返す）
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 並列でデータ取得（左カラム表示に必要な最小限のみ）
  // tags/fieldsは患者選択時に別APIで取得するためここでは不要
  const [intakeRes, marksRes, lastMsgRes] = await Promise.all([
    fetchAll(
      () => supabaseAdmin.from("intake").select("patient_id, patient_name, line_id, line_display_name, line_picture_url").not("patient_id", "is", null).order("created_at", { ascending: false }),
    ),
    fetchAll(
      () => supabaseAdmin.from("patient_marks").select("*"),
    ),
    fetchAll(
      () => supabaseAdmin.from("message_log").select("patient_id, content, sent_at, message_type, event_type, direction").order("sent_at", { ascending: false }),
    ),
  ]);

  if (intakeRes.error) {
    return NextResponse.json({ error: intakeRes.error.message }, { status: 500 });
  }

  // patient_idでユニーク化（最新レコード優先）
  const patientMap = new Map<string, { patient_id: string; patient_name: string; line_id: string | null; line_display_name: string | null; line_picture_url: string | null }>();
  for (const row of intakeRes.data || []) {
    if (!patientMap.has(row.patient_id)) {
      patientMap.set(row.patient_id, row);
    }
  }

  // マークをマッピング
  const markMap = new Map<string, string>();
  for (const row of marksRes.data || []) {
    markMap.set(row.patient_id, row.mark);
  }

  // 最新メッセージをマッピング
  const lastMessages = lastMsgRes.data || [];

  const lastMsgMap = new Map<string, { content: string; sent_at: string }>();
  const lastIncomingMap = new Map<string, string>();
  for (const row of lastMessages || []) {
    if (!row.patient_id) continue;
    // ソート用: 顧客からのメッセージ・アクション（incoming）の最新時刻のみ
    // 管理側からの送信（outgoing）は表示順に影響させない
    if (!lastIncomingMap.has(row.patient_id) && row.direction !== "outgoing") {
      lastIncomingMap.set(row.patient_id, row.sent_at);
    }
    // 表示用: イベント以外の最新メッセージ
    if (!lastMsgMap.has(row.patient_id) && row.message_type !== "event" && row.event_type !== "system") {
      lastMsgMap.set(row.patient_id, { content: row.content, sent_at: row.sent_at });
    }
  }

  // 統合
  const patients = Array.from(patientMap.values()).map(p => {
    const lastMsg = lastMsgMap.get(p.patient_id);
    const lastIncoming = lastIncomingMap.get(p.patient_id);
    return {
      patient_id: p.patient_id,
      patient_name: p.patient_name || "",
      line_id: p.line_id,
      line_display_name: p.line_display_name || null,
      line_picture_url: p.line_picture_url || null,
      mark: markMap.get(p.patient_id) || "none",
      tags: [],
      fields: {},
      last_message: lastMsg?.content || null,
      last_sent_at: lastIncoming || null,
    };
  });

  return NextResponse.json({ patients });
}
