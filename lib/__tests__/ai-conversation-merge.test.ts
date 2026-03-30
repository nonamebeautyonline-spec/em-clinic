// AI Conversation Merge テスト
// extractTaskSummary テスト（純ロジック）

import { describe, it, expect, vi } from "vitest";

// Supabase モック（ai-conversation-merge → ai-case-linking → supabase の依存解決用）
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: vi.fn() },
}));

import { extractTaskSummary } from "../ai-conversation-merge";

describe("extractTaskSummary", () => {
  it("handoff_summary.summary を優先的に返す", () => {
    const result = extractTaskSummary({
      output: { internalSummary: "output要約", suggestedReply: "返信案" },
      handoff_summary: { summary: "ハンドオフ要約", urgency: "high" },
      workflow_type: "support-intake",
    });
    expect(result).toBe("ハンドオフ要約");
  });

  it("handoff_summary がない場合は output.internalSummary を返す", () => {
    const result = extractTaskSummary({
      output: { internalSummary: "内部要約テキスト", suggestedReply: "返信案" },
      handoff_summary: null,
      workflow_type: "support-intake",
    });
    expect(result).toBe("内部要約テキスト");
  });

  it("internalSummary がない場合は output.suggestedReply を返す", () => {
    const result = extractTaskSummary({
      output: { suggestedReply: "返信案テキスト" },
      handoff_summary: null,
      workflow_type: "support-intake",
    });
    expect(result).toBe("返信案テキスト");
  });

  it("output.reply を返す（LINE workflow）", () => {
    const result = extractTaskSummary({
      output: { reply: "LINEの返信テキスト" },
      handoff_summary: null,
      workflow_type: "line-reply",
    });
    expect(result).toBe("LINEの返信テキスト");
  });

  it("すべて空の場合は空文字列を返す", () => {
    const result = extractTaskSummary({
      output: null,
      handoff_summary: null,
      workflow_type: "support-intake",
    });
    expect(result).toBe("");
  });

  it("handoff_summary.summary が空文字の場合はフォールバック", () => {
    const result = extractTaskSummary({
      output: { internalSummary: "フォールバック要約" },
      handoff_summary: { summary: "" },
      workflow_type: "support-intake",
    });
    expect(result).toBe("フォールバック要約");
  });

  it("output が文字列でない場合はスキップ", () => {
    const result = extractTaskSummary({
      output: { internalSummary: 123 },
      handoff_summary: null,
      workflow_type: "support-intake",
    });
    expect(result).toBe("");
  });

  it("handoff_summary がオブジェクトでない場合はスキップ", () => {
    const result = extractTaskSummary({
      output: { suggestedReply: "返信" },
      handoff_summary: "文字列",
      workflow_type: "support-intake",
    });
    expect(result).toBe("返信");
  });
});
