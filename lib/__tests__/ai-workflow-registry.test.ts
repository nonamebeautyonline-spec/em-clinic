// AI Workflow Registry テスト
import { describe, it, expect, beforeEach } from "vitest";
import { z } from "zod/v4";
import { registerWorkflow, getWorkflow, getWorkflowOrThrow, listWorkflows, clearRegistry } from "../ai-workflows/registry";
import type { WorkflowConfig } from "../ai-workflows/types";

const dummySchema = z.object({});

function createDummyWorkflow(id: string): WorkflowConfig {
  return {
    id,
    version: "1.0.0",
    label: `${id} ワークフロー`,
    description: "テスト用",
    inputSchema: dummySchema,
    outputSchema: dummySchema,
    classifyCategories: ["a", "b"],
    allowedTools: [],
    handoffTarget: { type: "none" },
    metrics: [{ id: "test", label: "テスト", type: "count" }],
  };
}

describe("Workflow Registry", () => {
  beforeEach(() => {
    clearRegistry();
  });

  it("workflowを登録・取得できる", () => {
    const wf = createDummyWorkflow("test-1");
    registerWorkflow(wf);

    const result = getWorkflow("test-1");
    expect(result).toBeDefined();
    expect(result!.id).toBe("test-1");
    expect(result!.label).toBe("test-1 ワークフロー");
  });

  it("重複登録はエラー", () => {
    registerWorkflow(createDummyWorkflow("dup-test"));
    expect(() => registerWorkflow(createDummyWorkflow("dup-test"))).toThrow("既に登録済み");
  });

  it("未登録のworkflowはundefinedを返す", () => {
    expect(getWorkflow("nonexistent")).toBeUndefined();
  });

  it("getWorkflowOrThrowは未登録時にエラー", () => {
    expect(() => getWorkflowOrThrow("nonexistent")).toThrow("見つかりません");
  });

  it("getWorkflowOrThrowは登録済みの場合は正常に返す", () => {
    registerWorkflow(createDummyWorkflow("found-test"));
    const result = getWorkflowOrThrow("found-test");
    expect(result.id).toBe("found-test");
  });

  it("listWorkflowsは全登録済みworkflowを返す", () => {
    registerWorkflow(createDummyWorkflow("wf-1"));
    registerWorkflow(createDummyWorkflow("wf-2"));
    registerWorkflow(createDummyWorkflow("wf-3"));

    const list = listWorkflows();
    expect(list.length).toBe(3);
    expect(list.map(w => w.id).sort()).toEqual(["wf-1", "wf-2", "wf-3"]);
  });

  it("clearRegistryでクリアできる", () => {
    registerWorkflow(createDummyWorkflow("clear-test"));
    expect(listWorkflows().length).toBe(1);

    clearRegistry();
    expect(listWorkflows().length).toBe(0);
  });
});
