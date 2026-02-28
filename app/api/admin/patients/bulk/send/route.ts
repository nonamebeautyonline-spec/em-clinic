import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { pushMessage } from "@/lib/line-push";
import { resolveTenantId, withTenant, tenantPayload } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { bulkSendSchema } from "@/lib/validations/line-common";

// 複数患者にテンプレートメッセージを一括送信
export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);
  const parsed = await parseBody(req, bulkSendSchema);
  if ("error" in parsed) return parsed.error;
  const { patient_ids, template_id } = parsed.data;

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
  const DB_BATCH_SIZE = 200;
  const intakeMap = new Map<string, { line_id: string; patient_name: string }>();
  for (let i = 0; i < patient_ids.length; i += DB_BATCH_SIZE) {
    const batch = patient_ids.slice(i, i + DB_BATCH_SIZE);
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

  // LINE未連携を先に処理
  const noUidPids = patient_ids.filter(pid => !intakeMap.get(pid));
  const sendablePids = patient_ids.filter(pid => intakeMap.get(pid));
  noUid = noUidPids.length;

  if (noUidPids.length > 0) {
    await supabaseAdmin.from("message_log").insert(
      noUidPids.map(pid => ({
        ...tenantPayload(tenantId),
        patient_id: pid, line_uid: null, message_type: "individual",
        content: tmpl.content, status: "no_uid", direction: "outgoing",
      }))
    );
  }

  // 10件ずつ並列バッチ送信
  const BATCH_SIZE = 10;
  const todayStr = new Date().toLocaleDateString("ja-JP");
  for (let i = 0; i < sendablePids.length; i += BATCH_SIZE) {
    const batch = sendablePids.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(async (pid) => {
        const intake = intakeMap.get(pid)!;
        const text = tmpl.content
          .replace(/\{name\}/g, intake.patient_name)
          .replace(/\{patient_id\}/g, pid)
          .replace(/\{send_date\}/g, todayStr);

        let status = "failed";
        try {
          const res = await pushMessage(intake.line_id, [{ type: "text", text }], tenantId ?? undefined);
          status = res?.ok ? "sent" : "failed";
        } catch {
          // status remains "failed"
        }

        await supabaseAdmin.from("message_log").insert({
          ...tenantPayload(tenantId),
          patient_id: pid, line_uid: intake.line_id, message_type: "individual",
          content: text, status, direction: "outgoing",
        });

        return status === "sent";
      })
    );

    for (const r of results) {
      if (r.status === "fulfilled" && r.value) sent++;
      else failed++;
    }
  }

  return NextResponse.json({ ok: true, sent, failed, no_uid: noUid, total: patient_ids.length });
}
