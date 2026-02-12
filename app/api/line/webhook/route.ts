import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase";
import { invalidateDashboardCache } from "@/lib/redis";
import { pushMessage } from "@/lib/line-push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ===== 環境変数 =====
// 2つのLINEチャネル: Lオペ(MAPI) と 再処方許可bot(NOTIFY)
const LINE_CHANNEL_SECRETS = [
  process.env.LINE_MESSAGING_API_CHANNEL_SECRET,
  process.env.LINE_NOTIFY_CHANNEL_SECRET,
].filter(Boolean) as string[];
const LINE_ADMIN_GROUP_ID = process.env.LINE_ADMIN_GROUP_ID || "";
const LINE_ACCESS_TOKEN =
  process.env.LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN ||
  process.env.LINE_NOTIFY_CHANNEL_ACCESS_TOKEN || "";
// 管理グループはbot(NOTIFY)チャネルに属するため、グループ送信には専用トークンを使用
const LINE_NOTIFY_TOKEN =
  process.env.LINE_NOTIFY_CHANNEL_ACCESS_TOKEN || LINE_ACCESS_TOKEN;

// ===== LINE署名検証（HMAC-SHA256 → Base64）=====
// 複数チャネルのいずれかで検証が通ればOK
function verifyLineSignature(rawBody: string, signature: string) {
  if (LINE_CHANNEL_SECRETS.length === 0 || !signature) return false;
  for (const secret of LINE_CHANNEL_SECRETS) {
    const hash = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("base64");
    if (hash.length === signature.length &&
        crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature))) {
      return true;
    }
  }
  return false;
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

// ===== グループへプッシュ送信（bot/NOTIFYチャネル経由）=====
async function pushToGroup(toGroupId: string, text: string) {
  if (!LINE_NOTIFY_TOKEN || !toGroupId) return;
  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LINE_NOTIFY_TOKEN}`,
    },
    body: JSON.stringify({ to: toGroupId, messages: [{ type: "text", text }] }),
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[pushToGroup] failed", res.status, body);
  }
}

// ===== LINE Content APIから画像をDL → Supabase Storageに保存 =====
const IMAGE_BUCKET = "line-images";

async function downloadAndSaveImage(
  messageId: string,
  patientId: string
): Promise<string | null> {
  if (!LINE_ACCESS_TOKEN || !messageId) return null;

  try {
    const res = await fetch(
      `https://api-data.line.me/v2/bot/message/${messageId}/content`,
      { headers: { Authorization: `Bearer ${LINE_ACCESS_TOKEN}` } }
    );
    if (!res.ok) {
      console.error("[webhook] LINE content download failed:", res.status);
      return null;
    }

    const contentType = res.headers.get("content-type") || "image/jpeg";
    const ext = contentType.includes("png")
      ? "png"
      : contentType.includes("webp")
        ? "webp"
        : contentType.includes("gif")
          ? "gif"
          : "jpg";
    const buffer = Buffer.from(await res.arrayBuffer());

    const fileName = `${patientId}/${Date.now()}_recv.${ext}`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from(IMAGE_BUCKET)
      .upload(fileName, buffer, { contentType, upsert: false });

    if (uploadError) {
      console.error("[webhook] Image upload error:", uploadError.message);
      return null;
    }

    const { data: urlData } = supabaseAdmin.storage
      .from(IMAGE_BUCKET)
      .getPublicUrl(fileName);
    console.log("[webhook] Image saved:", urlData.publicUrl);
    return urlData.publicUrl;
  } catch (err) {
    console.error("[webhook] Image download/upload error:", err);
    return null;
  }
}

// ===== LINE Profile API でプロフィール取得 =====
async function getLineProfile(lineUid: string): Promise<{ displayName: string; pictureUrl: string }> {
  if (!LINE_ACCESS_TOKEN) return { displayName: "", pictureUrl: "" };
  try {
    const res = await fetch(`https://api.line.me/v2/bot/profile/${lineUid}`, {
      headers: { Authorization: `Bearer ${LINE_ACCESS_TOKEN}` },
      cache: "no-store",
    });
    if (!res.ok) return { displayName: "", pictureUrl: "" };
    const profile = await res.json();
    return {
      displayName: profile.displayName || "",
      pictureUrl: profile.pictureUrl || "",
    };
  } catch {
    return { displayName: "", pictureUrl: "" };
  }
}

