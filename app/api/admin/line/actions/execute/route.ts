import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";

interface ActionStep {
  type: "send_text" | "send_template" | "tag_add" | "tag_remove" | "mark_change";
  content?: string;
  template_id?: number;
  tag_id?: number;
  mark?: string;
  note?: string;
}

// アクション実行
export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { action_id, patient_id } = await req.json();
  if (!action_id) return NextResponse.json({ error: "アクションIDは必須です" }, { status: 400 });
  if (!patient_id) return NextResponse.json({ error: "患者IDは必須です" }, { status: 400 });

  // アクション取得
  const { data: action, error: actionError } = await supabaseAdmin
    .from("actions")
    .select("*")
    .eq("id", action_id)
    .single();

  if (actionError || !action) {
    return NextResponse.json({ error: "アクションが見つかりません" }, { status: 404 });
  }

  const steps = action.steps as ActionStep[];
  const results: { step: number; type: string; success: boolean; detail?: string }[] = [];

  // 患者のLINE UIDを取得（テキスト送信用）
  const { data: intakeData } = await supabaseAdmin
    .from("intake")
    .select("line_id, patient_name")
    .eq("patient_id", patient_id)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  const lineUid = intakeData?.line_id;
  const patientName = intakeData?.patient_name || "";

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    try {
      switch (step.type) {
        case "send_text": {
          if (!step.content) {
            results.push({ step: i, type: step.type, success: false, detail: "テキストが空です" });
            break;
          }
          // 変数置換
          const text = step.content
            .replace(/\{name\}/g, patientName)
            .replace(/\{patient_id\}/g, patient_id);

          if (!lineUid) {
            // UID無しでもログは残す
            await supabaseAdmin.from("message_log").insert({
              patient_id, line_uid: null, message_type: "individual",
              content: text, status: "no_uid",
            });
            results.push({ step: i, type: step.type, success: false, detail: "LINE UID未登録" });
            break;
          }

          const pushRes = await fetch("https://api.line.me/v2/bot/message/push", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
            },
            body: JSON.stringify({ to: lineUid, messages: [{ type: "text", text }] }),
          });

          const status = pushRes.ok ? "sent" : "failed";
          await supabaseAdmin.from("message_log").insert({
            patient_id, line_uid: lineUid, message_type: "individual",
            content: text, status,
          });
          results.push({ step: i, type: step.type, success: pushRes.ok, detail: status });
          break;
        }

        case "send_template": {
          if (!step.template_id) {
            results.push({ step: i, type: step.type, success: false, detail: "テンプレート未指定" });
            break;
          }
          const { data: tmpl } = await supabaseAdmin
            .from("message_templates")
            .select("content")
            .eq("id", step.template_id)
            .single();

          if (!tmpl) {
            results.push({ step: i, type: step.type, success: false, detail: "テンプレートが見つかりません" });
            break;
          }

          const tmplText = tmpl.content
            .replace(/\{name\}/g, patientName)
            .replace(/\{patient_id\}/g, patient_id);

          if (!lineUid) {
            await supabaseAdmin.from("message_log").insert({
              patient_id, line_uid: null, message_type: "individual",
              content: tmplText, status: "no_uid",
            });
            results.push({ step: i, type: step.type, success: false, detail: "LINE UID未登録" });
            break;
          }

          const tmplRes = await fetch("https://api.line.me/v2/bot/message/push", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
            },
            body: JSON.stringify({ to: lineUid, messages: [{ type: "text", text: tmplText }] }),
          });

          const tmplStatus = tmplRes.ok ? "sent" : "failed";
          await supabaseAdmin.from("message_log").insert({
            patient_id, line_uid: lineUid, message_type: "individual",
            content: tmplText, status: tmplStatus,
          });
          results.push({ step: i, type: step.type, success: tmplRes.ok, detail: tmplStatus });
          break;
        }

        case "tag_add": {
          if (!step.tag_id) {
            results.push({ step: i, type: step.type, success: false, detail: "タグ未指定" });
            break;
          }
          const { error: tagErr } = await supabaseAdmin
            .from("patient_tags")
            .upsert({ patient_id, tag_id: step.tag_id, assigned_by: "action" }, { onConflict: "patient_id,tag_id" });

          results.push({ step: i, type: step.type, success: !tagErr, detail: tagErr?.message });
          break;
        }

        case "tag_remove": {
          if (!step.tag_id) {
            results.push({ step: i, type: step.type, success: false, detail: "タグ未指定" });
            break;
          }
          const { error: rmErr } = await supabaseAdmin
            .from("patient_tags")
            .delete()
            .eq("patient_id", patient_id)
            .eq("tag_id", step.tag_id);

          results.push({ step: i, type: step.type, success: !rmErr, detail: rmErr?.message });
          break;
        }

        case "mark_change": {
          if (!step.mark) {
            results.push({ step: i, type: step.type, success: false, detail: "マーク未指定" });
            break;
          }
          const { error: markErr } = await supabaseAdmin
            .from("patient_marks")
            .upsert({
              patient_id,
              mark: step.mark,
              note: step.note || null,
              updated_by: "action",
              updated_at: new Date().toISOString(),
            }, { onConflict: "patient_id" });

          results.push({ step: i, type: step.type, success: !markErr, detail: markErr?.message });
          break;
        }

        default:
          results.push({ step: i, type: step.type, success: false, detail: "未対応の動作タイプ" });
      }
    } catch (err) {
      results.push({ step: i, type: step.type, success: false, detail: String(err) });
    }
  }

  const allSuccess = results.every(r => r.success);
  return NextResponse.json({ ok: allSuccess, results });
}
