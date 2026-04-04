// AI返信ドラフト再生成API（修正指示でClaude再呼び出し）

import { NextRequest, NextResponse } from "next/server";
import { badRequest, forbidden, notFound, serverError } from "@/lib/api-error";
import Anthropic from "@anthropic-ai/sdk";
import { verifyDraftSignature } from "@/lib/ai-reply-sign";
import { supabaseAdmin } from "@/lib/supabase";
import { withTenant } from "@/lib/tenant";
import { getSettingOrEnv } from "@/lib/settings";
import { buildSystemPrompt, getAiReplyModel, type RejectedDraftEntry } from "@/lib/ai-reply";
import { executeRAGPipeline } from "@/lib/embedding";
import { parseBody } from "@/lib/validations/helpers";
import { aiReplyRegenerateSchema } from "@/lib/validations/ai-reply";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ draftId: string }> }
) {
  const { draftId: draftIdStr } = await params;
  const draftId = parseInt(draftIdStr, 10);
  if (isNaN(draftId)) {
    return badRequest("無効なID");
  }

  const parsed = await parseBody(request, aiReplyRegenerateSchema);
  if ("error" in parsed) return parsed.error;
  const { instruction, pastInstructions, sig, exp } = parsed.data;

  if (!verifyDraftSignature(draftId, exp, sig)) {
    return forbidden("署名が無効または期限切れです");
  }

  // ドラフト取得
  const { data: draft, error } = await supabaseAdmin
    .from("ai_reply_drafts")
    .select("*")
    .eq("id", draftId)
    .single();

  if (error || !draft) {
    return notFound("ドラフトが見つかりません");
  }

  if (draft.status !== "pending") {
    return badRequest("このドラフトは既に処理済みです");
  }

  // APIキー取得
  const tenantId = draft.tenant_id ?? undefined;
  const apiKey = (await getSettingOrEnv("general", "anthropic_api_key", "ANTHROPIC_API_KEY")) || "";
  if (!apiKey) {
    return serverError("APIキー未設定");
  }

  // ナレッジベース・モデル設定取得
  const { data: settings } = await withTenant(
    supabaseAdmin.from("ai_reply_settings").select("knowledge_base, custom_instructions, medical_reply_mode, model_id").maybeSingle(),
    draft.tenant_id
  );
  const modelId = settings?.model_id || "claude-sonnet-4-6";

  // 却下パターン取得
  const { data: rejectedDrafts } = await withTenant(
    supabaseAdmin
      .from("ai_reply_drafts")
      .select("original_message, draft_reply, reject_category, reject_reason")
      .eq("status", "rejected")
      .order("rejected_at", { ascending: false })
      .limit(10),
    draft.tenant_id
  );

  // RAGパイプライン実行（Hybrid Search + Reranking + KB チャンク検索）
  const ragResult = await executeRAGPipeline({
    pendingMessages: [draft.original_message],
    contextMessages: [],
    tenantId: draft.tenant_id,
    knowledgeBase: settings?.knowledge_base || "",
  });

  // Claude API再呼び出し（修正指示付き）
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

  // 過去の修正指示を含めて累積的にAIに伝える
  const pastSection = pastInstructions && pastInstructions.length > 0
    ? `\n## これまでの修正指示（すべて反映済みの状態を維持してください）\n${pastInstructions.map((p, i) => `${i + 1}. ${p}`).join("\n")}\n`
    : "";

  const userMessage = `以下のAI返信案をスタッフの修正指示に従って改善してください。

## 患者からの元メッセージ
${draft.original_message}

## 現在のAI返信案
${draft.draft_reply}
${pastSection}
## 今回の修正指示
${instruction}

重要: これまでの修正指示で反映した内容は維持したまま、今回の修正指示も追加で反映してください。
修正後の返信テキストのみを出力してください。JSON形式は不要です。`;

  try {
    const response = await client.messages.create({
      model: modelId,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const newReply = response.content[0].type === "text" ? response.content[0].text.trim() : "";
    if (!newReply) {
      return serverError("AIからの返信が空です");
    }

    // ドラフトを更新
    await supabaseAdmin
      .from("ai_reply_drafts")
      .update({ draft_reply: newReply })
      .eq("id", draftId);

    return NextResponse.json({ newReply });
  } catch (err) {
    console.error("[AI Reply] 再生成エラー:", err);
    return serverError("AI再生成に失敗しました");
  }
}
