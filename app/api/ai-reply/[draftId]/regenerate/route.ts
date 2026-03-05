// AI返信ドラフト再生成API（修正指示でClaude再呼び出し）

import { NextRequest, NextResponse } from "next/server";
import { badRequest, forbidden, notFound, serverError } from "@/lib/api-error";
import Anthropic from "@anthropic-ai/sdk";
import { verifyDraftSignature } from "@/lib/ai-reply-sign";
import { supabaseAdmin } from "@/lib/supabase";
import { withTenant } from "@/lib/tenant";
import { getSettingOrEnv } from "@/lib/settings";
import { buildSystemPrompt } from "@/lib/ai-reply";
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
  const { instruction, sig, exp } = parsed.data;

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
  const apiKey = (await getSettingOrEnv("general", "anthropic_api_key", "ANTHROPIC_API_KEY", tenantId)) || "";
  if (!apiKey) {
    return serverError("APIキー未設定");
  }

  // ナレッジベース取得
  const { data: settings } = await withTenant(
    supabaseAdmin.from("ai_reply_settings").select("knowledge_base, custom_instructions").maybeSingle(),
    draft.tenant_id
  );

  // Claude API再呼び出し（修正指示付き）
  const client = new Anthropic({ apiKey });
  const systemPrompt = buildSystemPrompt(
    settings?.knowledge_base || "",
    settings?.custom_instructions || ""
  );

  const userMessage = `以下のAI返信案をスタッフの修正指示に従って改善してください。

## 患者からの元メッセージ
${draft.original_message}

## 現在のAI返信案
${draft.draft_reply}

## スタッフからの修正指示
${instruction}

修正後の返信テキストのみを出力してください。JSON形式は不要です。`;

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
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
