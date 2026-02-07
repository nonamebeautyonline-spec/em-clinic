import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase";
import { invalidateDashboardCache } from "@/lib/redis";
import { pushMessage } from "@/lib/line-push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ===== 環境変数 =====
const LINE_CHANNEL_SECRET =
  process.env.LINE_MESSAGING_API_CHANNEL_SECRET ||
  process.env.LINE_NOTIFY_CHANNEL_SECRET || "";
const LINE_ADMIN_GROUP_ID = process.env.LINE_ADMIN_GROUP_ID || "";
const GAS_REORDER_URL = process.env.GAS_REORDER_URL || "";
const LINE_ACCESS_TOKEN =
  process.env.LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN ||
  process.env.LINE_NOTIFY_CHANNEL_ACCESS_TOKEN || "";

// ===== LINE署名検証（HMAC-SHA256 → Base64）=====
function verifyLineSignature(rawBody: string, signature: string) {
  if (!LINE_CHANNEL_SECRET || !signature) return false;
  const hash = crypto
    .createHmac("sha256", LINE_CHANNEL_SECRET)
    .update(rawBody)
    .digest("base64");
  if (hash.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
}

// ===== "a=b&c=d" → { a: b, c: d } =====
function parseQueryString(data: string) {
  const out: Record<string, string> = {};
  for (const part of String(data || "").split("&")) {
    if (!part) continue;
    const [k, v] = part.split("=");
    if (!k) continue;
    out[decodeURIComponent(k)] = decodeURIComponent(v || "");
  }
  return out;
}

// ===== グループへプッシュ送信 =====
async function pushToGroup(toGroupId: string, text: string) {
  if (!LINE_ACCESS_TOKEN || !toGroupId) return;
  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LINE_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ to: toGroupId, messages: [{ type: "text", text }] }),
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[pushToGroup] failed", res.status, body);
  }
}

// ===== GAS同期 =====
async function syncToGas(action: string, id: number) {
  if (!GAS_REORDER_URL) return;
  try {
    await fetch(GAS_REORDER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, id }),
      cache: "no-store",
    });
  } catch (err) {
    console.error("[LINE webhook] GAS sync error:", err);
  }
}

// ===== LINE Profile API でLINE表示名を取得 =====
async function getLineDisplayName(lineUid: string): Promise<string> {
  if (!LINE_ACCESS_TOKEN) return "";
  try {
    const res = await fetch(`https://api.line.me/v2/bot/profile/${lineUid}`, {
      headers: { Authorization: `Bearer ${LINE_ACCESS_TOKEN}` },
      cache: "no-store",
    });
    if (!res.ok) return "";
    const profile = await res.json();
    return profile.displayName || "";
  } catch {
    return "";
  }
}

// ===== LINE UIDから patient_id を逆引き =====
async function findPatientByLineUid(lineUid: string) {
  const { data } = await supabaseAdmin
    .from("intake")
    .select("patient_id, patient_name")
    .eq("line_id", lineUid)
    .limit(1)
    .maybeSingle();
  return data;
}

// ===== message_log に記録 =====
async function logEvent(params: {
  patient_id?: string | null;
  line_uid: string;
  direction: "incoming" | "outgoing";
  event_type: string;
  message_type: string;
  content: string;
  status: string;
  postback_data?: object | null;
}) {
  await supabaseAdmin.from("message_log").insert({
    patient_id: params.patient_id || null,
    line_uid: params.line_uid,
    direction: params.direction,
    event_type: params.event_type,
    message_type: params.message_type,
    content: params.content,
    status: params.status,
    postback_data: params.postback_data || null,
  });
}

