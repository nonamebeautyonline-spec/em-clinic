// AI Workflow 共通型定義
// 既存AI返信基盤を複数業務で再利用するための共通インターフェース

import type { ZodType } from "zod";

// ============================================================
// Workflow 定義
// ============================================================

/** workflow 識別子 */
export type WorkflowType = "line-reply" | "support-intake" | "sales-intake" | (string & {});

/** ハンドオフ先の定義 */
export interface HandoffTarget {
  type: "human" | "system" | "none";
  channel?: string; // "line-approval-flex", "admin-notification" 等
  description?: string;
}

/** 成果指標の定義（設計ルール7: 必須） */
export interface WorkflowMetricDef {
  id: string;
  label: string;
  type: "percentage" | "number" | "duration_sec" | "duration_min" | "count";
  targetValue?: number; // SLA目標値（例: 承認率90%、対応時間5分以内）
}

/** パイプライン各ステップの型定義 */
export interface WorkflowHooks<TInput, TOutput> {
  filter: (input: TInput, tenantId: string | null) => Promise<FilterResult>;
  classify: (input: TInput, tenantId: string | null) => Promise<ClassifyResult>;
  policy: (classification: ClassifyResult, tenantId: string | null) => Promise<PolicyResult>;
  sources: (input: TInput, classification: ClassifyResult, tenantId: string | null) => Promise<SourcesResult>;
  generate: (ctx: GenerateContext<TInput>) => Promise<GenerateResult<TOutput>>;
  handoff: (ctx: HandoffContext<TOutput>) => Promise<HandoffResult>;
}

/**
 * Workflow設定（各workflowをconfig objectで定義）
 * 設計ルール1: 必須フィールドをすべて持つ
 */
export interface WorkflowConfig<
  TInput = Record<string, unknown>,
  TOutput = Record<string, unknown>,
> {
  id: WorkflowType;
  version: string;
  label: string;
  description: string;

  // スキーマ
  inputSchema: ZodType<TInput>;
  outputSchema: ZodType<TOutput>;

  // 分類カテゴリ
  classifyCategories: readonly string[];

  // ツール
  allowedTools: string[];

  // ハンドオフ先
  handoffTarget: HandoffTarget;

  // 成果指標（設計ルール7: 必須）
  metrics: WorkflowMetricDef[];

  // パイプラインフック（各ステップ差し替え可能）
  hooks?: Partial<WorkflowHooks<TInput, TOutput>>;
}

// ============================================================
// パイプラインステップの入出力型
// ============================================================

/** filter ステップ結果 */
export interface FilterResult {
  shouldProcess: boolean;
  reason?: string;
}

/** classify ステップ結果 */
export interface ClassifyResult {
  category: string;
  confidence: number;
  shouldReply: boolean;
  escalateToStaff: boolean;
  keyTopics: string[];
  reasoning: string;
  inputTokens?: number;
  outputTokens?: number;
}

/** policy ステップ結果 */
export interface PolicyResult {
  decision: "auto_reply_ok" | "approval_required" | "escalate_to_staff" | "block";
  ruleHits: Array<{ rule_id: number; rule_name: string; rule_type: string }>;
  escalationReason: string | null;
}

/** sources ステップ結果（RAG等） */
export interface SourcesResult {
  rewrittenQuery?: string;
  candidateExamples?: Array<Record<string, unknown>>;
  rerankedExamples?: Array<Record<string, unknown>>;
  candidateChunks?: Array<Record<string, unknown>>;
  customSources?: Record<string, unknown>;
}

/** generate ステップのコンテキスト */
export interface GenerateContext<TInput> {
  input: TInput;
  classifyResult: ClassifyResult;
  policyResult: PolicyResult;
  sourcesResult: SourcesResult;
  tenantId: string | null;
}

/** generate ステップ結果 */
export interface GenerateResult<TOutput = Record<string, unknown>> {
  output: TOutput;
  evidence: OutputEvidence[];
  modelName?: string;
  modelResponseRaw?: string;
  systemPrompt?: string;
  userMessage?: string;
  inputTokens?: number;
  outputTokens?: number;
  toolCalls?: Array<Record<string, unknown>>;
}

/** 出力の根拠（設計ルール5: 根拠表示できない出力は本番採用しない） */
export interface OutputEvidence {
  type: "example" | "knowledge_chunk" | "tool_result" | "rule" | "custom";
  source: string;
  content: string;
  relevance?: number;
}

/** handoff ステップのコンテキスト */
export interface HandoffContext<TOutput> {
  output: TOutput;
  policyResult: PolicyResult;
  tenantId: string | null;
}

/** handoff ステップ結果 */
export interface HandoffResult {
  handoffSummary: HandoffSummary;
}

// ============================================================
// タスク実行結果
// ============================================================

/** ハンドオフサマリー（設計ルール3: 必須） */
export interface HandoffSummary {
  targetType: "human" | "system" | "none";
  targetId?: string;
  summary: string;
  urgency: "low" | "medium" | "high" | "critical";
  actionItems: string[];
  context: Record<string, unknown>;
}

/** タスク実行ステータス */
export type TaskRunStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "skipped"
  | "escalated";

/** ハンドオフステータス */
export type HandoffStatus = "pending" | "accepted" | "resolved";

/** タスク実行結果（ai_tasks テーブル対応） */
export interface TaskRun {
  id: string; // UUID
  tenantId: string | null;
  workflowType: WorkflowType;
  status: TaskRunStatus;

  // 入力
  input: Record<string, unknown>;
  subjectId?: string;
  subjectType?: string;

  // 出力
  output?: Record<string, unknown>;
  outputEvidence: OutputEvidence[];

  // ハンドオフ（設計ルール3: 必須）
  handoffSummary: HandoffSummary;
  handoffStatus: HandoffStatus;

  // トレース（全中間結果）
  trace: TaskRunTrace;

  // モデル情報
  promptHash?: string;
  modelName?: string;
  inputTokens: number;
  outputTokens: number;

  // キュー・アサイン情報
  queueName?: string;
  priority?: number;
  assigneeId?: string;

  // タイムスタンプ
  createdAt: string;
  completedAt?: string;
}

/** トレース（パイプライン中間結果の保存、既存TracePayload思想の継承） */
export interface TaskRunTrace {
  filterResult?: FilterResult;
  classifyResult?: ClassifyResult;
  policyResult?: PolicyResult;
  sourcesResult?: SourcesResult;
  generateResult?: {
    modelName?: string;
    modelResponseRaw?: string;
    toolCalls?: Array<Record<string, unknown>>;
  };
  warnings?: string[];
  error?: string;
}

// ============================================================
// フィードバック
// ============================================================

/** タスクフィードバック（ai_task_feedback テーブル対応） */
export interface TaskFeedback {
  id: number;
  taskId: string;
  feedbackType: "approve" | "reject" | "edit" | "escalate";
  rating?: number; // 1-5
  comment?: string;
  rejectCategory?: string;
  correctedOutput?: Record<string, unknown>;
  reviewedBy?: string;
  createdAt: string;
}

// ============================================================
// デフォルトハンドオフサマリー
// ============================================================

export const EMPTY_HANDOFF_SUMMARY: HandoffSummary = {
  targetType: "none",
  summary: "",
  urgency: "low",
  actionItems: [],
  context: {},
};
