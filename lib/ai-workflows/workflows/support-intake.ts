// AI Workflow: 顧客サポート一次対応
// 問い合わせを分類→回答案+handoff summary生成

import { z } from "zod/v4";
import Anthropic from "@anthropic-ai/sdk";
import type {
  WorkflowConfig,
  GenerateContext,
  GenerateResult,
  HandoffContext,
  HandoffResult,
  FilterResult,
  ClassifyResult,
  SourcesResult,
} from "../types";

const supportIntakeInputSchema = z.object({
  text: z.string().min(1),
  senderName: z.string().optional(),
  senderEmail: z.string().optional(),
  senderType: z.enum(["clinic", "prospect", "internal", "unknown"]).default("unknown"),
  tenantName: z.string().optional(),
  contractPlan: z.string().optional(),
  previousInquiries: z.array(z.object({
    summary: z.string(),
    resolvedAt: z.string().optional(),
  })).default([]),
});

const supportIntakeOutputSchema = z.object({
  category: z.string(),
  urgency: z.enum(["low", "medium", "high", "critical"]),
  suggestedReply: z.string(),
  internalSummary: z.string(),
  department: z.string(),
  additionalQuestions: z.array(z.string()),
  confidence: z.number(),
});

export type SupportIntakeInput = z.infer<typeof supportIntakeInputSchema>;
export type SupportIntakeOutput = z.infer<typeof supportIntakeOutputSchema>;

// ============================================================
// filter: 処理対象かどうかを判定
// ============================================================
async function supportFilter(
  input: SupportIntakeInput,
  _tenantId: string | null
): Promise<FilterResult> {
  const trimmed = (input.text ?? "").trim();

  // 空テキスト or 5文字未満はスキップ
  if (trimmed.length < 5) {
    return { shouldProcess: false, reason: "too_short" };
  }

  // 絵文字のみ
  if (/^[\p{Emoji_Presentation}\p{Extended_Pictographic}\s]+$/u.test(trimmed)) {
    return { shouldProcess: false, reason: "emoji_only" };
  }

  // 記号のみ（句読点・記号・空白のみ）
  if (/^[\p{P}\p{S}\s]+$/u.test(trimmed)) {
    return { shouldProcess: false, reason: "symbol_only" };
  }

  // 数字のみ
  if (/^\d+$/.test(trimmed)) {
    return { shouldProcess: false, reason: "number_only" };
  }

  // 自動返信っぽいパターン
  const autoReplyPatterns = [
    /不在です/,
    /自動返信/,
    /auto[\s-]?reply/i,
    /out\s*of\s*office/i,
    /自動応答/,
    /不在通知/,
  ];
  for (const pattern of autoReplyPatterns) {
    if (pattern.test(trimmed)) {
      return { shouldProcess: false, reason: "auto_reply_detected" };
    }
  }

  // テスト/社内テストっぽいメッセージ（完全一致）
  const testPatterns = [
    /^テスト$/,
    /^test$/i,
    /^テスト送信$/,
    /^送信テスト$/,
    /^動作確認$/,
  ];
  for (const pattern of testPatterns) {
    if (pattern.test(trimmed)) {
      return { shouldProcess: false, reason: "test_message" };
    }
  }

  return { shouldProcess: true };
}

