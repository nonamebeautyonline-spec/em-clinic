// エスカレーション構造化詳細生成モジュール
// スタッフへのエスカレーション時に、対応に必要な構造化情報をHaikuで生成する

import Anthropic from "@anthropic-ai/sdk";
import type { ClassificationResult } from "@/lib/ai-reply-classify";

// エスカレーション詳細の型定義
export interface EscalationDetail {
  urgency: "high" | "medium" | "low";
  summary: string;
  missing_info: string[];
  suggested_next_action: string;
  escalation_team: "CS" | "医療" | "請求";
}

// エスカレーション詳細生成のシステムプロンプト
const ESCALATION_SYSTEM_PROMPT = `クリニックのLINE問い合わせをエスカレーションする際の詳細情報を生成してください。

## 出力形式（JSON）
{
  "urgency": "high" | "medium" | "low",
  "summary": "患者の状況と問い合わせ内容の要約（2-3文）",
  "missing_info": ["対応に必要だが不足している情報のリスト"],
  "suggested_next_action": "スタッフへの推奨アクション",
  "escalation_team": "CS" | "医療" | "請求"
}

## urgency判定基準
- high: クレーム、緊急の医療相談、体調不良の訴え
- medium: 曖昧な医療質問、複雑な手続き
- low: 一般的な問い合わせでAIが対応できなかったもの

## escalation_team判定基準
- 医療: 医療系の質問（薬、副作用、症状等）
- 請求: 料金、支払い、決済関連
- CS: それ以外`;

/**
 * エスカレーション時の構造化詳細を生成
 * Haikuで高速に構造化出力を得る
 */
export async function generateEscalationDetail(params: {
  apiKey: string;
  messages: string[];
  contextMessages: Array<{ direction: string; content: string }>;
  classificationResult: ClassificationResult;
  patientName: string;
}): Promise<{
  detail: EscalationDetail;
  inputTokens: number;
  outputTokens: number;
} | null> {
  const { apiKey, messages, contextMessages, classificationResult, patientName } = params;

  try {
    const client = new Anthropic({ apiKey });

    // コンテキストメッセージの整形
    let contextSection = "";
    if (contextMessages.length > 0) {
      contextSection =
        "\n## 直近の会話\n" +
        contextMessages
          .slice(-5)
          .map((m) => `${m.direction === "incoming" ? "患者" : "スタッフ"}: ${m.content}`)
          .join("\n");
    }

    // 分類結果の整形
    const classificationSection = `\n## 分類結果\n- カテゴリ: ${classificationResult.category}\n- トピック: ${classificationResult.key_topics.join(", ")}\n- 理由: ${classificationResult.reasoning}`;

    // ユーザーメッセージの組み立て
    const userMessage = `患者名: ${patientName}\n\n## 患者のメッセージ\n${messages.join("\n")}${contextSection}${classificationSection}`;

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      system: ESCALATION_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    // レスポンスからテキストを抽出
    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      console.error("[ai-escalation] レスポンスにテキストブロックがありません");
      return null;
    }

    // JSONをパース（コードブロックで囲まれている場合も対応）
    let jsonStr = textBlock.text.trim();
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    }

    const detail = JSON.parse(jsonStr) as EscalationDetail;

    return {
      detail,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    };
  } catch (error) {
    console.error("[ai-escalation] エスカレーション詳細生成エラー:", error);
    return null;
  }
}
