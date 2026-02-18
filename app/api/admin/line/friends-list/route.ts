import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant } from "@/lib/tenant";

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

  const tenantId = resolveTenantId(req);

  // 並列でデータ取得（左カラム表示に必要な最小限のみ）
  // tags/fieldsは患者選択時に別APIで取得するためここでは不要
  // message_log は RPC関数で患者ごとの最新メッセージのみ取得（全件取得を廃止）
  const [intakeRes, patientsRes, marksRes, lastMsgRes] = await Promise.all([
    fetchAll(
      () => withTenant(
        supabaseAdmin.from("intake").select("patient_id").not("patient_id", "is", null).order("created_at", { ascending: false }),
        tenantId
      ),
    ),
    fetchAll(
      () => withTenant(
        supabaseAdmin.from("patients").select("patient_id, name, line_id, line_display_name, line_picture_url"),
        tenantId
      ),
    ),
    fetchAll(
      () => withTenant(
        supabaseAdmin.from("patient_marks").select("*"),
        tenantId
      ),
    ),
    // RPC: 患者ごとの最新メッセージ（4カテゴリ × 患者数 ≈ 2,500行）
    supabaseAdmin.rpc("get_friends_last_messages", {
      p_tenant_id: tenantId || null,
    }),
  ]);

  if (intakeRes.error) {
    return NextResponse.json({ error: intakeRes.error.message }, { status: 500 });
  }

  // patients テーブルから name, line_id, line_display_name, line_picture_url を取得
  const patientsMap = new Map<string, { name: string; line_id: string | null; line_display_name: string | null; line_picture_url: string | null }>();
  for (const row of patientsRes.data || []) {
    if (row.patient_id) {
      patientsMap.set(row.patient_id, {
        name: row.name || "",
        line_id: row.line_id || null,
        line_display_name: row.line_display_name || null,
        line_picture_url: row.line_picture_url || null,
      });
    }
  }

  // patientMap を patients ベースで構築
  const patientMap = new Map<string, { patient_id: string; patient_name: string; line_id: string | null; line_display_name: string | null; line_picture_url: string | null }>();

  // intake に存在する patient_id を登録
  for (const row of intakeRes.data || []) {
    if (!patientMap.has(row.patient_id)) {
      const pt = patientsMap.get(row.patient_id);
      patientMap.set(row.patient_id, {
        patient_id: row.patient_id,
        patient_name: pt?.name || "",
        line_id: pt?.line_id || null,
        line_display_name: pt?.line_display_name || null,
        line_picture_url: pt?.line_picture_url || null,
      });
    }
  }

  // マークをマッピング
  const markMap = new Map<string, string>();
  for (const row of marksRes.data || []) {
    markMap.set(row.patient_id, row.mark);
  }

  // RPC結果をカテゴリ別にマッピング
  const lastMsgMap = new Map<string, { content: string; sent_at: string }>();
  const lastTemplateMap = new Map<string, { content: string; sent_at: string }>();
  const lastEventMap = new Map<string, { content: string; sent_at: string }>();
  const lastIncomingMap = new Map<string, string>();
  const msgPatientIds = new Set<string>();

  for (const row of lastMsgRes.data || []) {
    if (!row.patient_id) continue;
    msgPatientIds.add(row.patient_id);

    switch (row.category) {
      case "incoming_any":
        lastIncomingMap.set(row.patient_id, row.sent_at);
        break;
      case "incoming_msg":
        lastMsgMap.set(row.patient_id, { content: row.content, sent_at: row.sent_at });
        break;
      case "template": {
        const name = row.content?.match(/^【.+?】/)?.[0] || row.content;
        lastTemplateMap.set(row.patient_id, { content: name, sent_at: row.sent_at });
        break;
      }
      case "event":
        lastEventMap.set(row.patient_id, { content: row.content, sent_at: row.sent_at });
        break;
    }
  }

  // intakeに存在しない患者をmessage_logから補完（intakeが消失したケース対応）
  for (const pid of msgPatientIds) {
    if (!patientMap.has(pid)) {
      const pt = patientsMap.get(pid);
      patientMap.set(pid, {
        patient_id: pid,
        patient_name: pt?.name || pid,
        line_id: pt?.line_id || null,
        line_display_name: null,
        line_picture_url: null,
      });
    }
  }

  // 統合
  const patients = Array.from(patientMap.values()).map(p => {
    const lastMsg = lastMsgMap.get(p.patient_id);
    const lastIncoming = lastIncomingMap.get(p.patient_id);
    // 最新イベントに応じた表示
    const lastEvent = lastEventMap.get(p.patient_id);
    const isBlocked = lastEvent?.content?.includes("ブロック");
    const eventDisplay = isBlocked ? "ブロックされました" : lastEvent ? "【友達追加】" : null;
    return {
      patient_id: p.patient_id,
      patient_name: p.patient_name || "",
      line_id: p.line_id,
      line_display_name: p.line_display_name || null,
      line_picture_url: p.line_picture_url || null,
      mark: markMap.get(p.patient_id) || "none",
      is_blocked: !!isBlocked,
      tags: [],
      fields: {},
      last_message: lastMsg?.content || lastTemplateMap.get(p.patient_id)?.content || eventDisplay || null,
      last_sent_at: lastIncoming || null,
      last_text_at: lastMsg?.sent_at || null,
    };
  });

  return NextResponse.json({ patients });
}