// =================================================================
// follow イベント処理
// =================================================================
async function handleFollow(lineUid: string) {
  console.log("[webhook] follow:", lineUid);

  const patient = await findPatientByLineUid(lineUid);
  const isReturning = !!patient;
  const settingKey = isReturning ? "returning_blocked" : "new_friend";

  // LINE表示名を取得（patient_nameがない場合のフォールバック）
  const displayName = patient?.patient_name || await getLineDisplayName(lineUid);

  // friend_add_settings を取得
  const { data: setting } = await supabaseAdmin
    .from("friend_add_settings")
    .select("setting_value, enabled")
    .eq("setting_key", settingKey)
    .maybeSingle();

  // ログ記録
  await logEvent({
    patient_id: patient?.patient_id,
    line_uid: lineUid,
    direction: "incoming",
    event_type: "follow",
    message_type: "event",
    content: isReturning ? "友だち再追加（ブロック解除）" : "友だち追加",
    status: "received",
  });

  if (!setting?.enabled) return;

  const val = setting.setting_value as {
    greeting_message?: string;
    assign_tags?: number[];
    assign_mark?: string;
    menu_change?: string;
    actions?: any[];
  };

  // グリーティングメッセージ送信
  if (val.greeting_message) {
    const text = val.greeting_message
      .replace(/\{name\}/g, displayName)
      .replace(/\{patient_id\}/g, patient?.patient_id || "");

    await pushMessage(lineUid, [{ type: "text", text }]);
    await logEvent({
      patient_id: patient?.patient_id,
      line_uid: lineUid,
      direction: "outgoing",
      event_type: "follow",
      message_type: "individual",
      content: text,
      status: "sent",
    });
  }

  // タグ付与
  if (patient?.patient_id && val.assign_tags && val.assign_tags.length > 0) {
    for (const tagId of val.assign_tags) {
      await supabaseAdmin
        .from("patient_tags")
        .upsert(
          { patient_id: patient.patient_id, tag_id: tagId, assigned_by: "follow" },
          { onConflict: "patient_id,tag_id" }
        );
    }
  }

  // 対応マーク設定
  if (patient?.patient_id && val.assign_mark && val.assign_mark !== "none") {
    await supabaseAdmin
      .from("patient_marks")
      .upsert(
        {
          patient_id: patient.patient_id,
          mark: val.assign_mark,
          updated_by: "follow",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "patient_id" }
      );
  }

  // リッチメニュー変更
  if (val.menu_change) {
    const { data: menu } = await supabaseAdmin
      .from("rich_menus")
      .select("line_rich_menu_id")
      .eq("id", Number(val.menu_change))
      .maybeSingle();

    if (menu?.line_rich_menu_id) {
      await fetch(`https://api.line.me/v2/bot/user/${lineUid}/richmenu/${menu.line_rich_menu_id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${LINE_ACCESS_TOKEN}` },
      });
      console.log(`[webhook] follow: assigned rich menu ${val.menu_change} to ${lineUid}`);
    }
  }
}

// =================================================================
// unfollow イベント処理
// =================================================================
async function handleUnfollow(lineUid: string) {
  console.log("[webhook] unfollow:", lineUid);

  const patient = await findPatientByLineUid(lineUid);

  await logEvent({
    patient_id: patient?.patient_id,
    line_uid: lineUid,
    direction: "incoming",
    event_type: "unfollow",
    message_type: "event",
    content: "ブロック（友だち解除）",
    status: "received",
  });
}

// =================================================================
// message イベント処理（ユーザーからのテキスト等）
// =================================================================
async function handleMessage(lineUid: string, message: any) {
  const patient = await findPatientByLineUid(lineUid);

  let content = "";
  let msgType = message.type || "unknown";

  switch (message.type) {
    case "text":
      content = message.text || "";
      break;
    case "image":
      content = "[画像]";
      break;
    case "video":
      content = "[動画]";
      break;
    case "audio":
      content = "[音声]";
      break;
    case "file":
      content = `[ファイル] ${message.fileName || ""}`;
      break;
    case "location":
      content = `[位置情報] ${message.title || ""} ${message.address || ""}`.trim();
      break;
    case "sticker":
      content = `[スタンプ] packageId=${message.packageId} stickerId=${message.stickerId}`;
      break;
    default:
      content = `[${message.type || "不明"}]`;
  }

  console.log("[webhook] message from", lineUid, ":", content.slice(0, 100));

  await logEvent({
    patient_id: patient?.patient_id,
    line_uid: lineUid,
    direction: "incoming",
    event_type: "message",
    message_type: msgType,
    content,
    status: "received",
  });
}

