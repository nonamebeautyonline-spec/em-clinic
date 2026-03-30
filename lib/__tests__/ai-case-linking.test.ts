// AI Case Linking テスト
// 名寄せロジックテスト（Supabase mock）

import { describe, it, expect, vi, beforeEach } from "vitest";

// Supabase モック
const mockSingle = vi.fn();
const mockLimit = vi.fn(() => ({ single: mockSingle }));
const mockOrder = vi.fn(() => ({ limit: mockLimit }));
const mockEq = vi.fn(() => ({ eq: mockEq, order: mockOrder, limit: mockLimit, single: mockSingle }));
const mockSelect = vi.fn(() => ({ eq: mockEq, in: vi.fn(() => ({ order: vi.fn(() => ({ data: [], error: null })) })) }));
const mockInsert = vi.fn(() => ({ select: vi.fn(() => ({ single: mockSingle })) }));
const mockUpdate = vi.fn(() => ({ eq: mockEq }));
const mockUpsert = vi.fn(() => ({ data: null, error: null }));
const mockFrom = vi.fn(() => ({
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
  upsert: mockUpsert,
}));

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: mockFrom },
}));

// テスト対象をモック後にインポート
const { findExistingCase, createCase, resolveCase } = await import("../ai-case-linking");

describe("findExistingCase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // デフォルト: 見つからない
    mockSingle.mockResolvedValue({ data: null, error: null });
  });

  it("patientId でケースが見つかる場合", async () => {
    mockSingle.mockResolvedValueOnce({
      data: { id: "case-123", status: "open" },
      error: null,
    });

    const result = await findExistingCase("tenant-1", { patientId: "P001" });

    expect(result).toEqual({ caseId: "case-123", status: "open" });
    expect(mockFrom).toHaveBeenCalledWith("ai_cases");
  });

  it("識別子がすべて未指定の場合はnull", async () => {
    const result = await findExistingCase("tenant-1", {});
    expect(result).toBeNull();
  });
});

describe("createCase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ケース作成成功", async () => {
    mockSingle.mockResolvedValueOnce({
      data: { id: "new-case-456" },
      error: null,
    });

    const caseId = await createCase("tenant-1", "P001", "テストサマリー");
    expect(caseId).toBe("new-case-456");
  });

  it("ケース作成失敗時にエラーを投げる", async () => {
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { message: "DB error" },
    });

    await expect(createCase("tenant-1", "P001")).rejects.toThrow("ケース作成失敗");
  });
});

describe("resolveCase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ケースを解決済みに更新する", async () => {
    await resolveCase("case-789");

    expect(mockFrom).toHaveBeenCalledWith("ai_cases");
    expect(mockUpdate).toHaveBeenCalled();
  });
});
