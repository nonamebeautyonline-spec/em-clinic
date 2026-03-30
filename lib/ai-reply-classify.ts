// AI返信 メッセージ分類（Phase 2-1: Two-Stage分離）
// Step 1: Haikuで高速分類 → Step 2: 分類結果に基づいて生成モデルで返信生成

import Anthropic from "@anthropic-ai/sdk";

export interface ClassificationResult {
  category: "operational" | "medical" | "greeting" | "other";
  should_reply: boolean;
  escalate_to_staff: boolean;
  key_topics: string[];
  reasoning: string;
  confidence: number;
}

/**
 * メッセージを分類（Haiku使用・高速）
 * 分類のみ行い、返信文は生成しない
 */
export async function classifyMessage(params: {
  apiKey: string;
  messages: string[];
  contextMessages: Array<{ direction: string; content: string }>;
  greetingReplyEnabled: boolean;
}): Promise<{ result: ClassificationResult; inputTokens: number; outputTokens: number }> {
  const { apiKey, messages, contextMessages, greetingReplyEnabled } = params;
  const client = new Anthropic({ apiKey });

  let contextSection = "";
  if (contextMessages.length > 0) {
    contextSection = "\n## 直近の会話\n" + contextMessages.slice(-5).map(m =>
      `${m.direction === "incoming" ? "患者" : "スタッフ"}: ${m.content}`
    ).join("\n") + "\n";
  }

  const msgs = messages.length === 1
    ? messages[0]
    : messages.map((m, i) => `(${i + 1}) ${m}`).join("\n");

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 256,
    system: `クリニックのLINEメッセージを分類してください。返信文は不要です。

## カテゴリ
- "operational": 予約・手続き・料金・営業時間・アクセス等
- "medical": 薬の効果・副作用・症状・処方内容等の医学的質問
- "greeting": 挨拶・お礼・了解等の短い応答
- "other": 上記に分類できないもの

## 判断基準
- should_reply: AIが返信すべきか（${greetingReplyEnabled ? "greetingも返信" : "greetingは返信不要"}）
- escalate_to_staff: スタッフにエスカレーションすべきか（クレーム、緊急性高い医療相談等）
- key_topics: メッセージの主要トピック（短いキーワード1-3個）

## 出力形式（JSON）
{"category": "...", "should_reply": true/false, "escalate_to_staff": true/false, "key_topics": ["..."], "reasoning": "判定理由（短文）", "confidence": 0.0-1.0}`,
    messages: [{ role: "user", content: `${contextSection}\n## 患者メッセージ\n${msgs}` }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const codeBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  const jsonMatch = codeBlockMatch ? codeBlockMatch : text.match(/(\{[\s\S]*\})/);
  if (!jsonMatch) {
    throw new Error("分類結果にJSONが含まれていません");
  }

  const result: ClassificationResult = JSON.parse(jsonMatch[1]);
  return {
    result,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}
