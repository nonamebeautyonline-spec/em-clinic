// 配信文面のAI生成API
// purpose / target_audience / tone から配信メッセージ文面を生成

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant } from "@/lib/tenant";
import { getSettingOrEnv } from "@/lib/settings";

export async function POST(req: NextRequest) {
  // 認証チェック
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = resolveTenantId(req);

  // リクエストボディ解析
  let body: {
    purpose?: string;
    target_audience?: string;
    tone?: string;
    max_length?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "リクエストボディが不正です" }, { status: 400 });
  }

  const { purpose, target_audience, tone, max_length = 500 } = body;

  if (!purpose?.trim()) {
    return NextResponse.json({ error: "purpose は必須です" }, { status: 400 });
  }
  if (!target_audience?.trim()) {
    return NextResponse.json({ error: "target_audience は必須です" }, { status: 400 });
  }
  if (!tone || !["formal", "casual", "urgent"].includes(tone)) {
    return NextResponse.json(
      { error: "tone は formal / casual / urgent のいずれかです" },
      { status: 400 },
    );
  }

  // APIキー取得
  const tid = tenantId ?? undefined;
  const apiKey = (await getSettingOrEnv("general", "anthropic_api_key", "ANTHROPIC_API_KEY", tid)) || "";
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY が未設定です" }, { status: 500 });
  }

  // 既存テンプレートを最新5件取得（コンテキストとして渡す）
  const { data: recentTemplates } = await withTenant(
    supabaseAdmin
      .from("message_templates")
      .select("name, content")
      .eq("message_type", "text")
      .order("updated_at", { ascending: false })
      .limit(5),
    tenantId,
  );

  const templateContext =
    recentTemplates && recentTemplates.length > 0
      ? recentTemplates
          .map(
            (t: { name: string; content: string }, i: number) =>
              `${i + 1}. 「${t.name}」\n${t.content}`,
          )
          .join("\n\n")
      : "（テンプレートなし）";

  const toneLabel: Record<string, string> = {
    formal: "丁寧・フォーマル",
    casual: "親しみやすい・カジュアル",
    urgent: "緊急・重要感を出す",
  };

  // Claude API で文面生成
  const client = new Anthropic({ apiKey });

  const systemPrompt = `あなたはクリニックのLINE配信メッセージの作成支援AIです。
指定された目的・ターゲット・トーンに合わせて、効果的なLINE配信メッセージを作成してください。

## ルール
- クリニック（美容・医療）に適した内容にする
- LINE メッセージとして自然で読みやすい文面にする（改行を適度に使う）
- 差し込み変数 {name} を患者名の箇所で使用できる
- 最大文字数を守る
- 絵文字は控えめに使い、過剰にしない
- メイン案 1 つ + 代替案 2 つの計 3 パターンを生成する

## 既存テンプレート（参考: トーン・文体を揃えてください）
${templateContext}

## 出力形式
以下のJSON形式で出力してください（コードブロックなし、JSON のみ）:
{
  "message": "メイン案のメッセージ本文",
  "alternatives": ["代替案1のメッセージ本文", "代替案2のメッセージ本文"]
}`;

  const userMessage = `以下の条件でLINE配信メッセージを作成してください。

- 目的: ${purpose}
- ターゲット: ${target_audience}
- トーン: ${toneLabel[tone] || tone}
- 最大文字数: ${max_length}文字`;

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";

    // JSON 抽出（コードブロック内 or 直接）
    const codeBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    const jsonMatch = codeBlockMatch ? codeBlockMatch : text.match(/(\{[\s\S]*\})/);
    if (!jsonMatch) {
      console.error("[AI Compose] JSON抽出失敗:", text);
      return NextResponse.json({ error: "AIレスポンスの解析に失敗しました" }, { status: 500 });
    }

    const result = JSON.parse(jsonMatch[1]) as {
      message: string;
      alternatives: string[];
    };

    return NextResponse.json({
      ok: true,
      message: result.message,
      alternatives: result.alternatives || [],
    });
  } catch (err) {
    console.error("[AI Compose] Claude API エラー:", err);
    return NextResponse.json({ error: "AI文面生成に失敗しました" }, { status: 500 });
  }
}
