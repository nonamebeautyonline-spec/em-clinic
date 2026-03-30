// AI設定変更承認フローのテスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Supabaseモック（vi.hoisted使用） ---
const { mockFrom } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: mockFrom },
}));

vi.mock("@/lib/tenant", () => ({
  tenantPayload: (tenantId: string | null) => ({ tenant_id: tenantId }),
}));

import {
  createChangeRequest,
  approveChangeRequest,
  rejectChangeRequest,
  applyChangeRequest,
} from "@/lib/ai-change-approval";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createChangeRequest", () => {
  it("変更リクエストを作成できる", async () => {
    const mockCR = {
      id: 1,
      tenant_id: null,
      config_type: "ai_reply_settings",
      change_description: "閾値を変更",
      diff: { threshold: { before: 0.5, after: 0.7 } },
      status: "pending",
      requested_by: "admin",
      reviewed_by: null,
      reviewed_at: null,
      applied_at: null,
      created_at: "2026-03-30T00:00:00Z",
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === "ai_config_change_requests") {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockCR, error: null }),
            }),
          }),
        };
      }
      // 監査ログ用
      return {
        insert: vi.fn().mockResolvedValue({ error: null }),
      };
    });

    const result = await createChangeRequest(
      null,
      "ai_reply_settings",
      "閾値を変更",
      { threshold: { before: 0.5, after: 0.7 } },
      "admin"
    );

    expect(result.id).toBe(1);
    expect(result.status).toBe("pending");
    expect(result.config_type).toBe("ai_reply_settings");
  });

  it("保存エラー時は例外をスロー", async () => {
    mockFrom.mockImplementation(() => ({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: "DB error" },
          }),
        }),
      }),
    }));

    await expect(
      createChangeRequest(null, "test", "desc", {}, "admin")
    ).rejects.toThrow("変更リクエスト作成に失敗しました");
  });
});

describe("approveChangeRequest", () => {
  it("pending→approvedに遷移する", async () => {
    const mockApproved = {
      id: 1,
      tenant_id: null,
      config_type: "ai_reply_settings",
      status: "approved",
      reviewed_by: "reviewer",
      reviewed_at: "2026-03-30T00:00:00Z",
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === "ai_config_change_requests") {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: mockApproved, error: null }),
                }),
              }),
            }),
          }),
        };
      }
      return { insert: vi.fn().mockResolvedValue({ error: null }) };
    });

    const result = await approveChangeRequest(1, "reviewer");
    expect(result.status).toBe("approved");
    expect(result.reviewed_by).toBe("reviewer");
  });
});

describe("rejectChangeRequest", () => {
  it("pending→rejectedに遷移する", async () => {
    const mockRejected = {
      id: 1,
      tenant_id: null,
      config_type: "ai_reply_settings",
      status: "rejected",
      reviewed_by: "reviewer",
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === "ai_config_change_requests") {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: mockRejected, error: null }),
                }),
              }),
            }),
          }),
        };
      }
      return { insert: vi.fn().mockResolvedValue({ error: null }) };
    });

    const result = await rejectChangeRequest(1, "reviewer");
    expect(result.status).toBe("rejected");
  });
});

describe("applyChangeRequest", () => {
  it("approved→appliedに遷移する", async () => {
    const mockApplied = {
      id: 1,
      status: "applied",
      applied_at: "2026-03-30T00:00:00Z",
    };

    mockFrom.mockImplementation(() => ({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockApplied, error: null }),
            }),
          }),
        }),
      }),
    }));

    const result = await applyChangeRequest(1);
    expect(result.status).toBe("applied");
  });
});
