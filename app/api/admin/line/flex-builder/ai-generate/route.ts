// AIによるFlex Message JSON生成API
// ユーザーの入力（用途・内容）からLINE Flex Messageを自動生成

import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow, strictWithTenant } from "@/lib/tenant";
import { getSettingOrEnv } from "@/lib/settings";
import { logAudit } from "@/lib/audit";

const SYSTEM_PROMPT = `あなたはLINE Flex Messageの作成支援AIです。
ユーザーの指示に基づき、クリニック（美容・医療）向けのFlex Message JSONを生成してください。

## LINE Flex Message仕様
- トップレベルは \`{ "type": "bubble", ... }\` または \`{ "type": "carousel", "contents": [...] }\`
- bubble構造: header, hero, body, footer の4セクション（すべてオプション）
- header: \`{ "type": "box", "layout": "vertical", "backgroundColor": "色", "paddingAll": "16px", "contents": [...] }\`
- hero: \`{ "type": "image", "url": "URL", "size": "full", "aspectRatio": "2:1", "aspectMode": "cover" }\`
- body: \`{ "type": "box", "layout": "vertical", "spacing": "md", "contents": [...] }\`
- footer: \`{ "type": "box", "layout": "vertical", "spacing": "sm", "contents": [...] }\`

## 使用可能なコンポーネント
- text: \`{ "type": "text", "text": "内容", "size": "sm|md|lg|xl|xxl", "weight": "bold|regular", "color": "#hex", "wrap": true }\`
- image: \`{ "type": "image", "url": "URL", "size": "full|xl|lg", "aspectRatio": "幅:高", "aspectMode": "cover|fit" }\`
- button: \`{ "type": "button", "style": "primary|secondary|link", "color": "#hex", "action": { "type": "uri", "label": "ラベル", "uri": "https://example.com" } }\`
- separator: \`{ "type": "separator", "margin": "md" }\`
- box（水平）: \`{ "type": "box", "layout": "horizontal", "spacing": "sm", "contents": [...] }\`
- spacer: \`{ "type": "spacer", "size": "md" }\`

## ルール
- クリニックの施術名・日時等はサンプルデータを入れる（ユーザーが後で編集する前提）
- ヘッダーは背景色つき白文字が基本（#06C755=緑, #4285F4=青, #FF6B6B=赤, #ec4899=ピンク, #8B5CF6=紫 等）
- ボタンのURIは "https://example.com" をプレースホルダーとして使用
- 絵文字はヘッダーのタイトルに1つ程度、控えめに使用
- JSON以外のテキストは出力しない
- カルーセル（carousel）もサポート: \`{ "type": "carousel", "contents": [bubble1, bubble2, ...] }\`

## 編集モード
既存のFlex JSONが渡された場合は、それをベースに修正してください:
- ユーザーの指示に従って変更箇所のみ修正し、それ以外はそのまま保持
- 「ヘッダーを赤にして」→ header.backgroundColorを変更
- 「ボタン追加して」→ footerにボタンを追加
- 「カルーセルにして」→ bubbleをcarouselに変換

## 出力形式
以下のJSON形式で出力してください:
\`\`\`json
{
  "name": "テンプレート名（日本語、20文字以内）",
  "flexJson": { ... Flex Message JSON ... }
}
\`\`\``;

export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);

  let body: { prompt?: string; currentFlexJson?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return badRequest("リクエストボディが不正です");
  }

  const { prompt, currentFlexJson } = body;
  if (!prompt?.trim()) {
    return badRequest("prompt は必須です");
  }

  // APIキー取得
  const tid = tenantId ?? undefined;
  const apiKey =
    (await getSettingOrEnv("general", "anthropic_api_key", "ANTHROPIC_API_KEY", tid)) || "";
  if (!apiKey) {
    return serverError("ANTHROPIC_API_KEY が未設定です");
  }

  // 既存プリセットを3件取得（few-shot例として）
  const { data: samplePresets } = await strictWithTenant(
    supabaseAdmin
      .from("flex_presets")
      .select("name, description, flex_json")
      .order("sort_order", { ascending: true })
      .limit(3),
    tenantId,
  );

  const examplesContext =
    samplePresets && samplePresets.length > 0
      ? samplePresets
          .map(
            (p: { name: string; description: string | null; flex_json: unknown }, i: number) =>
              `### 例${i + 1}: ${p.name}（${p.description || ""}）\n\`\`\`json\n${JSON.stringify(p.flex_json, null, 2)}\n\`\`\``,
          )
          .join("\n\n")
      : "";

  const fullSystemPrompt = examplesContext
    ? `${SYSTEM_PROMPT}\n\n## 参考例（既存テンプレート）\n${examplesContext}`
    : SYSTEM_PROMPT;

  const userMessage = currentFlexJson
    ? `現在のFlex Messageを以下の指示に従って修正してください:\n\n## 指示\n${prompt}\n\n## 現在のFlex JSON\n\`\`\`json\n${JSON.stringify(currentFlexJson, null, 2)}\n\`\`\``
    : `以下の内容でLINE Flex Messageを作成してください:\n\n${prompt}`;

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      system: fullSystemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";

    // JSON抽出（コードブロック内 or 直接）
    const codeBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    const jsonMatch = codeBlockMatch ? codeBlockMatch : text.match(/(\{[\s\S]*\})/);
    if (!jsonMatch) {
      console.error("[AI Flex Generator] JSON抽出失敗:", text);
      return serverError("AIレスポンスの解析に失敗しました");
    }

    const result = JSON.parse(jsonMatch[1]) as {
      name: string;
      flexJson: Record<string, unknown>;
    };

    if (!result.flexJson || typeof result.flexJson !== "object") {
      return serverError("生成されたFlex JSONが不正です");
    }

    logAudit(req, "ai_flex_generate.create", "flex_builder", "ai");
    return NextResponse.json({
      ok: true,
      name: result.name || "AI生成メッセージ",
      flexJson: result.flexJson,
    });
  } catch (err) {
    console.error("[AI Flex Generator] エラー:", err);
    return serverError("AI Flex生成に失敗しました");
  }
}
