// AI Workflow: 営業一次対応
// リード選別 → スコアリング → 初回返信案 + handoff

import { z } from "zod/v4";
import Anthropic from "@anthropic-ai/sdk";
import type {
  WorkflowConfig,
  FilterResult,
  ClassifyResult,
  SourcesResult,
  GenerateContext,
  GenerateResult,
  HandoffContext,
  HandoffResult,
} from "../types";

const salesIntakeInputSchema = z.object({
  text: z.string().min(1),
  source: z.enum(["website", "referral", "campaign", "organic", "other"]).default("other"),
  senderName: z.string().optional(),
  senderEmail: z.string().optional(),
  clinicName: z.string().optional(),
  specialty: z.string().optional(),
  location: z.string().optional(),
  previousContacts: z.array(z.object({
    date: z.string(),
    summary: z.string(),
  })).default([]),
});

const salesIntakeOutputSchema = z.object({
  leadScore: z.number().min(0).max(100),
  temperature: z.enum(["hot", "warm", "cold", "spam"]),
  estimatedChallenges: z.array(z.string()),
  suggestedReply: z.string(),
  internalBrief: z.string(),
  followUpItems: z.array(z.string()),
  confidence: z.number(),
});

export type SalesIntakeInput = z.infer<typeof salesIntakeInputSchema>;
export type SalesIntakeOutput = z.infer<typeof salesIntakeOutputSchema>;

// ============================================================
// filter: 処理不要なメッセージを早期スキップ
// ============================================================

/** 絵文字のみで構成されているか判定 */
function isEmojiOnly(text: string): boolean {
  // Unicodeの絵文字ブロック＋空白を除去して残りがなければ絵文字のみ
  const stripped = text.replace(
    /[\s\u{FE0F}\u{200D}\u{20E3}\u{1F1E0}-\u{1F1FF}\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}\u{2300}-\u{23FF}\u{2B50}\u{2B55}\u{2934}\u{2935}\u{25AA}-\u{25FE}\u{2702}-\u{27B0}\u{1FA00}-\u{1FAFF}]/gu,
    "",
  );
  return stripped.length === 0;
}

/** 記号のみで構成されているか判定 */
function isSymbolOnly(text: string): boolean {
  // 空白・記号・句読点のみ
  const stripped = text.replace(/[\s\p{P}\p{S}]/gu, "");
  return stripped.length === 0;
}

/** 数字のみで構成されているか判定 */
function isDigitOnly(text: string): boolean {
  const stripped = text.replace(/[\s\d]/g, "");
  return stripped.length === 0;
}

/** 自動返信パターンの検出 */
const AUTO_REPLY_PATTERNS = [
  /不在.*(?:自動|オート)/i,
  /(?:自動|オート).*(?:返信|応答)/i,
  /auto[\s-]*reply/i,
  /out[\s-]*of[\s-]*office/i,
  /この(?:メール|メッセージ)は自動/,
  /ただいま(?:席を)?外[しず]て/,
];

