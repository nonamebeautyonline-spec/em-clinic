import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { pushMessage } from "@/lib/line-push";
import { resolveTenantId, withTenant, tenantPayload } from "@/lib/tenant";

// 複数患者にテンプレートメッセージを一括送信
export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);
  const { patient_ids, template_id } = await req.json();

  if (!Array.isArray(patient_ids) || patient_ids.length === 0 || !template_id) {
    return NextResponse.json({ error: "patient_ids と template_id は必須です" }, { status: 400 });
  }

  // テンプレート取得
  const { data: tmpl } = await withTenant(
    supabaseAdmin
      .from("message_templates")
      .select("id, name, content")
      .eq("id", template_id)
      .single(),
    tenantId
  );

  if (!tmpl) {
    return NextResponse.json({ error: "テンプレートが見つかりません" }, { status: 404 });
  }

  // 患者のLINE UID + 名前をpatientsテーブルから取得（バッチ処理）
  const BATCH_SIZE = 200;
  const intakeMap = new Map<string, { line_id: string; patient_name: string }>();
  for (let i = 0; i < patient_ids.length; i += BATCH_SIZE) {
    const batch = patient_ids.slice(i, i + BATCH_SIZE);
    const { data: pData } = await withTenant(
      supabaseAdmin
        .from("patients")
        .select("patient_id, line_id, name")
        .in("patient_id", batch)
        .not("line_id", "is", null),
      tenantId
    );
    for (const row of pData || []) {
      if (row.line_id) {
        intakeMap.set(row.patient_id, { line_id: row.line_id, patient_name: row.name || "" });
      }
    }
  }

  let sent = 0;
  let failed = 0;
  let noUid = 0;

  // 変数置換が必要なので1件ずつ送信
  for (const pid of patient_ids) {
    const intake = intakeMap.get(pid);
    if (!intake) {
      noUid++;
      await supabaseAdmin.from("message_log").insert({
        ...tenantPayload(tenantId),
        patient_id: pid, line_uid: null, message_type: "individual",
        content: tmpl.content, status: "no_uid", direction: "outgoing",
      });
      continue;
    }

    const text = tmpl.content
      .replace(/\{name\}/g, intake.patient_name)
      .replace(/\{patient_id\}/g, pid)
      .replace(/\{send_date\}/g, new Date().toLocaleDateString("ja-JP"));

    const res = await pushMessage(intake.line_id, [{ type: "text", text }], tenantId ?? undefined);
    const status = res?.ok ? "sent" : "failed";

    await supabaseAdmin.from("message_log").insert({
      ...tenantPayload(tenantId),
      patient_id: pid, line_uid: intake.line_id, message_type: "individual",
      content: text, status, direction: "outgoing",
    });

    if (status === "sent") sent++;
    else failed++;
  }

  return NextResponse.json({ ok: true, sent, failed, no_uid: noUid, total: patient_ids.length });
}