// =================================================================
// postback イベント処理（ユーザーからのリッチメニュー操作等）
// =================================================================
async function handleUserPostback(lineUid: string, postbackData: string) {
  const patient = await findPatientByLineUid(lineUid);

  // JSON形式（リッチメニューのaction type）を試行
  let parsed: any = null;
  try {
    parsed = JSON.parse(postbackData);
  } catch {
    // query string形式の場合はそのままログ
  }

  console.log("[webhook] postback from", lineUid, ":", postbackData.slice(0, 200));

  // ログ記録
  await logEvent({
    patient_id: patient?.patient_id,
    line_uid: lineUid,
    direction: "incoming",
    event_type: "postback",
    message_type: "postback",
    content: parsed?.userMessage || postbackData.slice(0, 500),
    status: "received",
    postback_data: parsed || { raw: postbackData },
  });

  // リッチメニューのアクション実行
  if (parsed?.type === "rich_menu_action" && Array.isArray(parsed.actions)) {
    await executeRichMenuActions(lineUid, patient, parsed.actions);
  }
}

// =================================================================
// リッチメニューアクション実行
// =================================================================
async function executeRichMenuActions(
  lineUid: string,
  patient: { patient_id: string; patient_name: string } | null,
  actions: any[]
) {
  for (const action of actions) {
    try {
      switch (action.type) {
        case "template_send": {
          if (!action.value) break;
          const { data: tmpl } = await supabaseAdmin
            .from("message_templates")
            .select("content")
            .eq("id", Number(action.value))
            .maybeSingle();
          if (!tmpl) break;

          const text = tmpl.content
            .replace(/\{name\}/g, patient?.patient_name || "")
            .replace(/\{patient_id\}/g, patient?.patient_id || "");

          // タイミング制御（即時以外は後で実装、今は即時送信）
          await pushMessage(lineUid, [{ type: "text", text }]);
          await logEvent({
            patient_id: patient?.patient_id,
            line_uid: lineUid,
            direction: "outgoing",
            event_type: "postback",
            message_type: "individual",
            content: text,
            status: "sent",
          });
          break;
        }

        case "text_send": {
          if (!action.value) break;
          const text = action.value
            .replace(/\{name\}/g, patient?.patient_name || "")
            .replace(/\{patient_id\}/g, patient?.patient_id || "");

          await pushMessage(lineUid, [{ type: "text", text }]);
          await logEvent({
            patient_id: patient?.patient_id,
            line_uid: lineUid,
            direction: "outgoing",
            event_type: "postback",
            message_type: "individual",
            content: text,
            status: "sent",
          });
          break;
        }

        case "tag_op": {
          if (!patient?.patient_id || !action.value) break;
          // タグ名からtag_idを取得（なければ作成）
          let tagId: number | null = null;
          const { data: existing } = await supabaseAdmin
            .from("tag_definitions")
            .select("id")
            .eq("name", action.value)
            .maybeSingle();

          if (existing) {
            tagId = existing.id;
          } else if ((action.mode || "add") === "add") {
            const { data: created } = await supabaseAdmin
              .from("tag_definitions")
              .insert({ name: action.value })
              .select("id")
              .single();
            tagId = created?.id || null;
          }

          if (!tagId) break;

          if ((action.mode || "add") === "add") {
            await supabaseAdmin
              .from("patient_tags")
              .upsert(
                { patient_id: patient.patient_id, tag_id: tagId, assigned_by: "richmenu" },
                { onConflict: "patient_id,tag_id" }
              );
          } else {
            await supabaseAdmin
              .from("patient_tags")
              .delete()
              .eq("patient_id", patient.patient_id)
              .eq("tag_id", tagId);
          }
          break;
        }

        case "mark_display": {
          if (!patient?.patient_id) break;
          if (action.value) {
            await supabaseAdmin
              .from("patient_marks")
              .upsert(
                {
                  patient_id: patient.patient_id,
                  mark: action.value,
                  updated_by: "richmenu",
                  updated_at: new Date().toISOString(),
                },
                { onConflict: "patient_id" }
              );
          }
          break;
        }

        case "menu_op": {
          if (!action.value) break;
          // リッチメニューIDからLINE側IDを取得して個別割り当て
          const { data: menu } = await supabaseAdmin
            .from("rich_menus")
            .select("line_rich_menu_id")
            .eq("id", Number(action.value))
            .maybeSingle();

          if (menu?.line_rich_menu_id) {
            await fetch(`https://api.line.me/v2/bot/user/${lineUid}/richmenu/${menu.line_rich_menu_id}`, {
              method: "POST",
              headers: { Authorization: `Bearer ${LINE_ACCESS_TOKEN}` },
            });
          }
          break;
        }

        case "friend_info": {
          if (!patient?.patient_id || !action.fieldName) break;
          // 友だち情報欄を更新
          const { data: fieldDef } = await supabaseAdmin
            .from("friend_field_definitions")
            .select("id")
            .eq("name", action.fieldName)
            .maybeSingle();

          if (!fieldDef) break;

          const op = action.operation || "assign";
          if (op === "delete") {
            await supabaseAdmin
              .from("friend_field_values")
              .delete()
              .eq("patient_id", patient.patient_id)
              .eq("field_id", fieldDef.id);
          } else {
            // 代入 or 追加
            const { data: current } = await supabaseAdmin
              .from("friend_field_values")
              .select("value")
              .eq("patient_id", patient.patient_id)
              .eq("field_id", fieldDef.id)
              .maybeSingle();

            let newValue = action.value || "";
            if (op === "append" && current?.value) {
              newValue = current.value + newValue;
            }

            await supabaseAdmin
              .from("friend_field_values")
              .upsert(
                {
                  patient_id: patient.patient_id,
                  field_id: fieldDef.id,
                  value: newValue,
                  updated_at: new Date().toISOString(),
                },
                { onConflict: "patient_id,field_id" }
              );
          }
          break;
        }

        default:
          console.log("[webhook] Unknown action type:", action.type);
      }
    } catch (err) {
      console.error("[webhook] Action execution error:", action.type, err);
    }
  }
}

