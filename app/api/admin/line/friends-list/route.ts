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
  // friend_summaries: メッセージINSERT時にDBトリガーで自動更新される事前集計テーブル
  const [intakeRes, patientsRes, marksRes, summariesRes] = await Promise.all([
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
    // friend_summaries: 事前集計テーブルから直接SELECT（旧: RPC 4回フルスキャン）
    withTenant(
      supabaseAdmin.from("friend_summaries").select("*"),
      tenantId
    ),
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

  // friend_summaries をマッピング
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const summaryMap = new Map<string, any>();
  const summaryPatientIds = new Set<string>();
  for (const row of summariesRes.data || []) {
    if (!row.patient_id) continue;
    summaryPatientIds.add(row.patient_id);
    summaryMap.set(row.patient_id, row);
  }

  // intakeに存在しない患者をfriend_summariesから補完（intakeが消失したケース対応）
  for (const pid of summaryPatientIds) {
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
    const s = summaryMap.get(p.patient_id);
    // 最新イベントに応じた表示（event_typeで正確に判定）
    const isBlocked = s?.last_event_type === "unfollow";
    const eventDisplay = isBlocked ? "ブロックされました"
      : s?.last_event_content?.includes("再追加") ? "友だち再登録"
      : s?.last_event_content ? "【友達追加】" : null;
    const tplName = s?.last_template_content?.match(/^【.+?】/)?.[0] || s?.last_template_content;
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
      last_message: s?.last_msg_content || tplName || eventDisplay || null,
      last_sent_at: s?.last_incoming_at || null,
      last_text_at: s?.last_msg_at || null,
    };
  });

  return NextResponse.json({ patients });
}
