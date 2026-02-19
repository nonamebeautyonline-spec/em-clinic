import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant, tenantPayload } from "@/lib/tenant";
import { getSettingOrEnv } from "@/lib/settings";

interface ActionStep {
  type: "send_text" | "send_template" | "tag_add" | "tag_remove" | "mark_change" | "menu_change";
  content?: string;
  template_id?: number;
  tag_id?: number;
  mark?: string;
  note?: string;
  menu_id?: string;
  menu_name?: string;
}

// アクション実行
export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);
  const lineToken = await getSettingOrEnv("line", "channel_access_token", "LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN", tenantId ?? undefined) || "";
  const { action_id, patient_id } = await req.json();
  if (!action_id) return NextResponse.json({ error: "アクションIDは必須です" }, { status: 400 });
  if (!patient_id) return NextResponse.json({ error: "患者IDは必須です" }, { status: 400 });

  // アクション取得
  const { data: action, error: actionError } = await withTenant(
    supabaseAdmin
      .from("actions")
      .select("*")
      .eq("id", action_id),
    tenantId
  ).single();

  if (actionError || !action) {
    return NextResponse.json({ error: "アクションが見つかりません" }, { status: 404 });
  }

  const steps = action.steps as ActionStep[];
  const results: { step: number; type: string; success: boolean; detail?: string }[] = [];

  // 患者の LINE UID・名前を patients テーブルから取得
  const { data: patientData } = await withTenant(
    supabaseAdmin
      .from("patients")
      .select("name, line_id")
      .eq("patient_id", patient_id),
    tenantId
  ).maybeSingle();

  const lineUid = patientData?.line_id;
  const patientName = patientData?.name || "";

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
              ...tenantPayload(tenantId),
              patient_id, line_uid: null, message_type: "individual",
              content: text, status: "no_uid", direction: "outgoing",
            });
            results.push({ step: i, type: step.type, success: false, detail: "LINE UID未登録" });
            break;
          }

          const pushRes = await fetch("https://api.line.me/v2/bot/message/push", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${lineToken}`,
            },
            body: JSON.stringify({ to: lineUid, messages: [{ type: "text", text }] }),
          });

          const status = pushRes.ok ? "sent" : "failed";
          await supabaseAdmin.from("message_log").insert({
            ...tenantPayload(tenantId),
            patient_id, line_uid: lineUid, message_type: "individual",
            content: text, status, direction: "outgoing",
          });
          results.push({ step: i, type: step.type, success: pushRes.ok, detail: status });
          break;
        }

        case "send_template": {
          if (!step.template_id) {
            results.push({ step: i, type: step.type, success: false, detail: "テンプレート未指定" });
            break;
          }
          const { data: tmpl } = await withTenant(
            supabaseAdmin
              .from("message_templates")
              .select("content, message_type")
              .eq("id", step.template_id),
            tenantId
          ).single();

          if (!tmpl) {
            results.push({ step: i, type: step.type, success: false, detail: "テンプレートが見つかりません" });
            break;
          }

          const tmplText = tmpl.content
            .replace(/\{name\}/g, patientName)
            .replace(/\{patient_id\}/g, patient_id);

          if (!lineUid) {
            await supabaseAdmin.from("message_log").insert({
              ...tenantPayload(tenantId),
              patient_id, line_uid: null, message_type: "individual",
              content: tmplText, status: "no_uid", direction: "outgoing",
            });
            results.push({ step: i, type: step.type, success: false, detail: "LINE UID未登録" });
            break;
          }

          // 画像テンプレートの場合は image メッセージ、それ以外は text
          const tmplMessage = tmpl.message_type === "image"
            ? { type: "image", originalContentUrl: tmplText, previewImageUrl: tmplText }
            : { type: "text", text: tmplText };

          const tmplRes = await fetch("https://api.line.me/v2/bot/message/push", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${lineToken}`,
            },
            body: JSON.stringify({ to: lineUid, messages: [tmplMessage] }),
          });

          const tmplStatus = tmplRes.ok ? "sent" : "failed";
          await supabaseAdmin.from("message_log").insert({
            ...tenantPayload(tenantId),
            patient_id, line_uid: lineUid, message_type: "individual",
            content: tmplText, status: tmplStatus, direction: "outgoing",
          });
          results.push({ step: i, type: step.type, success: tmplRes.ok, detail: tmplStatus });
          break;
        }

        case "tag_add": {
          if (!step.tag_id) {
            results.push({ step: i, type: step.type, success: false, detail: "タグ未指定" });
            break;
          }
          const { error: tagErr } = await withTenant(
            supabaseAdmin
              .from("patient_tags")
              .upsert({ ...tenantPayload(tenantId), patient_id, tag_id: step.tag_id, assigned_by: "action" }, { onConflict: "patient_id,tag_id" }),
            tenantId
          );

          results.push({ step: i, type: step.type, success: !tagErr, detail: tagErr?.message });
          break;
        }

        case "tag_remove": {
          if (!step.tag_id) {
            results.push({ step: i, type: step.type, success: false, detail: "タグ未指定" });
            break;
          }
          const { error: rmErr } = await withTenant(
            supabaseAdmin
              .from("patient_tags")
              .delete()
              .eq("patient_id", patient_id)
              .eq("tag_id", step.tag_id),
            tenantId
          );

          results.push({ step: i, type: step.type, success: !rmErr, detail: rmErr?.message });
          break;
        }

        case "mark_change": {
          if (!step.mark) {
            results.push({ step: i, type: step.type, success: false, detail: "マーク未指定" });
            break;
          }
          const { error: markErr } = await withTenant(
            supabaseAdmin
              .from("patient_marks")
              .upsert({
                ...tenantPayload(tenantId),
                patient_id,
                mark: step.mark,
                note: step.note || null,
                updated_by: "action",
                updated_at: new Date().toISOString(),
              }, { onConflict: "patient_id" }),
            tenantId
          );

          results.push({ step: i, type: step.type, success: !markErr, detail: markErr?.message });
          break;
        }

        case "menu_change": {
          if (!step.menu_id) {
            results.push({ step: i, type: step.type, success: false, detail: "メニュー未指定" });
            break;
          }
          if (!lineUid) {
            results.push({ step: i, type: step.type, success: false, detail: "LINE UID未登録" });
            break;
          }
          const { data: menuData } = await withTenant(
            supabaseAdmin
              .from("rich_menus")
              .select("line_rich_menu_id, name")
              .eq("id", Number(step.menu_id)),
            tenantId
          ).maybeSingle();

          if (!menuData?.line_rich_menu_id) {
            results.push({ step: i, type: step.type, success: false, detail: "メニューが見つからないかLINE未登録です" });
            break;
          }

          const menuRes = await fetch(`https://api.line.me/v2/bot/user/${lineUid}/richmenu/${menuData.line_rich_menu_id}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${lineToken}`,
            },
          });

          results.push({ step: i, type: step.type, success: menuRes.ok, detail: menuRes.ok ? "success" : `LINE API ${menuRes.status}` });
          break;
        }

        default:
          results.push({ step: i, type: step.type, success: false, detail: "未対応の動作タイプ" });
      }
    } catch (err) {
      results.push({ step: i, type: step.type, success: false, detail: String(err) });
    }
  }

  // システムイベントとしてアクション実行内容をログに記録
  const actionDetails: string[] = [];
  for (const step of steps) {
    switch (step.type) {
      case "send_text":
        if (step.content) actionDetails.push(`テキスト[${step.content.slice(0, 30)}${step.content.length > 30 ? "..." : ""}]を送信`);
        break;
      case "send_template":
        if (step.template_id) {
          const { data: t } = await withTenant(
            supabaseAdmin.from("message_templates").select("name").eq("id", step.template_id),
            tenantId
          ).maybeSingle();
          actionDetails.push(`テンプレート[${t?.name || step.template_id}]を送信`);
        }
        break;
      case "tag_add":
        if (step.tag_id) {
          const { data: t } = await withTenant(
            supabaseAdmin.from("tag_definitions").select("name").eq("id", step.tag_id),
            tenantId
          ).maybeSingle();
          actionDetails.push(`タグ[${t?.name || step.tag_id}]を追加`);
        }
        break;
      case "tag_remove":
        if (step.tag_id) {
          const { data: t } = await withTenant(
            supabaseAdmin.from("tag_definitions").select("name").eq("id", step.tag_id),
            tenantId
          ).maybeSingle();
          actionDetails.push(`タグ[${t?.name || step.tag_id}]を解除`);
        }
        break;
      case "mark_change":
        if (step.mark) actionDetails.push(`対応マークを[${step.mark}]に更新`);
        break;
      case "menu_change":
        actionDetails.push(`メニュー[${step.menu_name || step.menu_id}]に切替`);
        break;
    }
  }

  if (actionDetails.length > 0) {
    await supabaseAdmin.from("message_log").insert({
      ...tenantPayload(tenantId),
      patient_id,
      line_uid: lineUid || null,
      event_type: "system",
      message_type: "event",
      content: `手動実行によりアクション[${action.name}]が実行され、\n${actionDetails.join("\n")}\nが起こりました`,
      status: "received",
      direction: "incoming",
    });
  }

  const allSuccess = results.every(r => r.success);
  return NextResponse.json({ ok: allSuccess, results });
}