// =================================================================
// 管理グループ postback（再処方承認/却下 - 既存ロジック）
// =================================================================
async function handleAdminPostback(groupId: string, dataStr: string) {
  const q = parseQueryString(dataStr);
  const action = q["reorder_action"];
  const reorderId = q["reorder_id"];

  if (!action || !reorderId) return;
  if (action !== "approve" && action !== "reject") return;

  const gasRowNumber = Number(reorderId);
  if (!Number.isFinite(gasRowNumber)) return;

  const { data: reorderData, error: selectError } = await supabaseAdmin
    .from("reorders")
    .select("id, patient_id, status")
    .eq("gas_row_number", gasRowNumber)
    .single();

  if (selectError || !reorderData) {
    console.error("[LINE webhook] Reorder not found:", gasRowNumber);
    await pushToGroup(
      groupId,
      `【再処方】${action === "approve" ? "承認" : "却下"} 失敗\n申請ID: ${reorderId}\n原因: DBにレコードが見つかりません`
    );
    return;
  }

  if (reorderData.status !== "pending") {
    await pushToGroup(
      groupId,
      `【再処方】この申請は既に処理済みです (${reorderData.status})\n申請ID: ${reorderId}`
    );
    return;
  }

  const { error: updateError } = await supabaseAdmin
    .from("reorders")
    .update({
      status: action === "approve" ? "confirmed" : "rejected",
      ...(action === "approve"
        ? { approved_at: new Date().toISOString() }
        : { rejected_at: new Date().toISOString() }),
    })
    .eq("gas_row_number", gasRowNumber);

  if (updateError) {
    console.error("[LINE webhook] DB update error:", updateError);
    await pushToGroup(
      groupId,
      `【再処方】${action === "approve" ? "承認" : "却下"} 失敗\n申請ID: ${reorderId}\n原因: DB更新エラー`
    );
    return;
  }

  console.log(`[LINE webhook] DB update success: ${action} gas_row=${gasRowNumber}`);

  if (reorderData.patient_id) {
    await invalidateDashboardCache(reorderData.patient_id);
  }

  syncToGas(action, gasRowNumber).catch(() => {});

  // 患者へLINE通知（承認時のみ）
  if (action === "approve" && reorderData.patient_id) {
    const { data: intake } = await supabaseAdmin
      .from("intake")
      .select("line_id")
      .eq("patient_id", reorderData.patient_id)
      .not("line_id", "is", null)
      .limit(1)
      .single();

    let lineNotify: "sent" | "no_uid" | "failed" = "no_uid";
    if (intake?.line_id) {
      try {
        const pushRes = await pushMessage(intake.line_id, [{
          type: "text",
          text: "再処方申請が承認されました🌸\nマイページより決済のお手続きをお願いいたします。\n何かご不明な点がございましたら、お気軽にお知らせください🫧",
        }]);
        lineNotify = pushRes?.ok ? "sent" : "failed";
      } catch (err) {
        lineNotify = "failed";
        console.error("[LINE webhook] Patient push error:", err);
      }
    }

    await supabaseAdmin
      .from("reorders")
      .update({ line_notify_result: lineNotify })
      .eq("gas_row_number", gasRowNumber);
  }

  await pushToGroup(
    groupId,
    `【再処方】${action === "approve" ? "承認しました" : "却下しました"}\n申請ID: ${reorderId}`
  );
}

