// AI返信ドラフト却下API（修正ページから却下）

import { NextRequest, NextResponse } from "next/server";
import { badRequest, forbidden, notFound } from "@/lib/api-error";
import { verifyDraftSignature } from "@/lib/ai-reply-sign";
import { supabaseAdmin } from "@/lib/supabase";
import { penalizeExampleQuality } from "@/lib/embedding";
import { parseBody } from "@/lib/validations/helpers";
import { aiReplyRejectSchema } from "@/lib/validations/ai-reply";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ draftId: string }> }
) {
  const { draftId: draftIdStr } = await params;
  const draftId = parseInt(draftIdStr, 10);
  if (isNaN(draftId)) {
    return badRequest("無効なID");
  }

  const parsed = await parseBody(request, aiReplyRejectSchema);
  if ("error" in parsed) return parsed.error;
  const { sig, exp, reason, reject_category } = parsed.data;

  if (!verifyDraftSignature(draftId, exp, sig)) {
    return forbidden("署名が無効または期限切れです");
  }

  const { data: draft } = await supabaseAdmin
    .from("ai_reply_drafts")
    .select("status")
    .eq("id", draftId)
    .single();

  if (!draft) {
    return notFound("ドラフトが見つかりません");
  }

  if (draft.status !== "pending") {
    return badRequest("このドラフトは既に処理済みです");
  }

  // 却下理由を含めて更新
  const updatePayload: Record<string, unknown> = {
    status: "rejected",
    rejected_at: new Date().toISOString(),
  };
  if (reject_category) updatePayload.reject_category = reject_category;
  if (reason) updatePayload.reject_reason = reason;

  await supabaseAdmin
    .from("ai_reply_drafts")
    .update(updatePayload)
    .eq("id", draftId);

  // 却下された → 関連する学習例の品質スコアを低下（却下理由による重み付け）
  penalizeExampleQuality(draftId, reject_category ?? undefined).catch(err => {
    console.error("[AI Reply] 品質スコア低下エラー:", err);
  });

  return NextResponse.json({ ok: true });
}
