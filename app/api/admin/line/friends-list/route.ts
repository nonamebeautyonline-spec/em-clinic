import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";

// 友達一覧（タグ・マーク・友達情報を統合して返す）
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 並列でデータ取得
  const [intakeRes, tagsRes, marksRes, fieldDefsRes, fieldValsRes] = await Promise.all([
    supabaseAdmin
      .from("intake")
      .select("patient_id, patient_name, line_id")
      .not("patient_id", "is", null)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("patient_tags")
      .select("patient_id, tag_id, tag_definitions(id, name, color)"),
    supabaseAdmin
      .from("patient_marks")
      .select("*"),
    supabaseAdmin
      .from("friend_field_definitions")
      .select("*")
      .order("sort_order", { ascending: true }),
    supabaseAdmin
      .from("friend_field_values")
      .select("patient_id, field_id, value, friend_field_definitions(name)"),
  ]);

  if (intakeRes.error) {
    return NextResponse.json({ error: intakeRes.error.message }, { status: 500 });
  }

  // patient_idでユニーク化（最新レコード優先）
  const patientMap = new Map<string, { patient_id: string; patient_name: string; line_id: string | null }>();
  for (const row of intakeRes.data || []) {
    if (!patientMap.has(row.patient_id)) {
      patientMap.set(row.patient_id, row);
    }
  }

  // タグをマッピング
  const tagMap = new Map<string, { id: number; name: string; color: string }[]>();
  for (const row of tagsRes.data || []) {
    const td = row.tag_definitions as any;
    if (!td) continue;
    if (!tagMap.has(row.patient_id)) tagMap.set(row.patient_id, []);
    tagMap.get(row.patient_id)!.push({ id: td.id, name: td.name, color: td.color });
  }

  // マークをマッピング
  const markMap = new Map<string, string>();
  for (const row of marksRes.data || []) {
    markMap.set(row.patient_id, row.mark);
  }

  // フィールド値をマッピング
  const fieldValMap = new Map<string, Record<string, string>>();
  for (const row of fieldValsRes.data || []) {
    const fd = row.friend_field_definitions as any;
    if (!fd) continue;
    if (!fieldValMap.has(row.patient_id)) fieldValMap.set(row.patient_id, {});
    fieldValMap.get(row.patient_id)![fd.name] = row.value || "";
  }

  // 最新メッセージを取得（各患者の直近1件）
  const { data: lastMessages } = await supabaseAdmin
    .from("message_log")
    .select("patient_id, content, sent_at")
    .order("sent_at", { ascending: false });

  const lastMsgMap = new Map<string, { content: string; sent_at: string }>();
  for (const row of lastMessages || []) {
    if (row.patient_id && !lastMsgMap.has(row.patient_id)) {
      lastMsgMap.set(row.patient_id, { content: row.content, sent_at: row.sent_at });
    }
  }

  // 統合
  const patients = Array.from(patientMap.values()).map(p => {
    const lastMsg = lastMsgMap.get(p.patient_id);
    return {
      patient_id: p.patient_id,
      patient_name: p.patient_name || "",
      line_id: p.line_id,
      mark: markMap.get(p.patient_id) || "none",
      tags: tagMap.get(p.patient_id) || [],
      fields: fieldValMap.get(p.patient_id) || {},
      last_message: lastMsg?.content || null,
      last_sent_at: lastMsg?.sent_at || null,
    };
  });

  return NextResponse.json({ patients });
}
