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
  const [intakeRes, answerersRes, marksRes, lastMsgRes] = await Promise.all([
    fetchAll(
      () => supabaseAdmin.from("intake").select("patient_id, patient_name, line_id, line_display_name, line_picture_url").not("patient_id", "is", null).order("created_at", { ascending: false }),
    ),
    fetchAll(
      () => supabaseAdmin.from("answerers").select("patient_id, name, line_id"),
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

  // answerers情報をマッピング（名前・LINE IDのフォールバック用）
  const answererMap = new Map<string, { name: string; line_id: string | null }>();
  for (const row of answerersRes.data || []) {
    if (row.patient_id) {
      answererMap.set(row.patient_id, { name: row.name || "", line_id: row.line_id || null });
    }
  }

  // patient_idでユニーク化（最新レコード優先）
  const patientMap = new Map<string, { patient_id: string; patient_name: string; line_id: string | null; line_display_name: string | null; line_picture_url: string | null }>();
  for (const row of intakeRes.data || []) {
    if (!patientMap.has(row.patient_id)) {
      // answerers の情報でフォールバック
      const answerer = answererMap.get(row.patient_id);
      patientMap.set(row.patient_id, {
        ...row,
        patient_name: row.patient_name || answerer?.name || "",
        line_id: row.line_id || answerer?.line_id || null,
      });
    }
  }

  // intakeに存在しない患者をmessage_logから補完（intakeが消失したケース対応）
  const msgPatientIds = new Set<string>();
  for (const row of lastMsgRes.data || []) {
    if (row.patient_id && !patientMap.has(row.patient_id)) {
      msgPatientIds.add(row.patient_id);
    }
  }
  if (msgPatientIds.size > 0) {
    for (const pid of msgPatientIds) {
      const answerer = answererMap.get(pid);
      patientMap.set(pid, {
        patient_id: pid,
        patient_name: answerer?.name || pid,
        line_id: answerer?.line_id || null,
        line_display_name: null,
        line_picture_url: null,
      });
    }
  }

  // マークをマッピング
  const markMap = new Map<string, string>();
  for (const row of marksRes.data || []) {
    markMap.set(row.patient_id, row.mark);
  }

  // 最新メッセージをマッピング
  const lastMessages = lastMsgRes.data || [];

  // 左カラム表示用: 顧客メッセージ > テンプレ名 > フォロー/ブロック
  const lastMsgMap = new Map<string, { content: string; sent_at: string }>();
  const lastTemplateMap = new Map<string, { content: string; sent_at: string }>();
  const lastEventMap = new Map<string, { content: string; sent_at: string }>();
  const lastIncomingMap = new Map<string, string>();
  for (const row of lastMessages || []) {
    if (!row.patient_id) continue;
    // ソート用: 顧客からのメッセージ・アクション（incoming）の最新時刻のみ
    if (!lastIncomingMap.has(row.patient_id) && row.direction !== "outgoing") {
      lastIncomingMap.set(row.patient_id, row.sent_at);
    }
    // 表示用①: 顧客が送信したメッセージ（incoming かつ イベント以外）
    if (!lastMsgMap.has(row.patient_id) && row.direction === "incoming" && row.message_type !== "event") {
      lastMsgMap.set(row.patient_id, { content: row.content, sent_at: row.sent_at });
    }
    // 表示用②: 送信テンプレ名（outgoing の【テンプレ名】形式）
    if (!lastTemplateMap.has(row.patient_id) && row.direction === "outgoing" && /^【.+?】/.test(row.content || "")) {
      const name = row.content.match(/^【.+?】/)?.[0] || row.content;
      lastTemplateMap.set(row.patient_id, { content: name, sent_at: row.sent_at });
    }
    // 表示用③: フォロー/ブロックイベントのみ（systemイベントは除外）
    if (!lastEventMap.has(row.patient_id) && row.direction === "incoming" && row.message_type === "event" && row.event_type !== "system") {
      lastEventMap.set(row.patient_id, { content: row.content, sent_at: row.sent_at });
    }
  }

  // 統合
  const patients = Array.from(patientMap.values()).map(p => {
    const lastMsg = lastMsgMap.get(p.patient_id);
    const lastIncoming = lastIncomingMap.get(p.patient_id);
    // 友達追加イベントは【友達追加】と表示
    const lastEvent = lastEventMap.get(p.patient_id);
    const eventDisplay = lastEvent ? "【友達追加】" : null;
    return {
      patient_id: p.patient_id,
      patient_name: p.patient_name || "",
      line_id: p.line_id,
      line_display_name: p.line_display_name || null,
      line_picture_url: p.line_picture_url || null,
      mark: markMap.get(p.patient_id) || "none",
      tags: [],
      fields: {},
      last_message: lastMsg?.content || lastTemplateMap.get(p.patient_id)?.content || eventDisplay || null,
      last_sent_at: lastIncoming || null,
      last_text_at: lastMsg?.sent_at || null,
    };
  });

  return NextResponse.json({ patients });
}