async function salesFilter(
  input: SalesIntakeInput,
  _tenantId: string | null,
): Promise<FilterResult> {
  const text = input.text.trim();

  // 空テキスト or 5文字未満はスキップ
  if (!text || text.length < 5) {
    return { shouldProcess: false, reason: "テキストが短すぎる（5文字未満）" };
  }

  // 絵文字のみ
  if (isEmojiOnly(text)) {
    return { shouldProcess: false, reason: "絵文字のみのメッセージ" };
  }

  // 記号のみ
  if (isSymbolOnly(text)) {
    return { shouldProcess: false, reason: "記号のみのメッセージ" };
  }

  // 数字のみ
  if (isDigitOnly(text)) {
    return { shouldProcess: false, reason: "数字のみのメッセージ" };
  }

  // スパム判定: URL3個以上
  const urlCount = (text.match(/https?:\/\//gi) || []).length;
  if (urlCount >= 3) {
    return { shouldProcess: false, reason: "URLが3個以上含まれるスパム疑い" };
  }

  // スパム判定: 同一文字10回以上繰り返し
  if (/(.)\1{9,}/.test(text)) {
    return { shouldProcess: false, reason: "同一文字の過度な繰り返し" };
  }

  // 自動返信パターン
  for (const pattern of AUTO_REPLY_PATTERNS) {
    if (pattern.test(text)) {
      return { shouldProcess: false, reason: "自動返信パターンを検出" };
    }
  }

  return { shouldProcess: true };
}

// ============================================================
// classify: Haiku でリード温度を分類
// ============================================================

async function salesClassify(
  input: SalesIntakeInput,
  _tenantId: string | null,
): Promise<ClassifyResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY が未設定");
  }

  const client = new Anthropic({ apiKey });

  const systemPrompt = `あなたはLオペ（クリニック特化LINE運用SaaS）の営業リード分類AIです。
問い合わせメッセージを分析し、以下のJSON形式で必ず返してください。

{
  "category": "hot | warm | cold | spam",
  "confidence": 0.0〜1.0,
  "shouldReply": true/false,
  "escalateToStaff": true/false,
  "keyTopics": ["検出したキートピック"],
  "reasoning": "分類理由"
}

## 分類基準
- **hot**: 具体的な導入検討・見積もり依頼・デモ希望・予算言及・比較検討中
- **warm**: 情報収集段階・サービス概要問い合わせ・機能質問
- **cold**: 時期尚早・具体性なし・単なる挨拶程度の内容
- **spam**: 営業メール・無関係な宣伝・悪意あるメッセージ

## Lオペの概要
- クリニック向けLINE運用プラットフォーム（SaaS）
- AI自動返信・予約管理・問診・決済の一元化
- オンライン診療（LINEビデオ通話）対応
- マルチテナント対応

## ルール
- hotとwarmはescalateToStaff: true（営業担当への引き継ぎ必要）
- spamはshouldReply: false
- 迷ったらwarmに分類し、confidenceを低めに設定`;

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    system: systemPrompt,
    messages: [{ role: "user", content: input.text }],
  });

  // デフォルト値
  let result: ClassifyResult = {
    category: "warm",
    confidence: 0.5,
    shouldReply: true,
    escalateToStaff: false,
    keyTopics: [],
    reasoning: "分類結果をパースできませんでした",
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };

  const content = response.content[0];
  if (content.type === "text") {
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        result = {
          category: parsed.category || "warm",
          confidence: parsed.confidence ?? 0.5,
          shouldReply: parsed.shouldReply ?? true,
          escalateToStaff: parsed.escalateToStaff ?? false,
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
// sources: 過去の接点情報を営業コンテキストとして提供
// ============================================================

async function salesSources(
  input: SalesIntakeInput,
  _classification: ClassifyResult,
  _tenantId: string | null,
): Promise<SourcesResult> {
  const result: SourcesResult = {};

  // 過去の接点情報をcandidateExamplesに変換
  if (input.previousContacts && input.previousContacts.length > 0) {
    result.candidateExamples = input.previousContacts.map((contact) => ({
      date: contact.date,
      summary: contact.summary,
    }));
  }

  // クリニック情報をcustomSourcesに集約（営業コンテキスト）
  const clinicContext: Record<string, unknown> = {};

  if (input.clinicName) {
    clinicContext.clinicName = input.clinicName;
  }
  if (input.specialty) {
    clinicContext.specialty = input.specialty;
  }
  if (input.location) {
    clinicContext.location = input.location;
  }

  if (Object.keys(clinicContext).length > 0) {
    result.customSources = clinicContext;
  }

  return result;
}

// ============================================================
// generate: リード分析＋返信案生成
// ============================================================

async function salesGenerate(
  ctx: GenerateContext<SalesIntakeInput>
): Promise<GenerateResult<SalesIntakeOutput>> {
  const { input, classifyResult } = ctx;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY が未設定");
  }

  const client = new Anthropic({ apiKey });

  const contactsSection = input.previousContacts.length > 0
    ? "\n## 過去の接点\n" + input.previousContacts.map(
        (c, i) => `${i + 1}. ${c.date}: ${c.summary}`
      ).join("\n")
    : "";

  const systemPrompt = `あなたはLオペ（クリニック特化LINE運用プラットフォーム）の営業支援AIです。
問い合わせリードを分析し、以下のJSON形式で返してください。

{
  "leadScore": 0-100,
  "temperature": "hot | warm | cold | spam",
  "estimatedChallenges": ["リードが抱えていそうな課題"],
  "suggestedReply": "初回返信案（丁寧な日本語）",
  "internalBrief": "営業向けブリーフ",
  "followUpItems": ["フォローアップ項目"],
  "confidence": 0.0-1.0
}

## スコアリング基準
- 90-100: 即商談化（具体的な導入検討、予算言及あり）
- 70-89: 高温度（課題認識あり、比較検討中）
- 40-69: 温（情報収集段階）
- 10-39: 冷（時期尚早、具体性なし）
- 0-9: スパムまたは対象外

## Lオペの主な訴求ポイント
- LINE公式アカウント運用の自動化・効率化
- AI自動返信（自動学習機能付き）
- 予約管理・問診・決済の一元化
- オンライン診療（LINEビデオ通話）対応
- マルチテナント対応のSaaS`;

  const userMessage = `## 問い合わせ内容
${input.text}

## リード情報
- 名前: ${input.senderName || "不明"}
- 流入元: ${input.source}
${input.clinicName ? `- 医院名: ${input.clinicName}` : ""}
${input.specialty ? `- 診療科: ${input.specialty}` : ""}
${input.location ? `- 所在地: ${input.location}` : ""}
${contactsSection}`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  const content = response.content[0];
  let output: SalesIntakeOutput = {
    leadScore: 50,
    temperature: "warm",
    estimatedChallenges: [],
    suggestedReply: "",
    internalBrief: "",
    followUpItems: [],
    confidence: classifyResult.confidence,
  };

  if (content.type === "text") {
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        output = {
          leadScore: parsed.leadScore ?? 50,
          temperature: parsed.temperature || "warm",
          estimatedChallenges: parsed.estimatedChallenges || [],
          suggestedReply: parsed.suggestedReply || "",
          internalBrief: parsed.internalBrief || "",
          followUpItems: parsed.followUpItems || [],
          confidence: parsed.confidence ?? classifyResult.confidence,
        };
      } catch {
        // JSONパース失敗時はデフォルト値
      }
    }
  }

  return {
    output,
    evidence: [{
      type: "custom",
      source: "lead-scoring",
      content: `リードスコア: ${output.leadScore}, 温度: ${output.temperature}`,
      relevance: output.confidence,
    }],
    modelName: "claude-sonnet-4-6",
    modelResponseRaw: content.type === "text" ? content.text : "",
    systemPrompt,
    userMessage,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}

