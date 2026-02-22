// AI返信ドラフト却下API（修正ページから却下）

import { NextRequest, NextResponse } from "next/server";
import { verifyDraftSignature } from "@/lib/ai-reply-sign";
import { supabaseAdmin } from "@/lib/supabase";
import { parseBody } from "@/lib/validations/helpers";
import { aiReplyRejectSchema } from "@/lib/validations/ai-reply";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ draftId: string }> }
) {
  const { draftId: draftIdStr } = await params;
  const draftId = parseInt(draftIdStr, 10);
  if (isNaN(draftId)) {
    return NextResponse.json({ error: "無効なID" }, { status: 400 });
  }

  const parsed = await parseBody(request, aiReplyRejectSchema);
  if ("error" in parsed) return parsed.error;
  const { sig, exp, reason, reject_category } = parsed.data;

  if (!verifyDraftSignature(draftId, exp, sig)) {
    return NextResponse.json({ error: "署名が無効または期限切れです" }, { status: 403 });
  }

  const { data: draft } = await supabaseAdmin
    .from("ai_reply_drafts")
    .select("status")
    .eq("id", draftId)
    .single();

  if (!draft) {
    return NextResponse.json({ error: "ドラフトが見つかりません" }, { status: 404 });
  }

  if (draft.status !== "pending") {
    return NextResponse.json({ error: "このドラフトは既に処理済みです" }, { status: 400 });
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

  return NextResponse.json({ ok: true });
}
