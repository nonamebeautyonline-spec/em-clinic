import { NextRequest, NextResponse, after } from "next/server";

// after() 内で Claude API を呼ぶため、デフォルト15秒では不足
export const maxDuration = 60;
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase";
import { invalidateDashboardCache, invalidateFriendsListCache } from "@/lib/redis";
import { pushMessage } from "@/lib/line-push";
import { checkFollowTriggerScenarios, checkKeywordTriggerScenarios, exitAllStepEnrollments } from "@/lib/step-enrollment";
import { resolveTenantId, withTenant, tenantPayload, DEFAULT_TENANT_ID } from "@/lib/tenant";
import { MERGE_TABLES } from "@/lib/merge-tables";
import { getSettingOrEnv } from "@/lib/settings";
import { scheduleAiReply, sendAiReply, processAiReply, clearAiReplyDebounce } from "@/lib/ai-reply";
import { isWithinBusinessHours } from "@/lib/business-hours";
import { acquireLock } from "@/lib/distributed-lock";
import { checkSpamBurst } from "@/lib/spam-burst";
import { findScenarioByKeyword, getActiveSession, startScenario, processUserInput, getNextMessage } from "@/lib/chatbot-engine";
import { sanitizeFlexContents } from "@/lib/flex-sanitize";
import { checkIdempotency } from "@/lib/idempotency";
import { notifyWebhookFailure } from "@/lib/notifications/webhook-failure";