// ============================================================
// classify: Haiku で問い合わせをカテゴリ分類
// ============================================================
async function supportClassify(
  input: SupportIntakeInput,
  _tenantId: string | null
): Promise<ClassifyResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY が未設定");
  }

  const client = new Anthropic({ apiKey });

  const systemPrompt = `あなたはLオペ（クリニック特化LINE運用プラットフォーム）の問い合わせ分類AIです。

Lオペは以下の機能を提供しています：
- LINE公式アカウント運用管理
- 患者予約管理・問診管理
- AI自動返信（LINE上で患者へ自動応答）
- リッチメニュー管理
- 一斉配信・セグメント配信
- オンライン診療連携
- 決済連携（Square）
- マルチテナント対応

以下のカテゴリに分類してJSON形式で返してください：

カテゴリ:
- bug: バグ報告、エラー発生、正常動作しない
- configuration: 設定方法、初期設定、連携設定の質問
- operation: 日常運用の質問、操作方法
- billing: 料金、請求、プラン変更
- feature_request: 機能要望、改善提案
- incident_suspected: システム障害の疑い、複数テナント影響

出力JSON:
{
  "category": "カテゴリ名",
  "confidence": 0.0-1.0,
  "shouldReply": true,
  "escalateToStaff": true/false,
  "keyTopics": ["トピック1", "トピック2"],
  "reasoning": "分類理由"
}

ルール:
- incident_suspected は escalateToStaff=true とする
- confidence が 0.6 未満の場合も escalateToStaff=true
- shouldReply は常に true`;

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    system: systemPrompt,
    messages: [{ role: "user", content: input.text }],
  });

  const content = response.content[0];

  // デフォルト値
  let result: ClassifyResult = {
    category: "operation",
    confidence: 0.5,
    shouldReply: true,
    escalateToStaff: true,
    keyTopics: [],
    reasoning: "パース失敗のためデフォルト分類",
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };

  if (content.type === "text") {
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        result = {
          category: parsed.category || "operation",
          confidence: parsed.confidence ?? 0.5,
          shouldReply: parsed.shouldReply ?? true,
          escalateToStaff: parsed.escalateToStaff ?? (parsed.confidence < 0.6),
          keyTopics: parsed.keyTopics || [],
          reasoning: parsed.reasoning || "",
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        };
      } catch {
        // JSONパース失敗時はデフォルト値を使用
      }
    }
  }

  return result;
}

// ============================================================
// sources: 過去問い合わせ・契約情報をソースとして整形
// ============================================================
async function supportSources(
  input: SupportIntakeInput,
  _classification: ClassifyResult,
  _tenantId: string | null
): Promise<SourcesResult> {
  const result: SourcesResult = {};

  // 過去の問い合わせ情報をcandidateExamplesに変換
  if (input.previousInquiries.length > 0) {
    result.candidateExamples = input.previousInquiries.map((inquiry, i) => ({
      index: i,
      summary: inquiry.summary,
      resolvedAt: inquiry.resolvedAt ?? null,
      isResolved: !!inquiry.resolvedAt,
    }));
  }

  // 契約プラン情報がある場合はカスタムソースとして含める
  const custom: Record<string, unknown> = {};
  if (input.contractPlan) {
    custom.contractPlan = input.contractPlan;
  }
  if (input.tenantName) {
    custom.tenantName = input.tenantName;
  }
  if (input.senderType) {
    custom.senderType = input.senderType;
  }
  if (Object.keys(custom).length > 0) {
    result.customSources = custom;
  }

  return result;
}

