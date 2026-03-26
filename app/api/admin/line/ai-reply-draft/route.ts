// AI返信ドラフト取得API（管理画面トーク画面用）
// GET: patient_id で pending ドラフトを取得
// POST: ドラフトの送信・却下・再生成

import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveTenantId, withTenant } from "@/lib/tenant";
import Anthropic from "@anthropic-ai/sdk";
import { sendAiReply, buildSystemPrompt, type RejectedDraftEntry } from "@/lib/ai-reply";
import { saveAiReplyExample, boostExampleQuality, penalizeExampleQuality, executeRAGPipeline } from "@/lib/embedding";
import { getSettingOrEnv } from "@/lib/settings";
import { parseBody } from "@/lib/validations/helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

// GET: 患者IDのpendingドラフトを取得
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantId(req);
  const patientId = req.nextUrl.searchParams.get("patient_id");
  if (!patientId) return badRequest("patient_id が必要です");

  const { data, error } = await withTenant(
    supabaseAdmin
      .from("ai_reply_drafts")
      .select("id, patient_id, line_uid, original_message, draft_reply, status, ai_category, confidence, model_used, created_at")
      .eq("patient_id", patientId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    tenantId
  );

  if (error) return serverError(error.message);
  if (!data) return NextResponse.json({ draft: null });

  return NextResponse.json({ draft: data });
}

// POST: ドラフトに対するアクション（send / reject / regenerate）
const actionSchema = z.object({
  draft_id: z.number(),
  action: z.enum(["send", "reject", "regenerate"]),
  modified_reply: z.string().optional(),
  reject_reason: z.string().optional(),
  instruction: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantId(req);
  const parsed = await parseBody(req, actionSchema);
  if ("error" in parsed) return parsed.error;
  const { draft_id, action, modified_reply, reject_reason, instruction } = parsed.data;

  // ドラフト取得
  const { data: draft, error } = await withTenant(
    supabaseAdmin
      .from("ai_reply_drafts")
      .select("*")
      .eq("id", draft_id)
      .single(),
    tenantId
  );

  if (error || !draft) return badRequest("ドラフトが見つかりません");
  if (draft.status !== "pending") return badRequest("このドラフトは既に処理済みです");

  // 送信
  if (action === "send") {
    const replyText = modified_reply || draft.draft_reply;

    // modified_reply を記録
    if (modified_reply && modified_reply !== draft.draft_reply) {
      await supabaseAdmin
        .from("ai_reply_drafts")
        .update({ modified_reply })
        .eq("id", draft_id);
    }

    await sendAiReply(draft_id, draft.line_uid, replyText, draft.patient_id, draft.tenant_id);

    // 学習例として保存 + 品質スコア向上
    try {
      await saveAiReplyExample({
        tenantId: draft.tenant_id,
        question: draft.original_message,
        answer: replyText,
        source: modified_reply ? "staff_edit" : "staff_edit",
        draftId: draft.id,
      });
      await boostExampleQuality(draft.id);
    } catch (err) {
      console.error("[AI Reply Admin] 学習例保存エラー:", err);
    }

    return NextResponse.json({ ok: true, action: "sent" });
  }

  // 却下
  if (action === "reject") {
    await supabaseAdmin
      .from("ai_reply_drafts")
      .update({
        status: "rejected",
        rejected_at: new Date().toISOString(),
        reject_reason: reject_reason || "管理画面から却下",
        reject_category: "other",
      })
      .eq("id", draft_id);

    penalizeExampleQuality(draft_id).catch(() => {});
    return NextResponse.json({ ok: true, action: "rejected" });
  }

  // 再生成
  if (action === "regenerate") {
    if (!instruction) return badRequest("修正指示が必要です");

    const tid = draft.tenant_id ?? undefined;
    const apiKey = (await getSettingOrEnv("general", "anthropic_api_key", "ANTHROPIC_API_KEY", tid)) || "";
    if (!apiKey) return serverError("APIキー未設定");

    const { data: settings } = await withTenant(
      supabaseAdmin.from("ai_reply_settings").select("knowledge_base, custom_instructions, medical_reply_mode, model_id").maybeSingle(),
      draft.tenant_id
    );
    const modelId = settings?.model_id || "claude-sonnet-4-6";

    // RAGパイプライン
    const ragResult = await executeRAGPipeline({
      pendingMessages: [draft.original_message],
      contextMessages: [],
      tenantId: draft.tenant_id,
      knowledgeBase: settings?.knowledge_base || "",
    });

    // 却下パターン
    const { data: rejectedDrafts } = await withTenant(
      supabaseAdmin.from("ai_reply_drafts")
        .select("original_message, draft_reply, reject_category, reject_reason")
        .eq("status", "rejected")
        .order("rejected_at", { ascending: false })
        .limit(10),
      draft.tenant_id
    );

    const client = new Anthropic({ apiKey });
    const systemPrompt = buildSystemPrompt(
      settings?.knowledge_base || "",
      settings?.custom_instructions || "",
      (rejectedDrafts as RejectedDraftEntry[] | null) ?? undefined,
      ragResult.examples,
      settings?.medical_reply_mode || "confirm",
      false,
      ragResult.knowledgeChunks
    );

    const userMessage = `以下のAI返信案をスタッフの修正指示に従って改善してください。

## 患者からの元メッセージ
${draft.original_message}

## 現在のAI返信案
${draft.draft_reply}

## 修正指示
${instruction}

修正後の返信テキストのみを出力してください。JSON形式は不要です。`;

    try {
      const response = await client.messages.create({
        model: modelId,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      });

      const newReply = response.content[0].type === "text" ? response.content[0].text.trim() : "";
      if (!newReply) return serverError("AIからの返信が空です");

      await supabaseAdmin
        .from("ai_reply_drafts")
        .update({ draft_reply: newReply })
        .eq("id", draft_id);

      return NextResponse.json({ ok: true, action: "regenerated", newReply });
    } catch (err) {
      console.error("[AI Reply Admin] 再生成エラー:", err);
      return serverError("AI再生成に失敗しました");
    }
  }

  return badRequest("無効なアクション");
}