/** after()で処理するAI返信の対象患者リスト（リクエスト単位） */
let pendingAiReplyTargets: Array<{ lineUid: string; patientId: string; patientName: string; tenantId: string | null }> = [];

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ===== LINE署名検証（HMAC-SHA256 → Base64）=====
// 複数チャネルのいずれかで検証が通ればOK
function verifyLineSignature(rawBody: string, signature: string, secrets: string[]) {
  if (secrets.length === 0 || !signature) return false;
  for (const secret of secrets) {
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
async function pushToGroup(toGroupId: string, text: string, notifyToken: string) {
  if (!notifyToken || !toGroupId) return;
  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${notifyToken}`,
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
  patientId: string,
  accessToken: string
): Promise<string | null> {
  if (!accessToken || !messageId) return null;

  try {
    const res = await fetch(
      `https://api-data.line.me/v2/bot/message/${messageId}/content`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
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
async function getLineProfile(lineUid: string, accessToken: string): Promise<{ displayName: string; pictureUrl: string }> {
  if (!accessToken) return { displayName: "", pictureUrl: "" };
  try {
    const res = await fetch(`https://api.line.me/v2/bot/profile/${lineUid}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
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
async function getLineDisplayName(lineUid: string, accessToken: string): Promise<string> {
  const p = await getLineProfile(lineUid, accessToken);
  return p.displayName;
}

// ===== LINE UIDから patient_id を逆引き（patients テーブルを使用）=====
// 同じ line_id を持つ LINE_ 仮レコードと正規患者が共存する場合、正規患者を優先
async function findPatientByLineUid(lineUid: string, tenantId: string | null) {
  const { data } = await withTenant(
    supabaseAdmin
      .from("patients")
      .select("patient_id, name")
      .eq("line_id", lineUid),
    tenantId
  );
  if (!data || data.length === 0) return null;

  // 正規患者（LINE_ 以外）を優先
  const proper = data.find(p => !p.patient_id.startsWith("LINE_"));
  const fakes = data.filter(p => p.patient_id.startsWith("LINE_"));

  // 正規患者が見つかり、LINE_ 仮レコードも残っている場合は自動クリーンアップ（非ブロッキング）
  if (proper && fakes.length > 0) {
    mergeFakePatients(proper.patient_id, fakes.map(f => f.patient_id), tenantId).catch(err => {
      console.error("[webhook] LINE_ cleanup error:", err);
    });
  }

  const chosen = proper || data[0];
  return { patient_id: chosen.patient_id, patient_name: chosen.name || "" };
}

// ===== LINE_ 仮レコードを正規患者に統合して削除 =====
async function mergeFakePatients(properPatientId: string, fakeIds: string[], tenantId: string | null) {
  for (const fakeId of fakeIds) {
    console.log(`[webhook] Merging fake patient ${fakeId} -> ${properPatientId}`);

    // 関連テーブルの patient_id を正規に付け替え（MERGE_TABLES で一元管理）
    await Promise.all(
      MERGE_TABLES.map(async (table) => {
        const { error } = await withTenant(
          supabaseAdmin
            .from(table)
            .update({ patient_id: properPatientId })
            .eq("patient_id", fakeId),
          tenantId
        );
        // patient_tags 等の UNIQUE 制約違反（正規側に同一レコードが既にある）は無視
        if (error && error.code !== "23505") {
          console.error(`[webhook] Migration ${table} failed:`, error.message);
        }
      })
    );

    // friend_summaries 移行
    const { migrateFriendSummary } = await import("@/lib/merge-tables");
    await migrateFriendSummary(fakeId, properPatientId);
    // 仮レコード削除（intake → patients の順）
    await withTenant(supabaseAdmin.from("intake").delete().eq("patient_id", fakeId), tenantId);
    await withTenant(supabaseAdmin.from("patients").delete().eq("patient_id", fakeId), tenantId);
    console.log(`[webhook] Fake patient ${fakeId} merged and deleted`);
  }
}

// ===== LINE UIDから患者を検索、なければ自動作成 =====
// RPC → 従来ロジック → UNIQUE違反時再検索 の3段階フォールバック
async function findOrCreatePatient(lineUid: string, tenantId: string | null, accessToken: string) {
  // LINEプロフィール取得（RPC・フォールバック両方で使用）
  const profile = await getLineProfile(lineUid, accessToken);

  // ---- RPC でアトミックに検索・作成 ----
  try {
    const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc(
      "find_or_create_patient",
      {
        p_line_uid: lineUid,
        p_display_name: profile.displayName || null,
        p_picture_url: profile.pictureUrl || null,
        p_tenant_id: tenantId,
      }
    );

    if (!rpcError && rpcResult?.ok) {
      if (rpcResult.created) {
        console.log(`[webhook] RPC created patient for ${lineUid} -> ${rpcResult.patient_id}`);
      }
      return { patient_id: rpcResult.patient_id as string, patient_name: (rpcResult.patient_name || "") as string, lineProfile: profile };
    }

    if (rpcError) {
      console.warn("[webhook] find_or_create_patient RPC failed, fallback:", rpcError.message);
    }
  } catch (e) {
    console.warn("[webhook] find_or_create_patient RPC exception, fallback:", e);
  }

  // ---- フォールバック: 従来ロジック ----
  const existing = await findPatientByLineUid(lineUid, tenantId);
  if (existing) return { ...existing, lineProfile: profile };

  const displayName = profile.displayName || `LINE_${lineUid.slice(-6)}`;
  const patientId = `LINE_${lineUid.slice(-8)}`;

  // intake + patients の両方にレコードを作成
  const [{ error: intakeErr }, { error: patientsErr }] = await Promise.all([
    supabaseAdmin
      .from("intake")
      .insert({
        ...tenantPayload(tenantId),
        patient_id: patientId,
      }),
    supabaseAdmin
      .from("patients")
      .insert({
        ...tenantPayload(tenantId),
        patient_id: patientId,
        line_id: lineUid,
        line_display_name: profile.displayName || null,
        line_picture_url: profile.pictureUrl || null,
      }),
  ]);

  // UNIQUE違反（DB制約による重複防止）→ 再検索
  if (patientsErr?.code === "23505") {
    console.log("[webhook] UNIQUE violation on patients insert, re-querying:", lineUid);
    const retry = await findPatientByLineUid(lineUid, tenantId);
    if (retry) return retry;
  }

  if (intakeErr && intakeErr.code !== "23505") {
    console.error("[webhook] auto-create intake failed:", intakeErr.message);
  }
  if (patientsErr && patientsErr.code !== "23505") {
    console.error("[webhook] auto-create patients failed:", patientsErr.message);
  }
  if (intakeErr && patientsErr) {
    return null;
  }

  console.log(`[webhook] auto-created patient for ${lineUid} -> ${patientId} (${displayName})`);
  return { patient_id: patientId, patient_name: displayName, lineProfile: profile };
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
  tenantId?: string | null;
  keyword_reply_id?: number | null;
}) {
  // keyword_reply_id はカラム未作成時にINSERT全体が失敗するため、
  // 値がある場合のみペイロードに含める（カラム追加後は常に含めてOK）
  const payload: Record<string, unknown> = {
    ...tenantPayload(params.tenantId ?? null),
    patient_id: params.patient_id || null,
    line_uid: params.line_uid,
    direction: params.direction,
    event_type: params.event_type,
    message_type: params.message_type,
    content: params.content,
    status: params.status,
    postback_data: params.postback_data || null,
  };
  if (params.keyword_reply_id) {
    payload.keyword_reply_id = params.keyword_reply_id;
  }
  await supabaseAdmin.from("message_log").insert(payload);
  // friends-list Redisキャッシュ無効化（fire-and-forget）
  invalidateFriendsListCache(params.tenantId || DEFAULT_TENANT_ID).catch(() => {});
}

// =================================================================
// follow イベント処理
// =================================================================
async function handleFollow(lineUid: string, tenantId: string | null, accessToken: string) {
  console.log("[webhook] follow:", lineUid);

  const existingPatient = await findPatientByLineUid(lineUid, tenantId);
  const isReturning = !!existingPatient;
  const settingKey = isReturning ? "returning_blocked" : "new_friend";

  // PIDなしユーザーも自動作成
  const patient = existingPatient || await findOrCreatePatient(lineUid, tenantId, accessToken);

  // LINEプロフィール取得・更新
  const lineProfile = await getLineProfile(lineUid, accessToken);
  const displayName = patient?.patient_name || lineProfile.displayName;

  if (patient?.patient_id && (lineProfile.displayName || lineProfile.pictureUrl)) {
    await withTenant(
      supabaseAdmin
        .from("patients")
        .update({
          line_display_name: lineProfile.displayName || null,
          line_picture_url: lineProfile.pictureUrl || null,
        })
        .eq("patient_id", patient.patient_id),
      tenantId
    );
  }

  // friend_add_settings を取得
  const { data: setting } = await withTenant(
    supabaseAdmin
      .from("friend_add_settings")
      .select("setting_value, enabled")
      .eq("setting_key", settingKey)
      .maybeSingle(),
    tenantId
  );

  // ログ記録
  await logEvent({
    tenantId,
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
    actions?: Record<string, unknown>[];
  };

  // アクション詳細を記録する配列
  const actionDetails: string[] = [];

  // グリーティングメッセージ送信
  if (val.greeting_message) {
    const text = val.greeting_message
      .replace(/\{name\}/g, displayName)
      .replace(/\{patient_id\}/g, patient?.patient_id || "");

    await pushMessage(lineUid, [{ type: "text", text }], tenantId ?? undefined);
    await logEvent({
      tenantId,
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
          { ...tenantPayload(tenantId), patient_id: patient.patient_id, tag_id: tagId, assigned_by: "follow" },
          { onConflict: "patient_id,tag_id" }
        );
      const { data: tagDef } = await withTenant(supabaseAdmin.from("tag_definitions").select("name").eq("id", tagId).maybeSingle(), tenantId);
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
          ...tenantPayload(tenantId),
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
    const { data: menu } = await withTenant(
      supabaseAdmin
        .from("rich_menus")
        .select("line_rich_menu_id, name")
        .eq("id", Number(val.menu_change))
        .maybeSingle(),
      tenantId
    );

    if (menu?.line_rich_menu_id) {
      await fetch(`https://api.line.me/v2/bot/user/${lineUid}/richmenu/${menu.line_rich_menu_id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      console.log(`[webhook] follow: assigned rich menu ${val.menu_change} to ${lineUid}`);
      actionDetails.push(`メニュー[${menu.name || val.menu_change}]にする`);
    }
  }

  // アクション詳細をシステムイベントとして記録
  if (actionDetails.length > 0) {
    const trigger = isReturning ? "友だち再追加" : "友だち登録";
    await logEvent({
      tenantId,
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
    await autoAssignStatusByPatient(patient.patient_id, lineUid, tenantId, accessToken);
  }

  // ステップ配信: follow トリガーのシナリオにエンロール
  if (patient?.patient_id) {
    try {
      await checkFollowTriggerScenarios(patient.patient_id, lineUid, tenantId ?? undefined);
    } catch (e) {
      console.error("[webhook] step enrollment follow error:", e);
    }
  }
}

// =================================================================
// unfollow イベント処理
// =================================================================
async function handleUnfollow(lineUid: string, tenantId: string | null) {
  console.log("[webhook] unfollow:", lineUid);

  const patient = await findPatientByLineUid(lineUid, tenantId);

  await logEvent({
    tenantId,
    patient_id: patient?.patient_id,
    line_uid: lineUid,
    direction: "incoming",
    event_type: "unfollow",
    message_type: "event",
    content: "ブロック（友だち解除）",
    status: "received",
  });

  // ステップ配信: ブロック時に全アクティブシナリオを離脱
  if (patient?.patient_id) {
    try {
      await exitAllStepEnrollments(patient.patient_id, "blocked", tenantId ?? undefined);
    } catch (e) {
      console.error("[webhook] step exit on unfollow error:", e);
    }
  }
}

// =================================================================
// タグ＋リッチメニュー自動付与
//   ordersあり → 処方ずみタグ + 処方後メニュー
//   ordersなし & answerers.nameあり → 個人情報提出ずみタグ + 個人情報入力後メニュー
// =================================================================
async function autoAssignStatusByPatient(
  patientId: string,
  lineUid: string,
  tenantId: string | null,
  accessToken: string
) {
  try {
    if (patientId.startsWith("LINE_")) return;

    // ordersに1件でもあるか
    const { data: order } = await withTenant(
      supabaseAdmin
        .from("orders")
        .select("id")
        .eq("patient_id", patientId)
        .limit(1)
        .maybeSingle(),
      tenantId
    );

    let targetTagName: string;
    let targetMenuName: string;

    if (order) {
      targetTagName = "処方ずみ";
      targetMenuName = "処方後";
    } else {
      // answerers に名前が入っているか（個人情報提出済み）
      const { data: answerer } = await withTenant(
        supabaseAdmin
          .from("patients")
          .select("name, tel")
          .eq("patient_id", patientId)
          .maybeSingle(),
        tenantId
      );

      if (!answerer?.name) return;

      targetTagName = "個人情報提出ずみ";
      // リッチメニューはverify完了（tel登録済み）後のみ切り替え
      targetMenuName = answerer.tel ? "個人情報入力後" : "";
    }

    // タグ付与
    const { data: tagDef } = await withTenant(
      supabaseAdmin
        .from("tag_definitions")
        .select("id")
        .eq("name", targetTagName)
        .maybeSingle(),
      tenantId
    );

    if (tagDef) {
      const { data: existing } = await withTenant(
        supabaseAdmin
          .from("patient_tags")
          .select("tag_id")
          .eq("patient_id", patientId)
          .eq("tag_id", tagDef.id)
          .maybeSingle(),
        tenantId
      );

      if (!existing) {
        await supabaseAdmin
          .from("patient_tags")
          .upsert(
            { ...tenantPayload(tenantId), patient_id: patientId, tag_id: tagDef.id, assigned_by: "auto" },
            { onConflict: "patient_id,tag_id" }
          );
        console.log(`[webhook] auto-assigned ${targetTagName} tag to ${patientId}`);
      }
    }

    // 処方済みの場合、対応マークを「処方ずみ」（red）に自動設定
    if (order) {
      const { data: currentMark } = await withTenant(
        supabaseAdmin
          .from("patient_marks")
          .select("mark")
          .eq("patient_id", patientId)
          .maybeSingle(),
        tenantId
      );
      if (!currentMark || currentMark.mark !== "red") {
        await supabaseAdmin
          .from("patient_marks")
          .upsert(
            { ...tenantPayload(tenantId), patient_id: patientId, mark: "red", note: null, updated_at: new Date().toISOString(), updated_by: "auto" },
            { onConflict: "patient_id" }
          );
        console.log(`[webhook] auto-assigned 処方ずみ mark to ${patientId}`);
      }
    }

    // リッチメニュー切り替え（targetMenuNameが空の場合はスキップ）
    if (!targetMenuName) return;
    const { data: menu } = await withTenant(
      supabaseAdmin
        .from("rich_menus")
        .select("line_rich_menu_id")
        .eq("name", targetMenuName)
        .maybeSingle(),
      tenantId
    );

    if (menu?.line_rich_menu_id) {
      const currentRes = await fetch(`https://api.line.me/v2/bot/user/${lineUid}/richmenu`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const current = currentRes.ok ? await currentRes.json() : null;
      if (current?.richMenuId !== menu.line_rich_menu_id) {
        await fetch(`https://api.line.me/v2/bot/user/${lineUid}/richmenu/${menu.line_rich_menu_id}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
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
async function handleMessage(lineUid: string, message: { type: string; id?: string; text?: string; fileName?: string; title?: string; address?: string; packageId?: string; stickerId?: string }, tenantId: string | null, accessToken: string) {
  // PIDなしユーザーも自動作成してmessage_logにpatient_idを紐づける
  const patient = await findOrCreatePatient(lineUid, tenantId, accessToken);

  // findOrCreatePatient で取得済みのプロフィールでDB更新（追加API呼び出し不要）
  if (patient?.patient_id && "lineProfile" in patient && patient.lineProfile) {
    withTenant(
      supabaseAdmin.from("patients").update({
        line_display_name: patient.lineProfile.displayName || null,
        line_picture_url: patient.lineProfile.pictureUrl || null,
      }).eq("patient_id", patient.patient_id),
      tenantId
    ).then(() => {}, () => {});
  }

  // 処方済み患者の自動タグ＋リッチメニュー付与（非ブロッキング）
  if (patient?.patient_id) {
    autoAssignStatusByPatient(patient.patient_id, lineUid, tenantId, accessToken).catch(() => {});
  }

  let content = "";
  let msgType = message.type || "unknown";

  switch (message.type) {
    case "text":
      content = message.text || "";
      break;
    case "image": {
      const imageUrl = await downloadAndSaveImage(
        message.id!,
        patient?.patient_id || `uid_${lineUid.slice(-8)}`,
        accessToken
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
    tenantId,
    patient_id: patient?.patient_id,
    line_uid: lineUid,
    direction: "incoming",
    event_type: "message",
    message_type: msgType,
    content,
    status: "received",
  });

  // キーワード自動応答チェック（テキストメッセージのみ）
  let keywordMatched = false;
  if (message.type === "text" && message.text) {
    try {
      keywordMatched = await checkAndReplyKeyword(lineUid, patient, message.text, tenantId);
    } catch (e) {
      console.error("[webhook] keyword auto-reply error:", e);
    }

    // ステップ配信: keyword トリガーのシナリオにエンロール
    if (patient?.patient_id) {
      try {
        await checkKeywordTriggerScenarios(message.text, patient.patient_id, lineUid, tenantId ?? undefined);
      } catch (e) {
        console.error("[webhook] step enrollment keyword error:", e);
      }
    }
  }

  // チャットボット処理（キーワード未マッチ時、AI返信より優先）
  let chatbotHandled = false;
  if (message.type === "text" && message.text && patient?.patient_id && !keywordMatched) {
    try {
      chatbotHandled = await handleChatbotMessage(lineUid, patient.patient_id, message.text, tenantId);
    } catch (e) {
      console.error("[webhook] chatbot error:", e);
    }
  }

  // AI返信処理（テキスト・キーワード未マッチ・チャットボット未処理時のみ）
  if (message.type === "text" && message.text && patient?.patient_id && !keywordMatched && !chatbotHandled) {
    // 営業時間チェック: 営業時間外なら定型メッセージを送信してAI返信をスキップ
    try {
      const { withinHours, outsideMessage } = await isWithinBusinessHours(tenantId);
      if (!withinHours && outsideMessage) {
        console.log(`[webhook] 営業時間外: ${patient.patient_id} → 定型メッセージ送信`);
        await pushMessage(lineUid, [{ type: "text", text: outsideMessage }], tenantId ?? undefined);
        // 営業時間外メッセージをログに記録
        await supabaseAdmin.from("message_log").insert({
          ...tenantPayload(tenantId),
          patient_id: patient.patient_id,
          line_uid: lineUid,
          direction: "outgoing",
          event_type: "auto_reply",
          message_type: "individual",
          content: outsideMessage,
          status: "sent",
        });
        // AI返信処理はスキップ
      } else {
        // 営業時間内: 通常のAI返信フロー
        scheduleAiReply(lineUid, patient.patient_id, patient.patient_name, message.text, tenantId).catch(() => {});
        pendingAiReplyTargets.push({ lineUid, patientId: patient.patient_id, patientName: patient.patient_name, tenantId });
      }
    } catch (e) {
      console.error("[webhook] 営業時間チェックエラー（AI返信フローにフォールバック）:", e);
      scheduleAiReply(lineUid, patient.patient_id, patient.patient_name, message.text, tenantId).catch(() => {});
      pendingAiReplyTargets.push({ lineUid, patientId: patient.patient_id, patientName: patient.patient_name, tenantId });
    }
  }
}

// =================================================================
// キーワード自動応答
// =================================================================
async function checkAndReplyKeyword(
  lineUid: string,
  patient: { patient_id: string; patient_name: string } | null,
  text: string,
  tenantId: string | null
): Promise<boolean> {
  // 有効なルールを優先順位順に取得
  const { data: rules } = await withTenant(
    supabaseAdmin
      .from("keyword_auto_replies")
      .select("*")
      .eq("is_enabled", true)
      .order("priority", { ascending: false })
      .order("id", { ascending: true }),
    tenantId
  );

  if (!rules || rules.length === 0) return false;

  for (const rule of rules) {
    let matched = false;
    switch (rule.match_type) {
      case "exact":
        matched = text.trim() === rule.keyword;
        break;
      case "partial":
        matched = text.includes(rule.keyword);
        break;
      case "regex":
        try { matched = new RegExp(rule.keyword).test(text); } catch { matched = false; }
        break;
    }
    if (!matched) continue;

    // 条件ルールがある場合はチェック（簡易: タグ条件のみ対応）
    if (rule.condition_rules && Array.isArray(rule.condition_rules) && rule.condition_rules.length > 0 && patient?.patient_id) {
      const conditionMet = await evaluateConditionRules(patient.patient_id, rule.condition_rules, tenantId);
      if (!conditionMet) continue;
    }

    // マッチ → 応答送信
    console.log(`[webhook] keyword auto-reply matched: rule=${rule.name}, keyword=${rule.keyword}`);

    // トリガー回数をインクリメント（fire-and-forget）
    withTenant(
      supabaseAdmin
        .from("keyword_auto_replies")
        .update({ trigger_count: (rule.trigger_count || 0) + 1, last_triggered_at: new Date().toISOString() })
        .eq("id", rule.id),
      tenantId
    ).then(() => {});

    if (rule.reply_type === "text" && rule.reply_text) {
      // 変数置換
      let replyText = rule.reply_text;
      replyText = replyText.replace(/\{name\}/g, patient?.patient_name || "");
      replyText = replyText.replace(/\{patient_id\}/g, patient?.patient_id || "");
      replyText = replyText.replace(/\{send_date\}/g, new Date().toLocaleDateString("ja-JP"));

      await pushMessage(lineUid, [{ type: "text", text: replyText }], tenantId ?? undefined);

      // 送信ログ
      await logEvent({
        tenantId,
        patient_id: patient?.patient_id,
        line_uid: lineUid,
        direction: "outgoing",
        event_type: "auto_reply",
        message_type: "individual",
        content: replyText,
        status: "sent",
        keyword_reply_id: rule.id,
      });
    } else if (rule.reply_type === "template" && rule.reply_template_id) {
      // テンプレートからメッセージ取得して送信
      const { data: tpl } = await withTenant(
        supabaseAdmin
          .from("message_templates")
          .select("content, message_type, flex_content")
          .eq("id", rule.reply_template_id)
          .maybeSingle(),
        tenantId
      );

      if (tpl) {
        // Flexテンプレート対応（サニタイズ済み）
        if (tpl.message_type === "flex" && tpl.flex_content) {
          await pushMessage(lineUid, [{
            type: "flex",
            altText: tpl.content || "テンプレートメッセージ",
            contents: sanitizeFlexContents(tpl.flex_content) as Record<string, unknown>,
          }], tenantId ?? undefined);

          await logEvent({
            tenantId,
            patient_id: patient?.patient_id,
            line_uid: lineUid,
            direction: "outgoing",
            event_type: "auto_reply",
            message_type: "individual",
            content: tpl.content || "[Flexメッセージ]",
            status: "sent",
            keyword_reply_id: rule.id,
          });
        } else if (tpl.message_type === "image" && tpl.content) {
          await pushMessage(lineUid, [{
            type: "image",
            originalContentUrl: tpl.content,
            previewImageUrl: tpl.content,
          }], tenantId ?? undefined);

          await logEvent({
            tenantId,
            patient_id: patient?.patient_id,
            line_uid: lineUid,
            direction: "outgoing",
            event_type: "auto_reply",
            message_type: "individual",
            content: tpl.content,
            status: "sent",
            keyword_reply_id: rule.id,
          });
        } else if (tpl.content) {
          let tplContent = tpl.content;
          tplContent = tplContent.replace(/\{name\}/g, patient?.patient_name || "");
          tplContent = tplContent.replace(/\{patient_id\}/g, patient?.patient_id || "");

          await pushMessage(lineUid, [{ type: "text", text: tplContent }], tenantId ?? undefined);

          await logEvent({
            tenantId,
            patient_id: patient?.patient_id,
            line_uid: lineUid,
            direction: "outgoing",
            event_type: "auto_reply",
            message_type: "individual",
            content: tplContent,
            status: "sent",
            keyword_reply_id: rule.id,
          });
        }
      }
    }

    // 最初にマッチしたルールのみ実行（複数マッチは行わない）
    return true;
  }
  return false;
}

// 条件ルール評価（タグベース）
async function evaluateConditionRules(patientId: string, rules: { type: string; tag_id?: number; operator?: string }[], tenantId: string | null): Promise<boolean> {
  try {
    // 患者のタグIDを取得
    const { data: patientTags } = await withTenant(
      supabaseAdmin
        .from("patient_tags")
        .select("tag_id")
        .eq("patient_id", patientId),
      tenantId
    );

    const tagIds = new Set((patientTags || []).map((t: { tag_id: number }) => t.tag_id));

    for (const rule of rules) {
      if (rule.type === "tag" && rule.tag_id != null) {
        const hasTag = tagIds.has(rule.tag_id);
        if (rule.operator === "has" && !hasTag) return false;
        if (rule.operator === "not_has" && hasTag) return false;
      }
    }
    return true;
  } catch {
    return true; // 条件評価エラー時はマッチ扱い
  }
}

// =================================================================
// チャットボットメッセージ処理
// =================================================================
async function handleChatbotMessage(
  lineUid: string,
  patientId: string,
  text: string,
  tenantId: string | null,
): Promise<boolean> {
  // 1. アクティブセッションがあればそちらで処理
  const activeSession = await getActiveSession(patientId, tenantId);
  if (activeSession) {
    const response = await processUserInput(activeSession.id, text, tenantId);
    if (response) {
      if (response.type === "question" && response.buttons && response.buttons.length > 0) {
        // 選択肢付きメッセージ → Flex Message
        const flexMsg = {
          type: "flex" as const,
          altText: response.text || "チャットボット",
          contents: {
            type: "bubble",
            body: {
              type: "box",
              layout: "vertical",
              contents: [
                { type: "text", text: response.text, wrap: true, size: "md" },
                ...response.buttons.map((b: { label: string; value: string }) => ({
                  type: "button",
                  action: { type: "message", label: b.label, text: b.value },
                  style: "primary",
                  margin: "sm",
                  height: "sm",
                })),
              ],
            },
          },
        };
        await pushMessage(lineUid, [flexMsg as { type: "flex"; altText: string; contents: Record<string, unknown> }], tenantId ?? undefined);
      } else {
        await pushMessage(lineUid, [{ type: "text", text: response.text }], tenantId ?? undefined);
      }

      await logEvent({
        tenantId,
        patient_id: patientId,
        line_uid: lineUid,
        direction: "outgoing",
        event_type: "chatbot",
        message_type: "individual",
        content: response.text,
        status: "sent",
      });
      return true;
    }
    // セッション完了（response が null）→ 通常処理にフォールスルー
    return false;
  }

  // 2. キーワードトリガーでシナリオ開始
  const scenario = await findScenarioByKeyword(text, tenantId);
  if (!scenario) return false;

  const session = await startScenario(patientId, scenario.id, tenantId);
  if (!session) return false;

  const firstMsg = await getNextMessage(session.id, tenantId);
  if (!firstMsg) return false;

  if (firstMsg.type === "question" && firstMsg.buttons && firstMsg.buttons.length > 0) {
    const flexMsg = {
      type: "flex" as const,
      altText: firstMsg.text || "チャットボット",
      contents: {
        type: "bubble",
        body: {
          type: "box",
          layout: "vertical",
          contents: [
            { type: "text", text: firstMsg.text, wrap: true, size: "md" },
            ...firstMsg.buttons.map((b: { label: string; value: string }) => ({
              type: "button",
              action: { type: "message", label: b.label, text: b.value },
              style: "primary",
              margin: "sm",
              height: "sm",
            })),
          ],
        },
      },
    };
    await pushMessage(lineUid, [flexMsg as { type: "flex"; altText: string; contents: Record<string, unknown> }], tenantId ?? undefined);
  } else {
    await pushMessage(lineUid, [{ type: "text", text: firstMsg.text }], tenantId ?? undefined);
  }

  await logEvent({
    tenantId,
    patient_id: patientId,
    line_uid: lineUid,
    direction: "outgoing",
    event_type: "chatbot",
    message_type: "individual",
    content: firstMsg.text,
    status: "sent",
  });

  return true;
}

// =================================================================
// postback イベント処理（ユーザーからのリッチメニュー操作等）
// =================================================================
interface RichMenuAction {
  type: string;
  value?: string;
  mode?: string;
  fieldName?: string;
  operation?: string;
}

async function handleUserPostback(lineUid: string, postbackData: string, tenantId: string | null, accessToken: string) {
  const patient = await findOrCreatePatient(lineUid, tenantId, accessToken);

  // 処方済み患者の自動タグ＋リッチメニュー付与（非ブロッキング）
  if (patient?.patient_id) {
    autoAssignStatusByPatient(patient.patient_id, lineUid, tenantId, accessToken).catch(() => {});
  }

  // JSON形式（リッチメニューのaction type）を試行
  let parsed: { type?: string; actions?: RichMenuAction[]; userMessage?: string; provider?: string; [key: string]: unknown } | null = null;
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
    tenantId,
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
    await executeRichMenuActions(lineUid, patient, parsed.actions, tenantId, accessToken);
  }
}

// =================================================================
// リッチメニューアクション実行
// =================================================================
async function executeRichMenuActions(
  lineUid: string,
  patient: { patient_id: string; patient_name: string } | null,
  actions: RichMenuAction[],
  tenantId: string | null,
  accessToken: string
) {
  const actionDetails: string[] = [];

  for (const action of actions) {
    try {
      switch (action.type) {
        case "template_send": {
          if (!action.value) break;
          const { data: tmpl } = await withTenant(
            supabaseAdmin
              .from("message_templates")
              .select("content, name, message_type, flex_content")
              .eq("id", Number(action.value))
              .maybeSingle(),
            tenantId
          );
          if (!tmpl) break;

          const text = (tmpl.content || "")
            .replace(/\{name\}/g, patient?.patient_name || "")
            .replace(/\{patient_id\}/g, patient?.patient_id || "");

          // タイミング制御（即時以外は後で実装、今は即時送信）
          if (tmpl.message_type === "flex" && tmpl.flex_content) {
            // Flexテンプレート → サニタイズして送信
            await pushMessage(lineUid, [{
              type: "flex",
              altText: tmpl.name || "メッセージ",
              contents: sanitizeFlexContents(tmpl.flex_content) as Record<string, unknown>,
            }], tenantId ?? undefined);
            await logEvent({
              tenantId,
              patient_id: patient?.patient_id,
              line_uid: lineUid,
              direction: "outgoing",
              event_type: "postback",
              message_type: "individual",
              content: `[${tmpl.name}]`,
              status: "sent",
            });
            actionDetails.push(`Flex[${tmpl.name}]を送信`);
          } else if (tmpl.message_type === "image") {
            // 画像テンプレート → LINE image メッセージで送信
            await pushMessage(lineUid, [{
              type: "image",
              originalContentUrl: text,
              previewImageUrl: text,
            }], tenantId ?? undefined);
            await logEvent({
              tenantId,
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
            await pushMessage(lineUid, [{ type: "text", text }], tenantId ?? undefined);
            await logEvent({
              tenantId,
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
          const text = String(action.value)
            .replace(/\{name\}/g, patient?.patient_name || "")
            .replace(/\{patient_id\}/g, patient?.patient_id || "");

          await pushMessage(lineUid, [{ type: "text", text }], tenantId ?? undefined);
          await logEvent({
            tenantId,
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
          const { data: existing } = await withTenant(
            supabaseAdmin
              .from("tag_definitions")
              .select("id")
              .eq("name", action.value)
              .maybeSingle(),
            tenantId
          );

          if (existing) {
            tagId = existing.id;
          } else if ((action.mode || "add") === "add") {
            const { data: created } = await supabaseAdmin
              .from("tag_definitions")
              .insert({ ...tenantPayload(tenantId), name: action.value })
              .select("id")
              .single();
            tagId = created?.id || null;
          }

          if (!tagId) break;

          if ((action.mode || "add") === "add") {
            await supabaseAdmin
              .from("patient_tags")
              .upsert(
                { ...tenantPayload(tenantId), patient_id: patient.patient_id, tag_id: tagId, assigned_by: "richmenu" },
                { onConflict: "patient_id,tag_id" }
              );
            actionDetails.push(`タグ[${action.value}]を追加`);
          } else {
            await withTenant(
              supabaseAdmin
                .from("patient_tags")
                .delete()
                .eq("patient_id", patient.patient_id)
                .eq("tag_id", tagId),
              tenantId
            );
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
                  ...tenantPayload(tenantId),
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
          const { data: menu } = await withTenant(
            supabaseAdmin
              .from("rich_menus")
              .select("line_rich_menu_id, name")
              .eq("id", Number(action.value))
              .maybeSingle(),
            tenantId
          );

          if (menu?.line_rich_menu_id) {
            await fetch(`https://api.line.me/v2/bot/user/${lineUid}/richmenu/${menu.line_rich_menu_id}`, {
              method: "POST",
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            actionDetails.push(`メニュー[${menu.name || action.value}]にする`);
          }
          break;
        }

        case "friend_info": {
          if (!patient?.patient_id || !action.fieldName) break;
          // 友だち情報欄を更新
          const { data: fieldDef } = await withTenant(
            supabaseAdmin
              .from("friend_field_definitions")
              .select("id")
              .eq("name", action.fieldName)
              .maybeSingle(),
            tenantId
          );

          if (!fieldDef) break;

          const op = action.operation || "assign";
          if (op === "delete") {
            await withTenant(
              supabaseAdmin
                .from("friend_field_values")
                .delete()
                .eq("patient_id", patient.patient_id)
                .eq("field_id", fieldDef.id),
              tenantId
            );
            actionDetails.push(`友だち情報[${action.fieldName}]を削除`);
          } else {
            // 代入 or 追加
            const { data: current } = await withTenant(
              supabaseAdmin
                .from("friend_field_values")
                .select("value")
                .eq("patient_id", patient.patient_id)
                .eq("field_id", fieldDef.id)
                .maybeSingle(),
              tenantId
            );

            let newValue = action.value || "";
            if (op === "append" && current?.value) {
              newValue = current.value + newValue;
            }

            await supabaseAdmin
              .from("friend_field_values")
              .upsert(
                {
                  ...tenantPayload(tenantId),
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
      tenantId,
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
async function handleAdminPostback(groupId: string, dataStr: string, tenantId: string | null, notifyToken: string) {
  const q = parseQueryString(dataStr);

  // AI返信の承認/却下
  const aiAction = q["ai_reply_action"];
  const draftIdStr = q["draft_id"];
  if (aiAction && draftIdStr) {
    await handleAiReplyPostback(groupId, aiAction, Number(draftIdStr), tenantId, notifyToken);
    return;
  }

  // 再処方の承認/却下
  const action = q["reorder_action"];
  const reorderId = q["reorder_id"];

  if (!action || !reorderId) return;
  if (action !== "approve" && action !== "reject") return;

  const reorderNumber = Number(reorderId);
  if (!Number.isFinite(reorderNumber)) return;

  const { data: reorderData, error: selectError } = await withTenant(
    supabaseAdmin
      .from("reorders")
      .select("id, patient_id, status")
      .eq("reorder_number", reorderNumber)
      .single(),
    tenantId
  );

  if (selectError || !reorderData) {
    console.error("[LINE webhook] Reorder not found:", reorderNumber);
    await pushToGroup(
      groupId,
      `【再処方】${action === "approve" ? "承認" : "却下"} 失敗\n申請ID: ${reorderId}\n原因: DBにレコードが見つかりません`,
      notifyToken
    );
    return;
  }

  if (reorderData.status !== "pending") {
    await pushToGroup(
      groupId,
      `【再処方】この申請は既に処理済みです (${reorderData.status})\n申請ID: ${reorderId}`,
      notifyToken
    );
    return;
  }

  const { error: updateError } = await withTenant(
    supabaseAdmin
      .from("reorders")
      .update({
        status: action === "approve" ? "confirmed" : "rejected",
        ...(action === "approve"
          ? { approved_at: new Date().toISOString() }
          : { rejected_at: new Date().toISOString() }),
      })
      .eq("reorder_number", reorderNumber),
    tenantId
  );

  if (updateError) {
    console.error("[LINE webhook] DB update error:", updateError);
    await pushToGroup(
      groupId,
      `【再処方】${action === "approve" ? "承認" : "却下"} 失敗\n申請ID: ${reorderId}\n原因: DB更新エラー`,
      notifyToken
    );
    return;
  }

  console.log(`[LINE webhook] DB update success: ${action} reorder_num=${reorderNumber}`);

  if (reorderData.patient_id) {
    await invalidateDashboardCache(reorderData.patient_id);
  }

  // 患者へLINE通知（承認時のみ）
  if (action === "approve" && reorderData.patient_id) {
    const { data: patientRow } = await withTenant(
      supabaseAdmin
        .from("patients")
        .select("line_id")
        .eq("patient_id", reorderData.patient_id)
        .maybeSingle(),
      tenantId
    );

    let lineNotify: "sent" | "no_uid" | "failed" = "no_uid";
    if (patientRow?.line_id) {
      try {
        const pushRes = await pushMessage(patientRow.line_id, [{
          type: "text",
          text: "再処方申請が承認されました🌸\nマイページより決済のお手続きをお願いいたします。\n何かご不明な点がございましたら、お気軽にお知らせください🫧",
        }], tenantId ?? undefined);
        lineNotify = pushRes?.ok ? "sent" : "failed";
        if (pushRes?.ok) {
          await logEvent({
            tenantId,
            patient_id: reorderData.patient_id,
            line_uid: patientRow.line_id,
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

    await withTenant(
      supabaseAdmin
        .from("reorders")
        .update({ line_notify_result: lineNotify })
        .eq("reorder_number", reorderNumber),
      tenantId
    );
  }

  await pushToGroup(
    groupId,
    `【再処方】${action === "approve" ? "承認しました" : "却下しました"}\n申請ID: ${reorderId}`,
    notifyToken
  );
}

// =================================================================
// AI返信 承認/却下 postback処理
// =================================================================
async function handleAiReplyPostback(
  groupId: string,
  action: string,
  draftId: number,
  tenantId: string | null,
  notifyToken: string
) {
  if (action !== "approve" && action !== "reject") return;
  if (!Number.isFinite(draftId)) return;

  const { data: draft, error } = await withTenant(
    supabaseAdmin
      .from("ai_reply_drafts")
      .select("*")
      .eq("id", draftId)
      .single(),
    tenantId
  );

  if (error || !draft) {
    await pushToGroup(groupId, `【AI返信】処理失敗\n案件ID: ${draftId}\n原因: レコードが見つかりません`, notifyToken);
    return;
  }

  if (draft.status !== "pending") {
    await pushToGroup(groupId, `【AI返信】この案件は既に処理済みです (${draft.status})\n案件ID: ${draftId}`, notifyToken);
    return;
  }

  // 失効チェック
  if (draft.expires_at && new Date(draft.expires_at) < new Date()) {
    await supabaseAdmin.from("ai_reply_drafts").update({ status: "expired" }).eq("id", draftId);
    await pushToGroup(groupId, `【AI返信】この案件は有効期限切れです\n案件ID: ${draftId}`, notifyToken);
    return;
  }

  if (action === "approve") {
    await sendAiReply(draftId, draft.line_uid, draft.draft_reply, draft.patient_id, tenantId);
    await supabaseAdmin.from("ai_reply_drafts")
      .update({ status: "approved", approved_at: new Date().toISOString() })
      .eq("id", draftId);
    await pushToGroup(groupId, `【AI返信】承認・送信しました ✓\n案件ID: ${draftId}`, notifyToken);
  } else {
    await supabaseAdmin.from("ai_reply_drafts")
      .update({ status: "rejected", rejected_at: new Date().toISOString() })
      .eq("id", draftId);
    await pushToGroup(groupId, `【AI返信】却下しました\n案件ID: ${draftId}`, notifyToken);
  }
}

// =================================================================
// メインエントリーポイント
// =================================================================
export async function POST(req: NextRequest) {
  try {
    // ---- 署名検証（tenantId解決前なので環境変数フォールバックで先行実施）----
    const rawBody = await req.text();
    const signature = req.headers.get("x-line-signature") || "";

    const envSecrets = [
      process.env.LINE_MESSAGING_API_CHANNEL_SECRET,
      process.env.LINE_NOTIFY_CHANNEL_SECRET,
    ].filter(Boolean) as string[];

    if (envSecrets.length === 0) {
      return NextResponse.json({ ok: false, error: "LINE_CHANNEL_SECRET missing" }, { status: 500 });
    }

    if (!verifyLineSignature(rawBody, signature, envSecrets)) {
      return NextResponse.json({ ok: false, error: "invalid signature" }, { status: 401 });
    }

    // ---- tenantId解決 ----
    // LINE webhookはLINEプラットフォームからの直接リクエストのためsubdomain解決不可。
    // channel_secret → tenant のマッピングで特定するのが理想だが、
    // 現状シングルテナント運用のためDEFAULT_TENANT_IDにフォールバック。
    // マルチテナント化時は channel_secret ベースのテナント解決に置換すること。
    const resolvedTenantId = resolveTenantId(req);
    if (!resolvedTenantId) {
      console.warn("[line/webhook] テナントID解決失敗 — DEFAULT_TENANT_IDにフォールバック");
    }
    const tenantId = resolvedTenantId ?? DEFAULT_TENANT_ID;
    const tid = tenantId ?? undefined;

    const messagingSecret = await getSettingOrEnv("line", "channel_secret", "LINE_MESSAGING_API_CHANNEL_SECRET", tid);
    const notifySecret = await getSettingOrEnv("line", "notify_channel_secret", "LINE_NOTIFY_CHANNEL_SECRET", tid);
    const LINE_CHANNEL_SECRETS = [messagingSecret, notifySecret].filter(Boolean) as string[];

    // DB設定が環境変数と異なる場合、DB設定でも署名を再検証
    const dbSecretsStr = LINE_CHANNEL_SECRETS.sort().join(",");
    const envSecretsStr = [...envSecrets].sort().join(",");
    if (dbSecretsStr !== envSecretsStr && !verifyLineSignature(rawBody, signature, LINE_CHANNEL_SECRETS)) {
      return NextResponse.json({ ok: false, error: "invalid signature" }, { status: 401 });
    }

    const LINE_ACCESS_TOKEN = (await getSettingOrEnv("line", "channel_access_token", "LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN", tid))
      || (await getSettingOrEnv("line", "notify_channel_access_token", "LINE_NOTIFY_CHANNEL_ACCESS_TOKEN", tid))
      || "";
    const LINE_NOTIFY_TOKEN = (await getSettingOrEnv("line", "notify_channel_access_token", "LINE_NOTIFY_CHANNEL_ACCESS_TOKEN", tid))
      || LINE_ACCESS_TOKEN;
    const LINE_ADMIN_GROUP_ID = (await getSettingOrEnv("line", "admin_group_id", "LINE_ADMIN_GROUP_ID", tid)) || "";

    const body = JSON.parse(rawBody);
    const events = Array.isArray(body?.events) ? body.events : [];

    for (const ev of events) {
      const sourceType: string = ev?.source?.type || "";
      const groupId: string = ev?.source?.groupId || "";
      const lineUid: string = ev?.source?.userId || "";

      // 冪等チェック（LINEリトライ時の重複処理防止）
      const lineEventId = (ev as Record<string, unknown>)?.webhookEventId as string | undefined;
      let idem: Awaited<ReturnType<typeof checkIdempotency>> | null = null;
      if (lineEventId) {
        idem = await checkIdempotency("line", lineEventId, tenantId, { type: ev.type, userId: ev.source?.userId });
        if (idem.duplicate) {
          console.log(`[webhook] LINE duplicate event skipped: ${lineEventId}`);
          continue;
        }
      }

      try {
        // ===== 管理グループからのイベント =====
        if (groupId === LINE_ADMIN_GROUP_ID) {
          if (ev?.type === "postback") {
            await handleAdminPostback(groupId, ev.postback?.data || "", tenantId, LINE_NOTIFY_TOKEN);
          }
          await idem?.markCompleted();
          continue;
        }

        // ===== 個人ユーザーからのイベント =====
        if (sourceType === "user" && lineUid) {
          // 連打防止（message / postback のみ対象）
          if (ev.type === "message" || ev.type === "postback") {
            const burst = await checkSpamBurst(lineUid);
            if (burst.blocked) {
              console.log("[webhook] burst blocked:", lineUid, ev.type);
              if (burst.shouldNotify) {
                const patient = await findOrCreatePatient(lineUid, tenantId, LINE_ACCESS_TOKEN);
                await logEvent({
                  tenantId,
                  patient_id: patient?.patient_id,
                  line_uid: lineUid,
                  direction: "incoming",
                  event_type: "system",
                  message_type: "system",
                  content: "リッチメニューなどの連打が検知されたためメッセージの処理をスキップします。",
                  status: "skipped",
                });
              }
              await idem?.markCompleted();
              continue;
            }
          }

          switch (ev.type) {
            case "follow":
              await handleFollow(lineUid, tenantId, LINE_ACCESS_TOKEN);
              break;

            case "unfollow":
              await handleUnfollow(lineUid, tenantId);
              break;

            case "message":
              await handleMessage(lineUid, ev.message || {}, tenantId, LINE_ACCESS_TOKEN);
              break;

            case "postback":
              await handleUserPostback(lineUid, ev.postback?.data || "", tenantId, LINE_ACCESS_TOKEN);
              break;

            default:
              console.log("[webhook] Unhandled event type:", ev.type);
          }
        }

        await idem?.markCompleted();
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "unknown error";
        await idem?.markFailed(errMsg);
        notifyWebhookFailure("line", lineEventId || "unknown", err, tenantId ?? undefined).catch(() => {});
        console.error(`[webhook] LINE event error (${ev.type}):`, err);
        // エラーがあっても次のイベントは処理を続行
        continue;
      }
    }

    // LINEには常に200（再送防止）
    // レスポンス後にAI返信を直接処理（3秒待機でメッセージバッチング）
    const targets = [...pendingAiReplyTargets];
    pendingAiReplyTargets = [];
    if (targets.length > 0) {
      after(async () => {
        await new Promise(r => setTimeout(r, 3_000));
        for (const t of targets) {
          const lockKey = `ai-reply:${t.patientId}`;
          const lock = await acquireLock(lockKey, 30);
          if (!lock.acquired) continue;
          try {
            await processAiReply(t.lineUid, t.patientId, t.patientName, t.tenantId);
            // 処理成功 → Redisデバウンスキーを削除してcron重複を防止
            await clearAiReplyDebounce(t.patientId);
          } catch (err) {
            console.error(`[webhook] after() AI reply error: patient=${t.patientId}`, err);
          } finally {
            await lock.release();
          }
        }
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("LINE webhook fatal error", e);
    return NextResponse.json({ ok: false, error: "unexpected error" }, { status: 500 });
  }
}
