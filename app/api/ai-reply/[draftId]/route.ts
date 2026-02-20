// AI返信ドラフト取得API（署名付きURL認証）

import { NextResponse } from "next/server";
import { verifyDraftSignature } from "@/lib/ai-reply-sign";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ draftId: string }> }
) {
  const { draftId: draftIdStr } = await params;
  const draftId = parseInt(draftIdStr, 10);
  if (isNaN(draftId)) {
    return NextResponse.json({ error: "無効なID" }, { status: 400 });
  }

  const url = new URL(request.url);
  const sig = url.searchParams.get("sig") || "";
  const exp = parseInt(url.searchParams.get("exp") || "0", 10);

  if (!verifyDraftSignature(draftId, exp, sig)) {
    return NextResponse.json({ error: "署名が無効または期限切れです" }, { status: 403 });
  }

  const { data: draft, error } = await supabaseAdmin
    .from("ai_reply_drafts")
    .select("id, patient_id, original_message, draft_reply, status, ai_category, confidence")
    .eq("id", draftId)
    .single();

  if (error || !draft) {
    return NextResponse.json({ error: "ドラフトが見つかりません" }, { status: 404 });
  }

  // 患者名を取得
  const { data: patient } = await supabaseAdmin
    .from("patients")
    .select("name")
    .eq("patient_id", draft.patient_id)
    .maybeSingle();

  return NextResponse.json({
    id: draft.id,
    patientId: draft.patient_id,
    patientName: patient?.name || draft.patient_id,
    originalMessage: draft.original_message,
    draftReply: draft.draft_reply,
    status: draft.status,
    category: draft.ai_category,
    confidence: draft.confidence,
  });
}
