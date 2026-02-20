// AI返信ドラフト再生成API（修正指示でClaude再呼び出し）

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { verifyDraftSignature } from "@/lib/ai-reply-sign";
import { supabaseAdmin } from "@/lib/supabase";
import { withTenant } from "@/lib/tenant";
import { getSettingOrEnv } from "@/lib/settings";
import { buildSystemPrompt } from "@/lib/ai-reply";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ draftId: string }> }
) {
  const { draftId: draftIdStr } = await params;
  const draftId = parseInt(draftIdStr, 10);
  if (isNaN(draftId)) {
    return NextResponse.json({ error: "無効なID" }, { status: 400 });
  }

  const body = await request.json();
  const { instruction, sig, exp } = body as { instruction: string; sig: string; exp: number };

  if (!verifyDraftSignature(draftId, exp, sig)) {
    return NextResponse.json({ error: "署名が無効または期限切れです" }, { status: 403 });
  }

  if (!instruction?.trim()) {
    return NextResponse.json({ error: "修正指示を入力してください" }, { status: 400 });
  }

  // ドラフト取得
  const { data: draft, error } = await supabaseAdmin
    .from("ai_reply_drafts")
    .select("*")
    .eq("id", draftId)
    .single();

  if (error || !draft) {
    return NextResponse.json({ error: "ドラフトが見つかりません" }, { status: 404 });
  }

  if (draft.status !== "pending") {
    return NextResponse.json({ error: "このドラフトは既に処理済みです" }, { status: 400 });
  }

  // APIキー取得
  const tenantId = draft.tenant_id ?? undefined;
  const apiKey = (await getSettingOrEnv("general", "anthropic_api_key", "ANTHROPIC_API_KEY", tenantId)) || "";
  if (!apiKey) {
    return NextResponse.json({ error: "APIキー未設定" }, { status: 500 });
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
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const newReply = response.content[0].type === "text" ? response.content[0].text.trim() : "";
    if (!newReply) {
      return NextResponse.json({ error: "AIからの返信が空です" }, { status: 500 });
    }

    // ドラフトを更新
    await supabaseAdmin
      .from("ai_reply_drafts")
      .update({ draft_reply: newReply })
      .eq("id", draftId);

    return NextResponse.json({ newReply });
  } catch (err) {
    console.error("[AI Reply] 再生成エラー:", err);
    return NextResponse.json({ error: "AI再生成に失敗しました" }, { status: 500 });
  }
}
