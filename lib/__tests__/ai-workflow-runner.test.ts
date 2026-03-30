// AI Workflow Runner テスト
import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod/v4";

// supabaseAdmin モック
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: { id: "test-task-id-001" },
            error: null,
          })),
        })),
      })),
    })),
  },
}));

vi.mock("@/lib/tenant", () => ({
  tenantPayload: (tenantId: string | null) => ({ tenant_id: tenantId }),
}));

// runner内のdefaultClassifyが使うAnthropic SDKもモック
vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: "text", text: '{"category": "general", "confidence": 0.8, "should_reply": true, "escalate_to_staff": false, "key_topics": ["test"], "reasoning": "テスト"}' }],
        usage: { input_tokens: 100, output_tokens: 50 },
      }),
    },
  })),
}));

import { runWorkflow } from "../ai-workflows/runner";
import { WorkflowTraceBuilder, saveTaskRun } from "../ai-workflows/trace-builder";
import type { WorkflowConfig, GenerateContext, GenerateResult } from "../ai-workflows/types";

// テスト用 workflow config
const testInputSchema = z.object({
  text: z.string(),
});
const testOutputSchema = z.object({
  reply: z.string(),
  score: z.number(),
});

type TestInput = z.infer<typeof testInputSchema>;
type TestOutput = z.infer<typeof testOutputSchema>;

function createTestWorkflow(overrides?: Partial<WorkflowConfig<TestInput, TestOutput>>): WorkflowConfig<TestInput, TestOutput> {
  return {
    id: "test-workflow",
    version: "1.0.0",
    label: "テストワークフロー",
    description: "テスト用",
    inputSchema: testInputSchema,
    outputSchema: testOutputSchema,
    classifyCategories: ["general", "urgent"] as const,
    allowedTools: [],
    handoffTarget: { type: "human", channel: "test" },
    metrics: [
      { id: "test_rate", label: "テスト率", type: "percentage" },
    ],
    hooks: {
      generate: async (ctx: GenerateContext<TestInput>): Promise<GenerateResult<TestOutput>> => ({
        output: { reply: "テスト返信", score: 0.9 },
        evidence: [{ type: "custom", source: "test", content: "テスト根拠" }],
        modelName: "test-model",
        inputTokens: 200,
        outputTokens: 100,
      }),
      handoff: async () => ({
        handoffSummary: {
          targetType: "human",
          summary: "テスト引き継ぎ",
          urgency: "medium",
          actionItems: ["確認する"],
          context: { test: true },
        },
      }),
    },
    ...overrides,
  };
}

describe("WorkflowTraceBuilder", () => {
  it("チェーンAPIでトレースを構築できる", () => {
    const builder = new WorkflowTraceBuilder("test-workflow", "tenant-1");
    builder
      .setSubject("patient", "p-001")
      .setFilter({ shouldProcess: true })
      .setClassify({
        category: "general",
        confidence: 0.8,
        shouldReply: true,
        escalateToStaff: false,
        keyTopics: ["test"],
        reasoning: "テスト",
      })
      .setPolicy({
        decision: "auto_reply_ok",
        ruleHits: [],
        escalationReason: null,
      });

    const result = builder.build("completed", { text: "テスト" });

    expect(result.workflowType).toBe("test-workflow");
    expect(result.tenantId).toBe("tenant-1");
    expect(result.subjectType).toBe("patient");
    expect(result.subjectId).toBe("p-001");
    expect(result.status).toBe("completed");
    expect(result.trace.filterResult?.shouldProcess).toBe(true);
    expect(result.trace.classifyResult?.category).toBe("general");
    expect(result.trace.policyResult?.decision).toBe("auto_reply_ok");
  });

  it("warningを追加できる", () => {
    const builder = new WorkflowTraceBuilder("test-workflow", null);
    builder.addWarning("no_evidence");
    builder.addWarning("output_schema_validation_failed");

    const result = builder.build("completed", {});
    expect(result.trace.warnings).toEqual(["no_evidence", "output_schema_validation_failed"]);
  });

  it("エラーを記録できる", () => {
    const builder = new WorkflowTraceBuilder("test-workflow", null);
    builder.setError("生成エラー");

    const result = builder.build("failed", {});
    expect(result.trace.error).toBe("生成エラー");
  });

  it("プロンプトハッシュを生成できる", () => {
    const builder = new WorkflowTraceBuilder("test-workflow", null);
    const result = builder.build("completed", {}, {
      output: {},
      evidence: [],
      systemPrompt: "システムプロンプト",
      userMessage: "ユーザーメッセージ",
    });
    expect(result.promptHash).toBeTruthy();
    expect(result.promptHash!.length).toBe(16);
  });

  it("completedAt はステータスに応じて設定される", () => {
    const builder = new WorkflowTraceBuilder("test-workflow", null);

    const completed = builder.build("completed", {});
    expect(completed.completedAt).toBeTruthy();

    const builder2 = new WorkflowTraceBuilder("test-workflow", null);
    const running = builder2.build("running", {});
    expect(running.completedAt).toBeUndefined();
  });
});

