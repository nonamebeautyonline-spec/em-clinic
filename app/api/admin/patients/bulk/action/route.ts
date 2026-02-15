import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { pushMessage } from "@/lib/line-push";
import { resolveTenantId, withTenant, tenantPayload } from "@/lib/tenant";

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

  const tenantId = resolveTenantId(req);
  const { patient_ids, action_id } = await req.json();

  if (!Array.isArray(patient_ids) || patient_ids.length === 0 || !action_id) {
    return NextResponse.json({ error: "patient_ids と action_id は必須です" }, { status: 400 });
  }

  // アクション取得
  const { data: action } = await withTenant(
    supabaseAdmin
      .from("actions")
      .select("*")
      .eq("id", action_id)
      .single(),
    tenantId
  );

  if (!action) {
    return NextResponse.json({ error: "アクションが見つかりません" }, { status: 404 });
  }

  const steps = action.steps as ActionStep[];

  // テンプレートを事前に一括取得
  const templateIds = steps.filter(s => s.type === "send_template" && s.template_id).map(s => s.template_id!);
  const templateMap = new Map<number, string>();
  if (templateIds.length > 0) {
    const { data: tmpls } = await withTenant(
      supabaseAdmin
        .from("message_templates")
        .select("id, content")
        .in("id", templateIds),
      tenantId
    );
    for (const t of tmpls || []) templateMap.set(t.id, t.content);
  }

  // 患者のLINE UID + 名前をpatientsテーブルから一括取得（バッチ処理）
  const BATCH_SIZE = 200;
  const intakeMap = new Map<string, { line_id: string | null; patient_name: string }>();
  for (let i = 0; i < patient_ids.length; i += BATCH_SIZE) {
    const batch = patient_ids.slice(i, i + BATCH_SIZE);
    const { data: pData } = await withTenant(
      supabaseAdmin
        .from("patients")
        .select("patient_id, line_id, name")
        .in("patient_id", batch),
      tenantId
    );
    for (const row of pData || []) {
      intakeMap.set(row.patient_id, { line_id: row.line_id, patient_name: row.name || "" });
    }
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
                ...tenantPayload(tenantId),
                patient_id: pid, line_uid: null, message_type: "individual",
                content: text, status: "no_uid", direction: "outgoing",
              });
              allStepsOk = false;
              break;
            }

            const res = await pushMessage(lineUid, [{ type: "text", text }], tenantId ?? undefined);
            const status = res?.ok ? "sent" : "failed";
            await supabaseAdmin.from("message_log").insert({
              ...tenantPayload(tenantId),
              patient_id: pid, line_uid: lineUid, message_type: "individual",
              content: text, status, direction: "outgoing",
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
                ...tenantPayload(tenantId),
                patient_id: pid, line_uid: null, message_type: "individual",
                content: text, status: "no_uid", direction: "outgoing",
              });
              allStepsOk = false;
              break;
            }

            const res = await pushMessage(lineUid, [{ type: "text", text }], tenantId ?? undefined);
            const status = res?.ok ? "sent" : "failed";
            await supabaseAdmin.from("message_log").insert({
              ...tenantPayload(tenantId),
              patient_id: pid, line_uid: lineUid, message_type: "individual",
              content: text, status, direction: "outgoing",
            });
            if (!res?.ok) allStepsOk = false;
            break;
          }

          case "tag_add": {
            if (!step.tag_id) break;
            const { error } = await supabaseAdmin
              .from("patient_tags")
              .upsert({ ...tenantPayload(tenantId), patient_id: pid, tag_id: step.tag_id, assigned_by: "action" }, { onConflict: "patient_id,tag_id" });
            if (error) allStepsOk = false;
            break;
          }

          case "tag_remove": {
            if (!step.tag_id) break;
            const { error } = await withTenant(
              supabaseAdmin
                .from("patient_tags")
                .delete()
                .eq("patient_id", pid)
                .eq("tag_id", step.tag_id),
              tenantId
            );
            if (error) allStepsOk = false;
            break;
          }

          case "mark_change": {
            if (!step.mark) break;
            const { error } = await supabaseAdmin
              .from("patient_marks")
              .upsert({
                ...tenantPayload(tenantId),
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

    // システムイベントログを記録
    const actionDetails: string[] = [];
    for (const step of steps) {
      switch (step.type) {
        case "send_text":
          if (step.content) actionDetails.push(`テキスト送信`);
          break;
        case "send_template":
          actionDetails.push(`テンプレート送信`);
          break;
        case "tag_add":
          if (step.tag_id) {
            const { data: t } = await withTenant(supabaseAdmin.from("tag_definitions").select("name").eq("id", step.tag_id).maybeSingle(), tenantId);
            actionDetails.push(`タグ[${t?.name || step.tag_id}]を追加`);
          }
          break;
        case "tag_remove":
          if (step.tag_id) {
            const { data: t } = await withTenant(supabaseAdmin.from("tag_definitions").select("name").eq("id", step.tag_id).maybeSingle(), tenantId);
            actionDetails.push(`タグ[${t?.name || step.tag_id}]を解除`);
          }
          break;
        case "mark_change":
          if (step.mark) actionDetails.push(`対応マークを[${step.mark}]に更新`);
          break;
      }
    }
    if (actionDetails.length > 0) {
      await supabaseAdmin.from("message_log").insert({
        ...tenantPayload(tenantId),
        patient_id: pid,
        line_uid: lineUid || null,
        event_type: "system",
        message_type: "event",
        content: `手動一括実行によりアクション[${action.name}]が実行され、\n${actionDetails.join("\n")}\nが起こりました`,
        status: "received",
        direction: "incoming",
      });
    }
  }

  return NextResponse.json({ ok: true, success: successCount, failed: failCount, total: patient_ids.length });
}
