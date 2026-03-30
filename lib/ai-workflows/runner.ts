// AI Workflow Runner
// 共通パイプライン: filter → classify → policy → sources → generate → handoff → trace保存

import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/lib/supabase";
import { determineQueue } from "@/lib/ai-routing";
import { WorkflowTraceBuilder, saveTaskRun } from "./trace-builder";
import type {
  WorkflowConfig,
  FilterResult,
  ClassifyResult,
  PolicyResult,
  SourcesResult,
  GenerateResult,
  HandoffResult,
  TaskRun,
  TaskRunStatus,
} from "./types";

/**
 * Workflow を実行する共通パイプライン
 *
 * 各ステップは config.hooks で差し替え可能。
 * 未指定時はデフォルト実装を使用。
 */
export async function runWorkflow<TInput extends Record<string, unknown>, TOutput extends Record<string, unknown>>(
  config: WorkflowConfig<TInput, TOutput>,
  input: TInput,
  tenantId: string | null,
  options?: {
    subjectId?: string;
    subjectType?: string;
  },
): Promise<{ taskRun: Omit<TaskRun, "id" | "createdAt">; taskId: string | null }> {
  const trace = new WorkflowTraceBuilder(config.id, tenantId);
  if (options?.subjectId && options?.subjectType) {
    trace.setSubject(options.subjectType, options.subjectId);
  }

  // 入力バリデーション
  const inputParsed = config.inputSchema.safeParse(input);
  if (!inputParsed.success) {
    trace.setError("入力バリデーションエラー");
    const taskRun = trace.build("failed", input as Record<string, unknown>);
    const taskId = await saveTaskRun(taskRun);
    return { taskRun, taskId };
  }

  // 1. filter
  const filterFn = config.hooks?.filter ?? defaultFilter;
  const filterResult = await filterFn(input, tenantId);
  trace.setFilter(filterResult);
  if (!filterResult.shouldProcess) {
    const taskRun = trace.build("skipped", input as Record<string, unknown>);
    const taskId = await saveTaskRun(taskRun);
    return { taskRun, taskId };
  }

  // 2. classify
  const classifyFn = config.hooks?.classify ?? defaultClassify;
  const classifyResult = await classifyFn(input, tenantId);
  trace.setClassify(classifyResult);

  // 3. policy（共通ポリシーエンジン: ai_workflow_policy_rules テーブル参照）
  const policyFn = config.hooks?.policy
    ?? ((cls: ClassifyResult, tid: string | null) => defaultPolicy(cls, tid, config.id));
  const policyResult = await policyFn(classifyResult, tenantId);
  trace.setPolicy(policyResult);
  if (policyResult.decision === "block") {
    const taskRun = trace.build("skipped", input as Record<string, unknown>);
    const taskId = await saveTaskRun(taskRun);
    return { taskRun, taskId };
  }

  // 4. sources
  const sourcesFn = config.hooks?.sources ?? defaultSources;
  const sourcesResult = await sourcesFn(input, classifyResult, tenantId);
  trace.setSources(sourcesResult);

  // 5. generate
  let generateResult: GenerateResult<TOutput>;
  try {
    const generateFn = config.hooks?.generate;
    if (!generateFn) {
      throw new Error("generate hook が未定義（workflowConfig.hooks.generate を実装してください）");
    }
    generateResult = await generateFn({
      input,
      classifyResult,
      policyResult,
      sourcesResult,
      tenantId,
    });
  } catch (err) {
    trace.setError(err instanceof Error ? err.message : "生成エラー");
    const taskRun = trace.build("failed", input as Record<string, unknown>);
    const taskId = await saveTaskRun(taskRun);
    return { taskRun, taskId };
  }

  trace.setGenerate({
    modelName: generateResult.modelName,
    modelResponseRaw: generateResult.modelResponseRaw,
    toolCalls: generateResult.toolCalls,
  });

  // 6. structured output validation（設計ルール4）
  const outputParsed = config.outputSchema.safeParse(generateResult.output);
  if (!outputParsed.success) {
    trace.addWarning("output_schema_validation_failed");
  }

  // 7. evidence check（設計ルール5）
  if (!generateResult.evidence || generateResult.evidence.length === 0) {
    trace.addWarning("no_evidence");
  }

  // 8. handoff（設計ルール3: 必須）
  const handoffFn = config.hooks?.handoff ?? defaultHandoff;
  const handoffResult = await handoffFn({
    output: generateResult.output,
    policyResult,
    tenantId,
  });

  // 9. キュールーティング（handoff完了後にキュー情報を設定）
  const queueInfo = determineQueue(config.id, handoffResult.handoffSummary);
  trace.setQueue(queueInfo.queueName, queueInfo.priority);

  // 10. ステータス判定
  let status: TaskRunStatus = "completed";
  if (policyResult.decision === "escalate_to_staff") {
    status = "escalated";
  }

  // 11. 保存
  const taskRun = trace.build(status, input as Record<string, unknown>, generateResult as GenerateResult, handoffResult);
  const taskId = await saveTaskRun(taskRun);

  return { taskRun, taskId };
}

// ============================================================
// デフォルト実装
// ============================================================

