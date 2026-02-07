import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { pushMessage } from "@/lib/line-push";

interface ActionStep {
  type: "send_text" | "send_template" | "tag_add" | "tag_remove" | "mark_change";
  content?: string;
  template_id?: number;
  tag_id?: number;
  mark?: string;
  note?: string;
}

// 複数患者にアクションを一括実行
export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { patient_ids, action_id } = await req.json();

  if (!Array.isArray(patient_ids) || patient_ids.length === 0 || !action_id) {
    return NextResponse.json({ error: "patient_ids と action_id は必須です" }, { status: 400 });
  }

  // アクション取得
  const { data: action } = await supabaseAdmin
    .from("actions")
    .select("*")
    .eq("id", action_id)
    .single();

  if (!action) {
    return NextResponse.json({ error: "アクションが見つかりません" }, { status: 404 });
  }

  const steps = action.steps as ActionStep[];

  // テンプレートを事前に一括取得
  const templateIds = steps.filter(s => s.type === "send_template" && s.template_id).map(s => s.template_id!);
  const templateMap = new Map<number, string>();
  if (templateIds.length > 0) {
    const { data: tmpls } = await supabaseAdmin
      .from("message_templates")
      .select("id, content")
      .in("id", templateIds);
    for (const t of tmpls || []) templateMap.set(t.id, t.content);
  }

  // 患者のLINE UID + 名前を一括取得
  const { data: intakes } = await supabaseAdmin
    .from("intake")
    .select("patient_id, line_id, patient_name")
    .in("patient_id", patient_ids);

  const intakeMap = new Map<string, { line_id: string | null; patient_name: string }>();
  for (const row of intakes || []) {
    intakeMap.set(row.patient_id, { line_id: row.line_id, patient_name: row.patient_name || "" });
  }

  let successCount = 0;
  let failCount = 0;

  for (const pid of patient_ids) {
    const intake = intakeMap.get(pid);
    const lineUid = intake?.line_id || null;
    const patientName = intake?.patient_name || "";
    let allStepsOk = true;

    for (const step of steps) {
      try {
        switch (step.type) {
          case "send_text": {
            if (!step.content) break;
            const text = step.content
              .replace(/\{name\}/g, patientName)
              .replace(/\{patient_id\}/g, pid);

            if (!lineUid) {
              await supabaseAdmin.from("message_log").insert({
                patient_id: pid, line_uid: null, message_type: "individual",
                content: text, status: "no_uid",
              });
              allStepsOk = false;
              break;
            }

            const res = await pushMessage(lineUid, [{ type: "text", text }]);
            const status = res?.ok ? "sent" : "failed";
            await supabaseAdmin.from("message_log").insert({
              patient_id: pid, line_uid: lineUid, message_type: "individual",
              content: text, status,
            });
            if (!res?.ok) allStepsOk = false;
            break;
          }

          case "send_template": {
            const tmplContent = step.template_id ? templateMap.get(step.template_id) : null;
            if (!tmplContent) { allStepsOk = false; break; }

            const text = tmplContent
              .replace(/\{name\}/g, patientName)
              .replace(/\{patient_id\}/g, pid);

            if (!lineUid) {
              await supabaseAdmin.from("message_log").insert({
                patient_id: pid, line_uid: null, message_type: "individual",
                content: text, status: "no_uid",
              });
              allStepsOk = false;
              break;
            }

            const res = await pushMessage(lineUid, [{ type: "text", text }]);
            const status = res?.ok ? "sent" : "failed";
            await supabaseAdmin.from("message_log").insert({
              patient_id: pid, line_uid: lineUid, message_type: "individual",
              content: text, status,
            });
            if (!res?.ok) allStepsOk = false;
            break;
          }

          case "tag_add": {
            if (!step.tag_id) break;
            const { error } = await supabaseAdmin
              .from("patient_tags")
              .upsert({ patient_id: pid, tag_id: step.tag_id, assigned_by: "action" }, { onConflict: "patient_id,tag_id" });
            if (error) allStepsOk = false;
            break;
          }

          case "tag_remove": {
            if (!step.tag_id) break;
            const { error } = await supabaseAdmin
              .from("patient_tags")
              .delete()
              .eq("patient_id", pid)
              .eq("tag_id", step.tag_id);
            if (error) allStepsOk = false;
            break;
          }

          case "mark_change": {
            if (!step.mark) break;
            const { error } = await supabaseAdmin
              .from("patient_marks")
              .upsert({
                patient_id: pid,
                mark: step.mark,
                note: step.note || null,
                updated_by: "action",
                updated_at: new Date().toISOString(),
              }, { onConflict: "patient_id" });
            if (error) allStepsOk = false;
            break;
          }
        }
      } catch {
        allStepsOk = false;
      }
    }

    if (allStepsOk) successCount++;
    else failCount++;
  }

  return NextResponse.json({ ok: true, success: successCount, failed: failCount, total: patient_ids.length });
}