async function supportGenerate(
  ctx: GenerateContext<SupportIntakeInput>
): Promise<GenerateResult<SupportIntakeOutput>> {
  const { input, classifyResult } = ctx;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY が未設定");
  }

  const client = new Anthropic({ apiKey });

  // 過去問い合わせコンテキスト
  const historySection = input.previousInquiries.length > 0
    ? "\n## 過去の問い合わせ\n" + input.previousInquiries.map(
        (q, i) => `${i + 1}. ${q.summary}${q.resolvedAt ? ` (解決: ${q.resolvedAt})` : " (未解決)"}`
      ).join("\n")
    : "";

  const systemPrompt = `あなたはLオペ（クリニック特化LINE運用プラットフォーム）のカスタマーサポートAIです。
問い合わせを分析し、以下のJSON形式で回答してください。

{
  "category": "bug | configuration | operation | billing | feature_request | incident_suspected",
  "urgency": "low | medium | high | critical",
  "suggestedReply": "顧客への返信案（丁寧な日本語）",
  "internalSummary": "社内向け要約（技術的な詳細含む）",
  "department": "engineering | cs | sales | billing",
  "additionalQuestions": ["必要な追加確認事項"],
  "confidence": 0.0-1.0
}

## ルール
- urgency=critical: システム障害、全テナント影響、データ消失の可能性
- urgency=high: 特定テナントの機能停止、請求エラー
- urgency=medium: 設定不明、使い方の質問
- urgency=low: 機能要望、一般的な質問
- suggestedReplyは必ず丁寧な日本語で
- write操作の提案は行わない（suggestion/draftのみ）`;

  const userMessage = `## 問い合わせ内容
${input.text}

## 送信元情報
- 名前: ${input.senderName || "不明"}
- 種別: ${input.senderType}
${input.tenantName ? `- テナント: ${input.tenantName}` : ""}
${input.contractPlan ? `- 契約プラン: ${input.contractPlan}` : ""}

## AI分類結果
- カテゴリ: ${classifyResult.category}
- 信頼度: ${classifyResult.confidence}
- キートピック: ${classifyResult.keyTopics.join(", ")}
${historySection}`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  const content = response.content[0];
  let output: SupportIntakeOutput = {
    category: classifyResult.category,
    urgency: "medium",
    suggestedReply: "",
    internalSummary: "",
    department: "cs",
    additionalQuestions: [],
    confidence: classifyResult.confidence,
  };

  if (content.type === "text") {
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        output = {
          category: parsed.category || classifyResult.category,
          urgency: parsed.urgency || "medium",
          suggestedReply: parsed.suggestedReply || "",
          internalSummary: parsed.internalSummary || "",
          department: parsed.department || "cs",
          additionalQuestions: parsed.additionalQuestions || [],
          confidence: parsed.confidence ?? classifyResult.confidence,
        };
      } catch {
        // JSONパース失敗時はデフォルト値を使用
      }
    }
  }

  return {
    output,
    evidence: [{
      type: "custom",
      source: "ai-classification",
      content: `分類: ${classifyResult.category} (信頼度: ${classifyResult.confidence})`,
      relevance: classifyResult.confidence,
    }],
    modelName: "claude-sonnet-4-6",
    modelResponseRaw: content.type === "text" ? content.text : "",
    systemPrompt,
    userMessage,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}

async function supportHandoff(
  ctx: HandoffContext<SupportIntakeOutput>
): Promise<HandoffResult> {
  const { output } = ctx;
  return {
    handoffSummary: {
      targetType: "human",
      targetId: output.department,
      summary: output.internalSummary,
      urgency: output.urgency,
      actionItems: [
        `顧客への返信案を確認・送信`,
        ...output.additionalQuestions.map(q => `確認: ${q}`),
      ],
      context: {
        category: output.category,
        department: output.department,
        confidence: output.confidence,
      },
    },
  };
}

export const supportIntakeWorkflow: WorkflowConfig<SupportIntakeInput, SupportIntakeOutput> = {
  id: "support-intake",
  version: "1.0.0",
  label: "問い合わせ一次対応",
  description: "顧客からの問い合わせを自動分類し、回答案と引き継ぎ情報を生成",

  inputSchema: supportIntakeInputSchema,
  outputSchema: supportIntakeOutputSchema,

  classifyCategories: ["bug", "configuration", "operation", "billing", "feature_request", "incident_suspected"] as const,
  allowedTools: [],

  handoffTarget: {
    type: "human",
    channel: "admin-notification",
    description: "担当部署のスタッフへ",
  },

  metrics: [
    { id: "first_response_time_min", label: "初回対応時間", type: "duration_min" },
    { id: "human_intervention_rate", label: "人手介入率", type: "percentage" },
    { id: "routing_accuracy", label: "routing正確率", type: "percentage" },
    { id: "resolution_rate", label: "解決率", type: "percentage" },
  ],

  hooks: {
    filter: supportFilter,
    classify: supportClassify,
    sources: supportSources,
    generate: supportGenerate,
    handoff: supportHandoff,
  },
};