// =================================================================
// メインエントリーポイント
// =================================================================
export async function POST(req: NextRequest) {
  try {
    if (!LINE_CHANNEL_SECRET) {
      return NextResponse.json({ ok: false, error: "LINE_CHANNEL_SECRET missing" }, { status: 500 });
    }

    // 署名検証
    const rawBody = await req.text();
    const signature = req.headers.get("x-line-signature") || "";

    if (!verifyLineSignature(rawBody, signature)) {
      return NextResponse.json({ ok: false, error: "invalid signature" }, { status: 401 });
    }

    const body = JSON.parse(rawBody);
    const events = Array.isArray(body?.events) ? body.events : [];

    for (const ev of events) {
      const sourceType: string = ev?.source?.type || "";
      const groupId: string = ev?.source?.groupId || "";
      const lineUid: string = ev?.source?.userId || "";

      // ===== 管理グループからのイベント =====
      if (groupId === LINE_ADMIN_GROUP_ID) {
        if (ev?.type === "postback") {
          await handleAdminPostback(groupId, ev.postback?.data || "");
        }
        continue;
      }

      // ===== 個人ユーザーからのイベント =====
      if (sourceType === "user" && lineUid) {
        switch (ev.type) {
          case "follow":
            await handleFollow(lineUid);
            break;

          case "unfollow":
            await handleUnfollow(lineUid);
            break;

          case "message":
            await handleMessage(lineUid, ev.message || {});
            break;

          case "postback":
            await handleUserPostback(lineUid, ev.postback?.data || "");
            break;

          default:
            console.log("[webhook] Unhandled event type:", ev.type);
        }
      }
    }

    // LINEには常に200（再送防止）
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("LINE webhook fatal error", e);
    return NextResponse.json({ ok: false, error: "unexpected error" }, { status: 500 });
  }
}