// 後方互換
async function getLineDisplayName(lineUid: string): Promise<string> {
  const p = await getLineProfile(lineUid);
  return p.displayName;
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

// ===== LINE UIDから患者を検索、なければ自動作成 =====
async function findOrCreatePatient(lineUid: string) {
  const existing = await findPatientByLineUid(lineUid);
  if (existing) return existing;

  // LINEプロフィール取得
  const profile = await getLineProfile(lineUid);
  const displayName = profile.displayName || `LINE_${lineUid.slice(-6)}`;

  // patient_idを生成（LINE_で始まるUID末尾8文字）
  const patientId = `LINE_${lineUid.slice(-8)}`;

  // intakeレコードを作成（patient_idユニーク制約なしのため insert を使用）
  const { error } = await supabaseAdmin
    .from("intake")
    .insert({
      patient_id: patientId,
      patient_name: displayName,
      line_id: lineUid,
      line_display_name: profile.displayName || null,
      line_picture_url: profile.pictureUrl || null,
    });

  if (error) {
    console.error("[webhook] auto-create intake failed:", error.message);
    return null;
  }

  console.log(`[webhook] auto-created intake for ${lineUid} -> ${patientId} (${displayName})`);
  return { patient_id: patientId, patient_name: displayName };
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

  const existingPatient = await findPatientByLineUid(lineUid);
  const isReturning = !!existingPatient;
  const settingKey = isReturning ? "returning_blocked" : "new_friend";

  // PIDなしユーザーも自動作成
  const patient = existingPatient || await findOrCreatePatient(lineUid);

  // LINEプロフィール取得・更新
  const lineProfile = await getLineProfile(lineUid);
  const displayName = patient?.patient_name || lineProfile.displayName;

  if (patient?.patient_id && (lineProfile.displayName || lineProfile.pictureUrl)) {
    await supabaseAdmin
      .from("intake")
      .update({
        line_display_name: lineProfile.displayName || null,
        line_picture_url: lineProfile.pictureUrl || null,
      })
      .eq("patient_id", patient.patient_id);
  }

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

  // アクション詳細を記録する配列
  const actionDetails: string[] = [];

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
    actionDetails.push(`テキスト[${text.slice(0, 30)}${text.length > 30 ? "..." : ""}]を送信`);
  }

  // タグ付与
  if (patient?.patient_id && val.assign_tags && val.assign_tags.length > 0) {
    const tagNames: string[] = [];
    for (const tagId of val.assign_tags) {
      await supabaseAdmin
        .from("patient_tags")
        .upsert(
          { patient_id: patient.patient_id, tag_id: tagId, assigned_by: "follow" },
          { onConflict: "patient_id,tag_id" }
        );
      const { data: tagDef } = await supabaseAdmin.from("tag_definitions").select("name").eq("id", tagId).maybeSingle();
      if (tagDef?.name) tagNames.push(tagDef.name);
    }
    if (tagNames.length > 0) actionDetails.push(`タグ[${tagNames.join(", ")}]を追加`);
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
    actionDetails.push(`対応マークを[${val.assign_mark}]に設定`);
  }

  // リッチメニュー変更
  if (val.menu_change) {
    const { data: menu } = await supabaseAdmin
      .from("rich_menus")
      .select("line_rich_menu_id, name")
      .eq("id", Number(val.menu_change))
      .maybeSingle();

    if (menu?.line_rich_menu_id) {
      await fetch(`https://api.line.me/v2/bot/user/${lineUid}/richmenu/${menu.line_rich_menu_id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${LINE_ACCESS_TOKEN}` },
      });
      console.log(`[webhook] follow: assigned rich menu ${val.menu_change} to ${lineUid}`);
      actionDetails.push(`メニュー[${menu.name || val.menu_change}]にする`);
    }
  }

  // アクション詳細をシステムイベントとして記録
  if (actionDetails.length > 0) {
    const trigger = isReturning ? "友だち再追加" : "友だち登録";
    await logEvent({
      patient_id: patient?.patient_id,
      line_uid: lineUid,
      direction: "incoming",
      event_type: "system",
      message_type: "event",
      content: `${trigger}により\n${actionDetails.join("\n")}\nが起こりました`,
      status: "received",
    });
  }

  // 既存患者のステータスに基づくタグ＋メニュー上書き
  // （登録時設定より実データの状態を優先）
  if (patient?.patient_id) {
    await autoAssignStatusByPatient(patient.patient_id, lineUid);
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
// タグ＋リッチメニュー自動付与
//   ordersあり → 処方ずみタグ + 処方後メニュー
//   ordersなし & answerers.nameあり → 個人情報提出ずみタグ + 個人情報入力後メニュー
// =================================================================
async function autoAssignStatusByPatient(
  patientId: string,
  lineUid: string
) {
  try {
    if (patientId.startsWith("LINE_")) return;

    // ordersに1件でもあるか
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id")
      .eq("patient_id", patientId)
      .limit(1)
      .maybeSingle();

    let targetTagName: string;
    let targetMenuName: string;

    if (order) {
      targetTagName = "処方ずみ";
      targetMenuName = "処方後";
    } else {
      // answerers に名前が入っているか（個人情報提出済み）
      const { data: answerer } = await supabaseAdmin
        .from("answerers")
        .select("name, tel")
        .eq("patient_id", patientId)
        .maybeSingle();

      if (!answerer?.name) return;

      targetTagName = "個人情報提出ずみ";
      // リッチメニューはverify完了（tel登録済み）後のみ切り替え
      targetMenuName = answerer.tel ? "個人情報入力後" : "";
    }

    // タグ付与
    const { data: tagDef } = await supabaseAdmin
      .from("tag_definitions")
      .select("id")
      .eq("name", targetTagName)
      .maybeSingle();

    if (tagDef) {
      const { data: existing } = await supabaseAdmin
        .from("patient_tags")
        .select("tag_id")
        .eq("patient_id", patientId)
        .eq("tag_id", tagDef.id)
        .maybeSingle();

      if (!existing) {
        await supabaseAdmin
          .from("patient_tags")
          .upsert(
            { patient_id: patientId, tag_id: tagDef.id, assigned_by: "auto" },
            { onConflict: "patient_id,tag_id" }
          );
        console.log(`[webhook] auto-assigned ${targetTagName} tag to ${patientId}`);
      }
    }

    // 処方済みの場合、対応マークを「処方ずみ」（red）に自動設定
    if (order) {
      const { data: currentMark } = await supabaseAdmin
        .from("patient_marks")
        .select("mark")
        .eq("patient_id", patientId)
        .maybeSingle();
      if (!currentMark || currentMark.mark !== "red") {
        await supabaseAdmin
          .from("patient_marks")
          .upsert(
            { patient_id: patientId, mark: "red", note: null, updated_at: new Date().toISOString(), updated_by: "auto" },
            { onConflict: "patient_id" }
          );
        console.log(`[webhook] auto-assigned 処方ずみ mark to ${patientId}`);
      }
    }

    // リッチメニュー切り替え（targetMenuNameが空の場合はスキップ）
    if (!targetMenuName) return;
    const { data: menu } = await supabaseAdmin
      .from("rich_menus")
      .select("line_rich_menu_id")
      .eq("name", targetMenuName)
      .maybeSingle();

    if (menu?.line_rich_menu_id) {
      const currentRes = await fetch(`https://api.line.me/v2/bot/user/${lineUid}/richmenu`, {
        headers: { Authorization: `Bearer ${LINE_ACCESS_TOKEN}` },
      });
      const current = currentRes.ok ? await currentRes.json() : null;
      if (current?.richMenuId !== menu.line_rich_menu_id) {
        await fetch(`https://api.line.me/v2/bot/user/${lineUid}/richmenu/${menu.line_rich_menu_id}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${LINE_ACCESS_TOKEN}` },
        });
        console.log(`[webhook] auto-assigned ${targetMenuName} rich menu to ${patientId}`);
      }
    }
  } catch (err) {
    console.error("[webhook] autoAssignStatusByPatient error:", err);
  }
}

