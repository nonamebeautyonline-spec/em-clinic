// AI Workflow: メール取り込み
// メール問い合わせを正規化→分類→回答案生成→引き継ぎ

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

// support-intake と同じ出力スキーマ
const emailIntakeInputSchema = z.object({
  subject: z.string(),
  body: z.string().min(1),
  from: z.string(),
  fromName: z.string().optional(),
  to: z.string(),
  receivedAt: z.string(),
});

const emailIntakeOutputSchema = z.object({
  category: z.string(),
  urgency: z.enum(["low", "medium", "high", "critical"]),
  suggestedReply: z.string(),
  internalSummary: z.string(),
  department: z.string(),
  additionalQuestions: z.array(z.string()),
  confidence: z.number(),
});

export type EmailIntakeInput = z.infer<typeof emailIntakeInputSchema>;
export type EmailIntakeOutput = z.infer<typeof emailIntakeOutputSchema>;

// ============================================================
// filter: 自動返信メール・no-reply はスキップ
// ============================================================
async function emailFilter(
  input: EmailIntakeInput,
  _tenantId: string | null
): Promise<FilterResult> {
  const from = (input.from ?? "").toLowerCase();
  const subject = (input.subject ?? "").toLowerCase();
  const body = (input.body ?? "").trim();

  // no-reply アドレス
  if (
    from.startsWith("no-reply@") ||
    from.startsWith("noreply@") ||
    from.startsWith("do-not-reply@") ||
    from.startsWith("mailer-daemon@") ||
    from.startsWith("postmaster@")
  ) {
    return { shouldProcess: false, reason: "noreply_address" };
  }

  // 自動返信の件名パターン
  const autoReplySubjects = [
    /auto[\s-]?reply/i,
    /automatic reply/i,
    /out of office/i,
    /不在/,
    /自動返信/,
    /自動応答/,
    /不在通知/,
    /delivery failure/i,
    /undeliverable/i,
    /mail delivery/i,
  ];
  for (const pattern of autoReplySubjects) {
    if (pattern.test(subject)) {
      return { shouldProcess: false, reason: "auto_reply_subject" };
    }
  }

  // 本文が空または短すぎる
  if (body.length < 5) {
    return { shouldProcess: false, reason: "too_short" };
  }

  return { shouldProcess: true };
}

// ============================================================
// generate: Sonnet で回答案生成
// ============================================================
async function emailGenerate(
  ctx: GenerateContext<EmailIntakeInput>
): Promise<GenerateResult<EmailIntakeOutput>> {
  const { input, classifyResult } = ctx;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY が未設定");
  }

  const client = new Anthropic({ apiKey });

  const systemPrompt = `あなたはLオペ（クリニック特化LINE運用プラットフォーム）のカスタマーサポートAIです。
メール問い合わせを分析し、以下のJSON形式で回答してください。

{
  "category": "bug | configuration | operation | billing | feature_request | incident_suspected",
  "urgency": "low | medium | high | critical",
  "suggestedReply": "メール返信案（丁寧な日本語、メール形式）",
  "internalSummary": "社内向け要約",
  "department": "engineering | cs | sales | billing",
  "additionalQuestions": ["追加確認事項"],
  "confidence": 0.0-1.0
}

ルール:
- suggestedReplyはメール返信にふさわしい丁寧な文体で
- 件名と本文の両方を考慮して分析すること`;

  const userMessage = `## メール情報
- 件名: ${input.subject}
- 送信元: ${input.fromName ?? "不明"} <${input.from}>
- 受信日時: ${input.receivedAt}

## 本文
${input.body}

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
  let output: EmailIntakeOutput = {
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
        source: "email-classification",
        content: `件名: ${input.subject} / 分類: ${classifyResult.category} (信頼度: ${classifyResult.confidence})`,
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
async function emailHandoff(
  ctx: HandoffContext<EmailIntakeOutput>
): Promise<HandoffResult> {
  const { output } = ctx;
  return {
    handoffSummary: {
      targetType: "human",
      targetId: output.department,
      summary: output.internalSummary,
      urgency: output.urgency,
      actionItems: [
        "メール返信案を確認・送信",
        ...output.additionalQuestions.map((q) => `確認: ${q}`),
      ],
      context: {
        category: output.category,
        department: output.department,
        confidence: output.confidence,
        channel: "email",
      },
    },
  };
}

export const emailIntakeWorkflow: WorkflowConfig<EmailIntakeInput, EmailIntakeOutput> = {
  id: "email-intake",
  version: "1.0.0",
  label: "メール取り込み",
  description: "メール問い合わせを自動分類し、返信案と引き継ぎ情報を生成",

  inputSchema: emailIntakeInputSchema,
  outputSchema: emailIntakeOutputSchema,

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
    description: "担当部署のスタッフへ（メール返信）",
  },

  metrics: [
    { id: "email_response_time_min", label: "メール応答時間", type: "duration_min" },
    { id: "human_intervention_rate", label: "人手介入率", type: "percentage" },
    { id: "routing_accuracy", label: "routing正確率", type: "percentage" },
  ],

  hooks: {
    filter: emailFilter,
    generate: emailGenerate,
    handoff: emailHandoff,
  },
};