/** デフォルトfilter: 常に処理する */
async function defaultFilter(): Promise<FilterResult> {
  return { shouldProcess: true };
}

/** デフォルトclassify: Haiku で汎用分類 */
async function defaultClassify<TInput extends Record<string, unknown>>(
  input: TInput,
): Promise<ClassifyResult> {
  // テキストフィールドを抽出（text, message, body, content のいずれか）
  const text = (input.text || input.message || input.body || input.content || "") as string;

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return {
        category: "other",
        confidence: 0.5,
        shouldReply: true,
        escalateToStaff: false,
        keyTopics: [],
        reasoning: "APIキー未設定のためデフォルト分類",
      };
    }

    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      system: `テキストを分類してJSON形式で返してください。
{
  "category": "カテゴリ文字列",
  "confidence": 0.0-1.0,
  "should_reply": true/false,
  "escalate_to_staff": true/false,
  "key_topics": ["トピック"],
  "reasoning": "分類理由"
}`,
      messages: [{ role: "user", content: text }],
    });

    const content = response.content[0];
    if (content.type === "text") {
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          category: parsed.category || "other",
          confidence: parsed.confidence ?? 0.5,
          shouldReply: parsed.should_reply ?? true,
          escalateToStaff: parsed.escalate_to_staff ?? false,
          keyTopics: parsed.key_topics ?? [],
          reasoning: parsed.reasoning || "",
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        };
      }
    }
  } catch (err) {
    console.error("[WorkflowRunner] 分類エラー:", err);
  }

  return {
    category: "other",
    confidence: 0.3,
    shouldReply: true,
    escalateToStaff: false,
    keyTopics: [],
    reasoning: "分類失敗、デフォルト値を使用",
  };
}

/**
 * デフォルトpolicy: ai_workflow_policy_rules テーブルからルールを取得して評価
 * 既存 ai-reply-policy.ts の evaluatePolicy と同じロジック（最も制限的なdecisionを採用）
 */
async function defaultPolicy(
  classification: ClassifyResult,
  tenantId: string | null,
  workflowType?: string,
): Promise<PolicyResult> {
  const defaultResult: PolicyResult = {
    decision: "auto_reply_ok",
    ruleHits: [],
    escalationReason: null,
  };

  try {
    let query = supabaseAdmin
      .from("ai_workflow_policy_rules")
      .select("id, rule_name, rule_type, priority, conditions, action")
      .eq("is_active", true)
      .order("priority", { ascending: true });

    if (workflowType) {
      query = query.eq("workflow_type", workflowType);
    }
    if (tenantId) {
      query = query.eq("tenant_id", tenantId);
    }

    const { data: rules, error } = await query;
    if (error || !rules || rules.length === 0) {
      return defaultResult;
    }

    const ruleHits: PolicyResult["ruleHits"] = [];
    let finalDecision: PolicyResult["decision"] = "auto_reply_ok";
    let escalationReason: string | null = null;

    const decisionPriority: Record<string, number> = {
      block: 4,
      escalate_to_staff: 3,
      approval_required: 2,
      auto_reply_ok: 1,
    };

    for (const rule of rules) {
      const conditions = rule.conditions as Record<string, unknown>;
      const action = rule.action as { decision?: string; message?: string };

      // カテゴリマッチ
      if (conditions.category) {
        const cats = Array.isArray(conditions.category) ? conditions.category : [conditions.category];
        if (!cats.includes(classification.category)) continue;
      }
      // キートピックマッチ
      if (conditions.key_topics_contains && Array.isArray(conditions.key_topics_contains)) {
        const topics = classification.keyTopics.map(t => t.toLowerCase());
        const required = (conditions.key_topics_contains as string[]).map(t => t.toLowerCase());
        const hasMatch = required.some(req => topics.some(t => t.includes(req)));
        if (!hasMatch) continue;
      }
      // 信頼度閾値
      if (typeof conditions.confidence_below === "number") {
        if (classification.confidence >= conditions.confidence_below) continue;
      }
      // エスカレーションフラグ
      if (conditions.escalate_to_staff === true) {
        if (!classification.escalateToStaff) continue;
      }

      ruleHits.push({
        rule_id: rule.id,
        rule_name: rule.rule_name,
        rule_type: rule.rule_type,
      });

      const actionDecision = (action.decision || "auto_reply_ok") as PolicyResult["decision"];
      if ((decisionPriority[actionDecision] ?? 0) > (decisionPriority[finalDecision] ?? 0)) {
        finalDecision = actionDecision;
        if (actionDecision === "escalate_to_staff" || actionDecision === "block") {
          escalationReason = action.message || rule.rule_name;
        }
      }
    }

    return { decision: finalDecision, ruleHits, escalationReason };
  } catch (err) {
    console.error("[WorkflowRunner] ポリシー評価エラー:", err);
    return defaultResult;
  }
}

/** デフォルトsources: ソースなし */
async function defaultSources(): Promise<SourcesResult> {
  return {};
}

/** デフォルトhandoff: ハンドオフなし */
async function defaultHandoff(): Promise<HandoffResult> {
  return {
    handoffSummary: {
      targetType: "none",
      summary: "",
      urgency: "low",
      actionItems: [],
      context: {},
    },
  };
}