// =================================================================
// message イベント処理（ユーザーからのテキスト等）
// =================================================================
async function handleMessage(lineUid: string, message: any) {
  // PIDなしユーザーも自動作成してmessage_logにpatient_idを紐づける
  const patient = await findOrCreatePatient(lineUid);

  // プロフィール未保存なら取得して更新（非ブロッキング）
  if (patient?.patient_id) {
    (async () => {
      try {
        const { data: intake } = await supabaseAdmin
          .from("intake")
          .select("line_picture_url")
          .eq("patient_id", patient.patient_id)
          .maybeSingle();
        if (!intake?.line_picture_url) {
          const profile = await getLineProfile(lineUid);
          if (profile.displayName || profile.pictureUrl) {
            await supabaseAdmin.from("intake").update({
              line_display_name: profile.displayName || null,
              line_picture_url: profile.pictureUrl || null,
            }).eq("patient_id", patient.patient_id);
          }
        }
      } catch {}
    })();
  }

  // 処方済み患者の自動タグ＋リッチメニュー付与（非ブロッキング）
  if (patient?.patient_id) {
    autoAssignStatusByPatient(patient.patient_id, lineUid).catch(() => {});
  }

  let content = "";
  let msgType = message.type || "unknown";

  switch (message.type) {
    case "text":
      content = message.text || "";
      break;
    case "image": {
      const imageUrl = await downloadAndSaveImage(
        message.id,
        patient?.patient_id || `uid_${lineUid.slice(-8)}`
      );
      content = imageUrl || "[画像]";
      break;
    }
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
  const patient = await findOrCreatePatient(lineUid);

  // 処方済み患者の自動タグ＋リッチメニュー付与（非ブロッキング）
  if (patient?.patient_id) {
    autoAssignStatusByPatient(patient.patient_id, lineUid).catch(() => {});
  }

  // JSON形式（リッチメニューのaction type）を試行
  let parsed: any = null;
  try {
    parsed = JSON.parse(postbackData);
  } catch {
    // query string形式の場合はそのままログ
  }

  console.log("[webhook] postback from", lineUid, ":", postbackData.slice(0, 200));

  // postbackの表示用ラベルを生成
  let contentLabel = parsed?.userMessage || "";
  if (!contentLabel) {
    if (parsed?.type === "rich_menu_action") {
      contentLabel = "リッチメニュー操作";
    } else if (parsed?.provider === "lml") {
      contentLabel = "メニュー操作";
    } else if (parsed) {
      contentLabel = "メニュー操作";
    } else {
      contentLabel = postbackData.slice(0, 100);
    }
  }

  // ログ記録
  await logEvent({
    patient_id: patient?.patient_id,
    line_uid: lineUid,
    direction: "incoming",
    event_type: "postback",
    message_type: "event",
    content: contentLabel,
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
  const actionDetails: string[] = [];

  for (const action of actions) {
    try {
      switch (action.type) {
        case "template_send": {
          if (!action.value) break;
          const { data: tmpl } = await supabaseAdmin
            .from("message_templates")
            .select("content, name, message_type")
            .eq("id", Number(action.value))
            .maybeSingle();
          if (!tmpl) break;

          const text = tmpl.content
            .replace(/\{name\}/g, patient?.patient_name || "")
            .replace(/\{patient_id\}/g, patient?.patient_id || "");

          // タイミング制御（即時以外は後で実装、今は即時送信）
          if (tmpl.message_type === "image") {
            // 画像テンプレート → LINE image メッセージで送信
            await pushMessage(lineUid, [{
              type: "image",
              originalContentUrl: text,
              previewImageUrl: text,
            }]);
            await logEvent({
              patient_id: patient?.patient_id,
              line_uid: lineUid,
              direction: "outgoing",
              event_type: "postback",
              message_type: "individual",
              content: `【${tmpl.name}】${text}`,
              status: "sent",
            });
            actionDetails.push(`画像[${tmpl.name}]を送信`);
          } else {
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
            actionDetails.push(`テキスト[${text.slice(0, 30)}${text.length > 30 ? "..." : ""}]を送信`);
          }
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
          actionDetails.push(`テキスト[${text.slice(0, 30)}${text.length > 30 ? "..." : ""}]を送信`);
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
            actionDetails.push(`タグ[${action.value}]を追加`);
          } else {
            await supabaseAdmin
              .from("patient_tags")
              .delete()
              .eq("patient_id", patient.patient_id)
              .eq("tag_id", tagId);
            actionDetails.push(`タグ[${action.value}]を解除`);
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
            actionDetails.push(`対応マークを[${action.value}]に更新`);
          }
          break;
        }

        case "menu_op": {
          if (!action.value) break;
          // リッチメニューIDからLINE側IDを取得して個別割り当て
          const { data: menu } = await supabaseAdmin
            .from("rich_menus")
            .select("line_rich_menu_id, name")
            .eq("id", Number(action.value))
            .maybeSingle();

          if (menu?.line_rich_menu_id) {
            await fetch(`https://api.line.me/v2/bot/user/${lineUid}/richmenu/${menu.line_rich_menu_id}`, {
              method: "POST",
              headers: { Authorization: `Bearer ${LINE_ACCESS_TOKEN}` },
            });
            actionDetails.push(`メニュー[${menu.name || action.value}]にする`);
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
            actionDetails.push(`友だち情報[${action.fieldName}]を削除`);
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
            actionDetails.push(`友だち情報[${action.fieldName}]を変更`);
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

  // アクション詳細をシステムイベントとして記録
  if (actionDetails.length > 0) {
    await logEvent({
      patient_id: patient?.patient_id,
      line_uid: lineUid,
      direction: "incoming",
      event_type: "system",
      message_type: "event",
      content: `メニューボタン選択により\n${actionDetails.join("\n")}\nが起こりました`,
      status: "received",
    });
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
        if (pushRes?.ok) {
          await logEvent({
            patient_id: reorderData.patient_id,
            line_uid: intake.line_id,
            direction: "outgoing",
            event_type: "message",
            message_type: "text",
            content: "再処方申請が承認されました🌸\nマイページより決済のお手続きをお願いいたします。\n何かご不明な点がございましたら、お気軽にお知らせください🫧",
            status: "sent",
          });
        }
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
    if (LINE_CHANNEL_SECRETS.length === 0) {
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
