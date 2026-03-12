// AI返信ドラフト送信API（修正後の返信を患者にLINE送信）

import { NextRequest, NextResponse } from "next/server";
import { badRequest, forbidden, notFound } from "@/lib/api-error";
import { verifyDraftSignature } from "@/lib/ai-reply-sign";
import { supabaseAdmin } from "@/lib/supabase";
import { sendAiReply } from "@/lib/ai-reply";
import { saveAiReplyExample } from "@/lib/embedding";
import { getSettingOrEnv } from "@/lib/settings";
import { parseBody } from "@/lib/validations/helpers";
import { aiReplySendSchema } from "@/lib/validations/ai-reply";
import { resolveTenantId, withTenant } from "@/lib/tenant";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ draftId: string }> }
) {
  const { draftId: draftIdStr } = await params;
  const draftId = parseInt(draftIdStr, 10);
  if (isNaN(draftId)) {
    return badRequest("無効なID");
  }

  const parsed = await parseBody(request, aiReplySendSchema);
  if ("error" in parsed) return parsed.error;
  const { sig, exp } = parsed.data;

  if (!verifyDraftSignature(draftId, exp, sig)) {
    return forbidden("署名が無効または期限切れです");
  }

  const tenantId = resolveTenantId(request);

  // ドラフト取得
  const { data: draft, error } = await withTenant(supabaseAdmin
    .from("ai_reply_drafts")
    .select("*")
    .eq("id", draftId)
    .single(), tenantId);

  if (error || !draft) {
    return notFound("ドラフトが見つかりません");
  }

  if (draft.status !== "pending") {
    return badRequest("このドラフトは既に処理済みです");
  }

  // 患者にLINE送信
  await sendAiReply(draftId, draft.line_uid, draft.draft_reply, draft.patient_id, draft.tenant_id);

  // modified_reply を保存（初期案と異なる場合のみ、ナレッジ学習用）
  // ※ sendAiReply内で status は sent に更新済み
  const { data: updatedDraft } = await withTenant(supabaseAdmin
    .from("ai_reply_drafts")
    .select("status")
    .eq("id", draftId)
    .single(), tenantId);

  if (updatedDraft?.status === "sent") {
    // modified_reply を記録
    await withTenant(supabaseAdmin
      .from("ai_reply_drafts")
      .update({ modified_reply: draft.draft_reply })
      .eq("id", draftId), tenantId);

    // 学習例として保存（embedding付き）
    try {
      await saveAiReplyExample({
        tenantId: draft.tenant_id,
        question: draft.original_message,
        answer: draft.draft_reply,
        source: "staff_edit",
        draftId: draft.id,
      });
    } catch (err) {
      console.error("[AI Reply] 学習例保存エラー:", err);
    }

    // 管理グループに通知
    try {
      const tenantId = draft.tenant_id ?? undefined;
      const notifyToken = (await getSettingOrEnv(
        "line", "notify_channel_access_token",
        "LINE_NOTIFY_CHANNEL_ACCESS_TOKEN", tenantId
      )) || "";
      const adminGroupId = (await getSettingOrEnv(
        "line", "admin_group_id",
        "LINE_ADMIN_GROUP_ID", tenantId
      )) || "";

      if (notifyToken && adminGroupId) {
        await fetch("https://api.line.me/v2/bot/message/push", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${notifyToken}`,
          },
          body: JSON.stringify({
            to: adminGroupId,
            messages: [{
              type: "text",
              text: `[AI返信] 修正して送信しました\n患者: ${draft.patient_id}\n内容: ${draft.draft_reply.substring(0, 100)}${draft.draft_reply.length > 100 ? "..." : ""}`,
            }],
          }),
          cache: "no-store",
        });
      }
    } catch (err) {
      console.error("[AI Reply] 管理グループ通知エラー:", err);
    }
  }

  return NextResponse.json({ ok: true });
}