async function salesHandoff(
  ctx: HandoffContext<SalesIntakeOutput>
): Promise<HandoffResult> {
  const { output } = ctx;

  // 温度に応じた緊急度
  const urgencyMap = { hot: "high", warm: "medium", cold: "low", spam: "low" } as const;

  return {
    handoffSummary: {
      targetType: output.temperature === "spam" ? "none" : "human",
      targetId: "sales",
      summary: output.internalBrief,
      urgency: urgencyMap[output.temperature],
      actionItems: [
        ...(output.temperature === "hot" ? ["24時間以内に連絡"] : []),
        `初回返信案を確認・送信`,
        ...output.followUpItems,
      ],
      context: {
        leadScore: output.leadScore,
        temperature: output.temperature,
        estimatedChallenges: output.estimatedChallenges,
        confidence: output.confidence,
      },
    },
  };
}

export const salesIntakeWorkflow: WorkflowConfig<SalesIntakeInput, SalesIntakeOutput> = {
  id: "sales-intake",
  version: "1.0.0",
  label: "営業一次対応",
  description: "問い合わせリードを選別し、スコアリング・初回返信案を生成",

  inputSchema: salesIntakeInputSchema,
  outputSchema: salesIntakeOutputSchema,

  classifyCategories: ["hot", "warm", "cold", "spam"] as const,
  allowedTools: [],

  handoffTarget: {
    type: "human",
    channel: "sales-notification",
    description: "営業担当へ",
  },

  metrics: [
    { id: "conversion_rate", label: "商談化率", type: "percentage" },
    { id: "first_response_time_min", label: "一次対応時間", type: "duration_min" },
    { id: "prep_time_reduction", label: "営業準備時間削減", type: "percentage" },
  ],

  hooks: {
    filter: salesFilter,
    classify: salesClassify,
    sources: salesSources,
    generate: salesGenerate,
    handoff: salesHandoff,
  },
};
