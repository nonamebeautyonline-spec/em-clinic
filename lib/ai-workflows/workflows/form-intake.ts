// AI Workflow: フォーム取り込み
// Webフォーム送信を正規化→分類→回答案生成→引き継ぎ

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
} from "../types";

const formIntakeInputSchema = z.object({
  formId: z.string(),
  fields: z.record(z.string(), z.string()),
  submitterEmail: z.string().optional(),
  submitterName: z.string().optional(),
});

const formIntakeOutputSchema = z.object({
  category: z.string(),
  urgency: z.enum(["low", "medium", "high", "critical"]),
  suggestedReply: z.string(),
  internalSummary: z.string(),
  department: z.string(),
  additionalQuestions: z.array(z.string()),
  confidence: z.number(),
});

export type FormIntakeInput = z.infer<typeof formIntakeInputSchema>;
export type FormIntakeOutput = z.infer<typeof formIntakeOutputSchema>;

// ============================================================
// filter: 空フォーム・短すぎるテキストはスキップ
// ============================================================
async function formFilter(
  input: FormIntakeInput,
  _tenantId: string | null
): Promise<FilterResult> {
  const fields = input.fields ?? {};

  // フィールドが空
  if (Object.keys(fields).length === 0) {
    return { shouldProcess: false, reason: "empty_fields" };
  }

  // 全テキストフィールドの合計文字数を計算
  const totalText = Object.values(fields).join(" ").trim();
  if (totalText.length < 5) {
    return { shouldProcess: false, reason: "too_short" };
  }

  return { shouldProcess: true };
}

// ============================================================
// generate: Sonnet で回答案生成
// ============================================================
async function formGenerate(
  ctx: GenerateContext<FormIntakeInput>
): Promise<GenerateResult<FormIntakeOutput>> {
  const { input, classifyResult } = ctx;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY が未設定");
  }

  const client = new Anthropic({ apiKey });

  const systemPrompt = `あなたはLオペ（クリニック特化LINE運用プラットフォーム）のカスタマーサポートAIです。
Webフォームからの問い合わせを分析し、以下のJSON形式で回答してください。

{
  "category": "bug | configuration | operation | billing | feature_request | incident_suspected",
  "urgency": "low | medium | high | critical",
  "suggestedReply": "返信案（丁寧な日本語）",
  "internalSummary": "社内向け要約",
  "department": "engineering | cs | sales | billing",
  "additionalQuestions": ["追加確認事項"],
  "confidence": 0.0-1.0
}`;

  // フィールドをテキスト化
  const fieldLines = Object.entries(input.fields)
    .map(([key, value]) => `- ${key}: ${value}`)
    .join("\n");

  const userMessage = `## フォーム送信内容
- フォームID: ${input.formId}
- 送信者: ${input.submitterName ?? "不明"}${input.submitterEmail ? ` (${input.submitterEmail})` : ""}

## フィールド
${fieldLines}

## AI分類結果
- カテゴリ: ${classifyResult.category}
- 信頼度: ${classifyResult.confidence}`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  const content = response.content[0];
  let output: FormIntakeOutput = {
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
    evidence: [
      {
        type: "custom",
        source: "form-classification",
        content: `フォームID: ${input.formId} / 分類: ${classifyResult.category} (信頼度: ${classifyResult.confidence})`,
        relevance: classifyResult.confidence,
      },
    ],
    modelName: "claude-sonnet-4-6",
    modelResponseRaw: content.type === "text" ? content.text : "",
    systemPrompt,
    userMessage,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}

// ============================================================
// handoff: 担当部署へ引き継ぎ
// ============================================================
async function formHandoff(
  ctx: HandoffContext<FormIntakeOutput>
): Promise<HandoffResult> {
  const { output } = ctx;
  return {
    handoffSummary: {
      targetType: "human",
      targetId: output.department,
      summary: output.internalSummary,
      urgency: output.urgency,
      actionItems: [
        "フォーム問い合わせへの返信を確認",
        ...output.additionalQuestions.map((q) => `確認: ${q}`),
      ],
      context: {
        category: output.category,
        department: output.department,
        confidence: output.confidence,
        channel: "form",
      },
    },
  };
}

export const formIntakeWorkflow: WorkflowConfig<FormIntakeInput, FormIntakeOutput> = {
  id: "form-intake",
  version: "1.0.0",
  label: "フォーム取り込み",
  description: "Webフォーム問い合わせを自動分類し、返信案と引き継ぎ情報を生成",

  inputSchema: formIntakeInputSchema,
  outputSchema: formIntakeOutputSchema,

  classifyCategories: [
    "bug",
    "configuration",
    "operation",
    "billing",
    "feature_request",
    "incident_suspected",
  ] as const,
  allowedTools: [],

  handoffTarget: {
    type: "human",
    channel: "admin-notification",
    description: "担当部署のスタッフへ（フォーム経由）",
  },

  metrics: [
    { id: "form_response_time_min", label: "フォーム応答時間", type: "duration_min" },
    { id: "human_intervention_rate", label: "人手介入率", type: "percentage" },
  ],

  hooks: {
    filter: formFilter,
    generate: formGenerate,
    handoff: formHandoff,
  },
};