describe("saveTaskRun", () => {
  it("DBに保存してIDを返す", async () => {
    const builder = new WorkflowTraceBuilder("test-workflow", "tenant-1");
    const taskRun = builder.build("completed", { text: "テスト" });

    const id = await saveTaskRun(taskRun);
    expect(id).toBe("test-task-id-001");
  });
});

describe("runWorkflow", () => {
  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = "test-key";
  });

  it("正常系: 全パイプラインを実行して結果を返す", async () => {
    const config = createTestWorkflow();
    const { taskRun, taskId } = await runWorkflow(
      config,
      { text: "テストメッセージ" },
      "tenant-1",
      { subjectId: "p-001", subjectType: "patient" },
    );

    expect(taskRun.status).toBe("completed");
    expect(taskRun.workflowType).toBe("test-workflow");
    expect(taskRun.output).toEqual({ reply: "テスト返信", score: 0.9 });
    expect(taskRun.outputEvidence.length).toBe(1);
    expect(taskRun.handoffSummary.summary).toBe("テスト引き継ぎ");
    expect(taskRun.handoffSummary.urgency).toBe("medium");
    expect(taskId).toBe("test-task-id-001");
  });

  it("filter でスキップされた場合は skipped を返す", async () => {
    const config = createTestWorkflow({
      hooks: {
        filter: async () => ({ shouldProcess: false, reason: "テスト用スキップ" }),
        generate: async () => ({ output: { reply: "", score: 0 }, evidence: [] }),
      },
    });

    const { taskRun } = await runWorkflow(config, { text: "skip" }, null);
    expect(taskRun.status).toBe("skipped");
    expect(taskRun.trace.filterResult?.shouldProcess).toBe(false);
  });

  it("policy で block された場合は skipped を返す", async () => {
    const config = createTestWorkflow({
      hooks: {
        policy: async () => ({
          decision: "block",
          ruleHits: [{ rule_id: 1, rule_name: "test-block", rule_type: "block" }],
          escalationReason: "テストブロック",
        }),
        generate: async () => ({ output: { reply: "", score: 0 }, evidence: [] }),
      },
    });

    const { taskRun } = await runWorkflow(config, { text: "blocked" }, null);
    expect(taskRun.status).toBe("skipped");
    expect(taskRun.trace.policyResult?.decision).toBe("block");
  });

  it("generate でエラーが発生した場合は failed を返す", async () => {
    const config = createTestWorkflow({
      hooks: {
        generate: async () => { throw new Error("生成失敗テスト"); },
      },
    });

    const { taskRun } = await runWorkflow(config, { text: "error" }, null);
    expect(taskRun.status).toBe("failed");
    expect(taskRun.trace.error).toBe("生成失敗テスト");
  });

  it("escalate_to_staff の場合は escalated を返す", async () => {
    const config = createTestWorkflow({
      hooks: {
        policy: async () => ({
          decision: "escalate_to_staff",
          ruleHits: [],
          escalationReason: "エスカレーション必要",
        }),
        generate: async () => ({
          output: { reply: "エスカレ返信", score: 0.5 },
          evidence: [{ type: "custom", source: "test", content: "根拠" }],
        }),
        handoff: async () => ({
          handoffSummary: {
            targetType: "human",
            summary: "エスカレーション",
            urgency: "high",
            actionItems: ["スタッフ対応"],
            context: {},
          },
        }),
      },
    });

    const { taskRun } = await runWorkflow(config, { text: "escalate" }, null);
    expect(taskRun.status).toBe("escalated");
    expect(taskRun.handoffSummary.urgency).toBe("high");
  });

  it("入力バリデーション失敗時は failed を返す", async () => {
    const config = createTestWorkflow();
    // text フィールドがない不正入力
    const { taskRun } = await runWorkflow(
      config,
      { invalid: true } as unknown as TestInput,
      null,
    );
    expect(taskRun.status).toBe("failed");
  });
});
