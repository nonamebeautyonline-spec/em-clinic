// AI Workflow TraceBuilder
// 既存 TraceBuilder パターン（Fluent API + 段階的構築）を継承した汎用版

import * as crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase";
import { tenantPayload } from "@/lib/tenant";
import type {
  TaskRun,
  TaskRunTrace,
  TaskRunStatus,
  FilterResult,
  ClassifyResult,
  PolicyResult,
  SourcesResult,
  GenerateResult,
  HandoffResult,
  HandoffSummary,
  OutputEvidence,
  WorkflowType,
} from "./types";

/**
 * Workflow パイプラインのトレースを段階的に構築するビルダー
 * 既存の TraceBuilder (ai-reply-trace.ts) と同じFluent APIパターン
 */
export class WorkflowTraceBuilder {
  private workflowType: WorkflowType;
  private tenantId: string | null;
  private taskId?: string;
  private subjectId?: string;
  private subjectType?: string;
  private trace: TaskRunTrace = {};
  private warnings: string[] = [];
  private queueName?: string;
  private priority?: number;

  constructor(workflowType: WorkflowType, tenantId: string | null) {
    this.workflowType = workflowType;
    this.tenantId = tenantId;
  }

  setTaskId(id: string): this {
    this.taskId = id;
    return this;
  }

  setSubject(type: string, id: string): this {
    this.subjectType = type;
    this.subjectId = id;
    return this;
  }

  setFilter(result: FilterResult): this {
    this.trace.filterResult = result;
    return this;
  }

  setClassify(result: ClassifyResult): this {
    this.trace.classifyResult = result;
    return this;
  }

  setPolicy(result: PolicyResult): this {
    this.trace.policyResult = result;
    return this;
  }

  setSources(result: SourcesResult): this {
    this.trace.sourcesResult = result;
    return this;
  }

  setGenerate(result: { modelName?: string; modelResponseRaw?: string; toolCalls?: Array<Record<string, unknown>> }): this {
    this.trace.generateResult = result;
    return this;
  }

  addWarning(warning: string): this {
    this.warnings.push(warning);
    return this;
  }

  setError(error: string): this {
    this.trace.error = error;
    return this;
  }

  setQueue(queueName: string, priority: number): this {
    this.queueName = queueName;
    this.priority = priority;
    return this;
  }

  /**
   * タスク実行結果を構築（DB保存用）
   */
  build(
    status: TaskRunStatus,
    input: Record<string, unknown>,
    generateResult?: GenerateResult,
    handoffResult?: HandoffResult,
  ): Omit<TaskRun, "id" | "createdAt"> {
    if (this.warnings.length > 0) {
      this.trace.warnings = this.warnings;
    }

    // プロンプトハッシュ
    let promptHash: string | undefined;
    if (generateResult?.systemPrompt || generateResult?.userMessage) {
      const content = (generateResult.systemPrompt || "") + (generateResult.userMessage || "");
      promptHash = crypto.createHash("sha256").update(content).digest("hex").slice(0, 16);
    }

    const handoffSummary: HandoffSummary = handoffResult?.handoffSummary ?? {
      targetType: "none",
      summary: "",
      urgency: "low",
      actionItems: [],
      context: {},
    };

    return {
      tenantId: this.tenantId,
      workflowType: this.workflowType,
      status,
      input,
      subjectId: this.subjectId,
      subjectType: this.subjectType,
      output: generateResult?.output as Record<string, unknown> | undefined,
      outputEvidence: generateResult?.evidence ?? [],
      handoffSummary,
      handoffStatus: "pending",
      trace: this.trace,
      promptHash,
      modelName: generateResult?.modelName,
      inputTokens: (this.trace.classifyResult?.inputTokens ?? 0) + (generateResult?.inputTokens ?? 0),
      outputTokens: (this.trace.classifyResult?.outputTokens ?? 0) + (generateResult?.outputTokens ?? 0),
      queueName: this.queueName,
      priority: this.priority,
      completedAt: status === "completed" || status === "failed" || status === "skipped"
        ? new Date().toISOString()
        : undefined,
    };
  }
}

/**
 * タスク実行結果をDBに保存
 */
export async function saveTaskRun(
  taskRun: Omit<TaskRun, "id" | "createdAt">
): Promise<string | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from("ai_tasks")
      .insert({
        ...tenantPayload(taskRun.tenantId),
        workflow_type: taskRun.workflowType,
        status: taskRun.status,
        input: taskRun.input,
        subject_id: taskRun.subjectId || null,
        subject_type: taskRun.subjectType || null,
        output: taskRun.output || null,
        output_evidence: taskRun.outputEvidence,
        handoff_summary: taskRun.handoffSummary,
        handoff_status: taskRun.handoffStatus,
        trace: taskRun.trace,
        prompt_hash: taskRun.promptHash || null,
        model_name: taskRun.modelName || null,
        input_tokens: taskRun.inputTokens,
        output_tokens: taskRun.outputTokens,
        queue_name: taskRun.queueName || null,
        priority: taskRun.priority ?? 50,
        completed_at: taskRun.completedAt || null,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[WorkflowTrace] 保存エラー:", error);
      return null;
    }
    return data?.id ?? null;
  } catch (err) {
    console.error("[WorkflowTrace] 保存エラー:", err);
    return null;
  }
}
