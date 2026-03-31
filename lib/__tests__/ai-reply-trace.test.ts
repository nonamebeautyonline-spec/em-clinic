import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Supabase / tenant モック ---
let mockInsertResult: { error: unknown } = { error: null };
const mockQueryBuilder = {
  insert: vi.fn().mockImplementation(() => Promise.resolve(mockInsertResult)),
};
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: vi.fn(() => mockQueryBuilder) },
}));
vi.mock("@/lib/tenant", () => ({
  tenantPayload: vi.fn((id: string | null) => ({ tenant_id: id })),
}));

import { supabaseAdmin } from "@/lib/supabase";
import { TraceBuilder, saveReplyTrace } from "@/lib/ai-reply-trace";

describe("ai-reply-trace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsertResult = { error: null };
  });

  // =========================================================
  // TraceBuilder
  // =========================================================
  describe("TraceBuilder", () => {
    it("setBase→setDraftId→save で正しくinsertが呼ばれる", async () => {
      const builder = new TraceBuilder();
      await builder
        .setBase("tenant-1", "patient-1")
        .setDraftId(42)
        .save();

      // from("ai_reply_traces") が呼ばれること
      expect(supabaseAdmin.from).toHaveBeenCalledWith("ai_reply_traces");

      // insert の引数を検証
      const insertArg = mockQueryBuilder.insert.mock.calls[0][0];
      expect(insertArg).toMatchObject({
        tenant_id: "tenant-1",
        draft_id: 42,
        patient_id: "patient-1",
      });
    });

    it("draftId未設定→saveがスキップされる", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const builder = new TraceBuilder();
      await builder.setBase("tenant-1", "patient-1").save();

      // insert が呼ばれないこと
      expect(mockQueryBuilder.insert).not.toHaveBeenCalled();
      // 警告ログが出力されること
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("draftIdまたはpatientIdが未設定")
      );

      warnSpy.mockRestore();
    });

    it("全メソッドのチェーンが動作する", async () => {
      const builder = new TraceBuilder();
      const result = builder
        .setBase("t", "p")
        .setDraftId(1)
        .setRewrittenQuery("書き換え済みクエリ")
        .setClassification({ type: "greeting" })
        .setPolicy({ allow: true })
        .setExamples([{ id: 1 }], [{ id: 2 }])
        .setChunks([{ chunk: "c1" }])
        .setToolCalls([{ name: "tool1" }])
        .setPatientState({ status: "active" })
        .setModel("claude-3", "raw response")
        .setPrompts("system prompt", "user message");

      // 全メソッドが this を返し、チェーン可能であること
      expect(result).toBeInstanceOf(TraceBuilder);

      await result.save();

      const insertArg = mockQueryBuilder.insert.mock.calls[0][0];
      expect(insertArg).toMatchObject({
        tenant_id: "t",
        draft_id: 1,
        patient_id: "p",
        rewritten_query: "書き換え済みクエリ",
        classification_result: { type: "greeting" },
        policy_decision: { allow: true },
        candidate_examples: [{ id: 1 }],
        reranked_examples: [{ id: 2 }],
        candidate_chunks: [{ chunk: "c1" }],
        tool_calls: [{ name: "tool1" }],
        patient_state_snapshot: { status: "active" },
        model_name: "claude-3",
        model_response_raw: "raw response",
      });
      // プロンプトハッシュも生成されていること
      expect(insertArg.prompt_hash).toBeTypeOf("string");
      expect(insertArg.prompt_hash).toHaveLength(16);
    });
  });

  // =========================================================
  // saveReplyTrace
  // =========================================================
  describe("saveReplyTrace", () => {
    it("プロンプトハッシュが生成される", async () => {
      await saveReplyTrace({
        tenantId: "t1",
        draftId: 10,
        patientId: "p1",
        systemPrompt: "sys",
        userMessage: "usr",
      });

      const insertArg = mockQueryBuilder.insert.mock.calls[0][0];
      // SHA256("sysusr") の先頭16文字
      expect(insertArg.prompt_hash).toBeTypeOf("string");
      expect(insertArg.prompt_hash).toHaveLength(16);

      // プロンプト未設定の場合は null
      vi.clearAllMocks();
      await saveReplyTrace({
        tenantId: "t1",
        draftId: 10,
        patientId: "p1",
      });
      const insertArg2 = mockQueryBuilder.insert.mock.calls[0][0];
      expect(insertArg2.prompt_hash).toBeNull();
    });

    it("insert失敗→エラーがスローされない（console.errorのみ）", async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // insert が例外を投げるケース
      mockQueryBuilder.insert.mockImplementationOnce(() => {
        throw new Error("DB接続失敗");
      });

      // 例外がスローされないこと
      await expect(
        saveReplyTrace({
          tenantId: "t1",
          draftId: 10,
          patientId: "p1",
        })
      ).resolves.toBeUndefined();

      // console.error が呼ばれていること
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining("[AI Trace] 保存エラー"),
        expect.any(Error)
      );

      errorSpy.mockRestore();
    });
  });
});
