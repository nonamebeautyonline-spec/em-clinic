import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { pushMessage } from "@/lib/line-push";
import { resolveTenantId, withTenant, tenantPayload } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { lineSendSchema } from "@/lib/validations/line-broadcast";
import { handleImplicitAiFeedback } from "@/lib/ai-reply";

// LINE Flex Message仕様で許可されたプロパティのみ残すサニタイズ
// バブルコンテナの許可プロパティ（LINE Messaging API公式仕様準拠）
const VALID_BUBBLE_KEYS = new Set([
  "type", "size", "direction", "header", "hero", "body", "footer", "styles", "action",
]);

// バブルらしきオブジェクトか判定（header/hero/body/footerのいずれかを持つ）
function looksLikeBubble(obj: Record<string, unknown>): boolean {
  return !!(obj.header || obj.hero || obj.body || obj.footer);
}

/**
 * Flexコンテナ（bubble/carousel）をLINE API仕様に準拠するようサニタイズ
 * - 不明なプロパティを除去
 * - type: "bubble" を確実に設定
 * - 再帰的にcarousel内のバブルも処理
 */
function sanitizeFlexContainer(raw: unknown, depth = 0): unknown {
  if (depth > 5 || !raw || typeof raw !== "object") return raw;

  // 配列 → カルーセルにラップ（単一要素は取り出し）
  if (Array.isArray(raw)) {
    const items = raw.map(item => sanitizeFlexContainer(item, depth + 1));
    return items.length === 1 ? items[0] : { type: "carousel", contents: items };
  }

  const obj = raw as Record<string, unknown>;

  // { type: "flex", contents: X } → Xをアンラップして再帰
  if (obj.type === "flex" && obj.contents) {
    return sanitizeFlexContainer(obj.contents, depth + 1);
  }

  // carousel → contentsのみ保持して再帰
  if (obj.type === "carousel" && Array.isArray(obj.contents)) {
    return {
      type: "carousel",
      contents: (obj.contents as unknown[]).map(item => sanitizeFlexContainer(item, depth + 1)),
    };
  }

  // バブルコンテナ → 許可プロパティのみ残す（type: "bubble" を最初に配置）
  if (obj.type === "bubble" || looksLikeBubble(obj)) {
    const cleaned: Record<string, unknown> = { type: "bubble" };
    for (const key of Object.keys(obj)) {
      if (key !== "type" && VALID_BUBBLE_KEYS.has(key)) {
        cleaned[key] = obj[key];
      }
    }
    return cleaned;
  }

  return obj;
}

// 個別メッセージ送信
export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);

  const parsed = await parseBody(req, lineSendSchema);
  if ("error" in parsed) return parsed.error;
  const { patient_id, message, message_type, flex, template_name } = parsed.data;
  if (!message?.trim() && !flex) {
    return NextResponse.json({ error: "message または flex は必須です" }, { status: 400 });
  }

  // 患者の LINE UID・名前を patients テーブルから取得
  const { data: patient } = await withTenant(
    supabaseAdmin.from("patients").select("name, line_id").eq("patient_id", patient_id),
    tenantId
  ).maybeSingle();

  if (!patient?.line_id) {
    // メッセージログに記録（失敗）
    await supabaseAdmin.from("message_log").insert({
      ...tenantPayload(tenantId),
      patient_id,
      event_type: "message",
      message_type: "individual",
      content: message,
      status: "no_uid",
      direction: "outgoing",
    });
    return NextResponse.json({ error: "LINE UIDが見つかりません", status: "no_uid" }, { status: 400 });
  }

  // Flex Message送信
  if (message_type === "flex" && flex) {
    // flex全体をサニタイズ（不要プロパティ除去、型補完、配列→carousel変換）
    const rawFlex = flex as Record<string, unknown>;
    const rawContents = rawFlex.contents ?? rawFlex;
    let contents = sanitizeFlexContainer(rawContents);

    // 最終安全チェック: サニタイズ後もまだ配列なら強制carousel化
    if (Array.isArray(contents)) {
      contents = contents.length === 1 ? contents[0] : { type: "carousel", contents };
    }

    const flexMsg = { type: "flex" as const, altText: (rawFlex.altText as string) || "Flex Message", contents };

    // デバッグ: LINE APIに送信するFlexメッセージの構造をログ
    const contentsObj = contents as Record<string, unknown>;
    console.log("[FLEX_SEND] structure:", JSON.stringify({
      contentsType: contentsObj?.type,
      keys: Object.keys(contentsObj || {}),
      firstItemKeys: contentsObj?.type === "carousel" && Array.isArray(contentsObj?.contents)
        ? Object.keys((contentsObj.contents as Record<string, unknown>[])[0] || {})
        : undefined,
      firstItemType: contentsObj?.type === "carousel" && Array.isArray(contentsObj?.contents)
        ? ((contentsObj.contents as Record<string, unknown>[])[0] || {}).type
        : undefined,
    }));
    console.log("[FLEX_SEND] payload:", JSON.stringify(flexMsg).substring(0, 3000));

    const res = await pushMessage(patient.line_id, [flexMsg], tenantId ?? undefined);

    // pushMessageがnullを返す = トークン未設定
    if (!res) {
      await supabaseAdmin.from("message_log").insert({
        ...tenantPayload(tenantId),
        patient_id,
        line_uid: patient.line_id,
        event_type: "message",
        message_type: "flex",
        content: `[${(flexMsg.altText as string) || "Flex Message"}]`,
        flex_json: flexMsg.contents,
        status: "failed",
        direction: "outgoing",
      });
      return NextResponse.json({ ok: false, error: "LINEチャネルアクセストークンが未設定です", status: "failed" }, { status: 500 });
    }

    // LINE APIエラーの場合は詳細を取得
    let lineError = "";
    if (!res.ok) {
      lineError = await res.text().catch(() => "");
    }
    const status = res.ok ? "sent" : "failed";

    await supabaseAdmin.from("message_log").insert({
      ...tenantPayload(tenantId),
      patient_id,
      line_uid: patient.line_id,
      event_type: "message",
      message_type: "flex",
      content: `[${(flexMsg.altText as string) || "Flex Message"}]`,
      flex_json: flexMsg.contents,
      status,
      direction: "outgoing",
    });

    if (!res.ok) {
      console.error("[Flex Send] LINE API Error:", lineError);
      // デバッグ: エラー時にコンテナ構造情報を返す
      const debugKeys = contentsObj?.type === "carousel" && Array.isArray(contentsObj?.contents)
        ? `carousel[${(contentsObj.contents as unknown[]).length}] item0keys=${Object.keys((contentsObj.contents as Record<string, unknown>[])[0] || {}).join(",")}`
        : `${contentsObj?.type} keys=${Object.keys(contentsObj || {}).join(",")}`;
      return NextResponse.json({
        ok: false,
        error: `LINE API エラー: ${lineError}`,
        status: "failed",
        _debug: debugKeys,
        _payload: JSON.stringify(flexMsg).substring(0, 500),
      });
    }
    return NextResponse.json({ ok: true, status: "sent", patient_name: patient.name });
  }

  // 次回予約を取得（キャンセル済み除外、本日以降で最も近いもの）
  const { data: nextReservation } = await withTenant(
    supabaseAdmin.from("reservations").select("reserved_date, reserved_time").eq("patient_id", patient_id).neq("status", "canceled").gte("reserved_date", new Date().toISOString().split("T")[0]).order("reserved_date", { ascending: true }).order("reserved_time", { ascending: true }).limit(1),
    tenantId
  ).maybeSingle();

  // テンプレート変数を置換
  const resolvedMessage = (message || "")
    .replace(/\{name\}/g, patient.name || "")
    .replace(/\{patient_id\}/g, patient_id)
    .replace(/\{send_date\}/g, new Date().toLocaleDateString("ja-JP"))
    .replace(/\{next_reservation_date\}/g, nextReservation?.reserved_date || "")
    .replace(/\{next_reservation_time\}/g, nextReservation?.reserved_time?.substring(0, 5) || "");

  // LINE Push送信（画像テンプレートの場合は image メッセージ）
  const lineMessage = message_type === "image"
    ? { type: "image" as const, originalContentUrl: resolvedMessage, previewImageUrl: resolvedMessage }
    : { type: "text" as const, text: resolvedMessage };
  const res = await pushMessage(patient.line_id, [lineMessage], tenantId ?? undefined);

  if (!res) {
    await supabaseAdmin.from("message_log").insert({
      ...tenantPayload(tenantId),
      patient_id,
      line_uid: patient.line_id,
      event_type: "message",
      message_type: "individual",
      content: resolvedMessage,
      status: "failed",
      direction: "outgoing",
    });
    return NextResponse.json({ ok: false, error: "LINEチャネルアクセストークンが未設定です", status: "failed" }, { status: 500 });
  }

  // LINE APIエラーの場合は詳細を取得
  let lineError = "";
  if (!res.ok) {
    lineError = await res.text().catch(() => "");
  }
  const status = res.ok ? "sent" : "failed";

  // メッセージログに記録（画像テンプレは【テンプレ名】URL形式で保存）
  const logContent = message_type === "image" && template_name
    ? `【${template_name}】${resolvedMessage}`
    : resolvedMessage;
  await supabaseAdmin.from("message_log").insert({
    ...tenantPayload(tenantId),
    patient_id,
    line_uid: patient.line_id,
    event_type: "message",
    message_type: "individual",
    content: logContent,
    status,
    direction: "outgoing",
  });

  if (!res.ok) {
    return NextResponse.json({ ok: false, error: `LINE API エラー: ${lineError}`, status: "failed" });
  }

  // スタッフ手動返信 → pending AIドラフトがあれば暗黙フィードバック（fire-and-forget）
  if (message_type !== "image") {
    handleImplicitAiFeedback(patient_id, resolvedMessage, tenantId).catch(() => {});
  }

  return NextResponse.json({ ok: true, status: "sent", patient_name: patient.name });
}
