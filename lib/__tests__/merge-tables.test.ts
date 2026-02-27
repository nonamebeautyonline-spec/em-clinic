// lib/__tests__/merge-tables.test.ts — MERGE_TABLES定数 + migrateFriendSummary テスト

// merge-tables.ts が supabaseAdmin をインポートするためモックが必要
let mockUpdateResult: any = { data: null, error: null };
let mockDeleteResult: any = { data: null, error: null };

const mockEq = vi.fn().mockImplementation(() => mockUpdateResult);
const mockDeleteEq = vi.fn().mockImplementation(() => mockDeleteResult);

const mockFrom = vi.fn().mockImplementation(() => ({
  update: vi.fn().mockImplementation(() => ({
    eq: mockEq,
  })),
  delete: vi.fn().mockImplementation(() => ({
    eq: mockDeleteEq,
  })),
  eq: vi.fn().mockReturnThis(),
  then: vi.fn((resolve: any) => resolve({ data: null, error: null })),
}));

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: (...args: any[]) => mockFrom(...args),
  },
}));

import { describe, it, expect, vi, beforeEach } from "vitest";
import { MERGE_TABLES, migrateFriendSummary } from "@/lib/merge-tables";

beforeEach(() => {
  vi.clearAllMocks();
  mockUpdateResult = { data: null, error: null };
  mockDeleteResult = { data: null, error: null };
});

// ---------- MERGE_TABLES（既存テスト） ----------
describe("MERGE_TABLES", () => {
  it("7個のテーブルが定義されている", () => {
    expect(MERGE_TABLES).toHaveLength(7);
  });

  it("必要なテーブルが全て含まれている", () => {
    expect(MERGE_TABLES).toContain("reservations");
    expect(MERGE_TABLES).toContain("orders");
    expect(MERGE_TABLES).toContain("reorders");
    expect(MERGE_TABLES).toContain("message_log");
    expect(MERGE_TABLES).toContain("patient_tags");
    expect(MERGE_TABLES).toContain("patient_marks");
    expect(MERGE_TABLES).toContain("friend_field_values");
  });

  it("intake は含まれていない（各箇所で個別処理するため）", () => {
    expect(MERGE_TABLES).not.toContain("intake");
  });

  it("patients は含まれていない（統合元は soft delete するため）", () => {
    expect(MERGE_TABLES).not.toContain("patients");
  });

  it("文字列の配列である", () => {
    for (const table of MERGE_TABLES) {
      expect(typeof table).toBe("string");
      expect(table.length).toBeGreaterThan(0);
    }
  });
});

// ---------- migrateFriendSummary ----------
describe("migrateFriendSummary", () => {
  it("UPDATE成功時はDELETEが呼ばれない", async () => {
    // update -> error: null（成功）
    mockUpdateResult = { data: null, error: null };

    await migrateFriendSummary("old-id", "new-id");

    // fromが1回だけ呼ばれる（updateのみ）
    expect(mockFrom).toHaveBeenCalledTimes(1);
    expect(mockFrom).toHaveBeenCalledWith("friend_summaries");
  });

  it("UPDATE失敗（PK競合）時は旧エントリをDELETEする", async () => {
    // update -> error（PK競合）
    mockUpdateResult = { data: null, error: { message: "duplicate key" } };

    await migrateFriendSummary("old-id", "new-id");

    // fromが2回呼ばれる（update + delete）
    expect(mockFrom).toHaveBeenCalledTimes(2);
    expect(mockFrom).toHaveBeenNthCalledWith(1, "friend_summaries");
    expect(mockFrom).toHaveBeenNthCalledWith(2, "friend_summaries");
  });

  it("正しいテーブル名 'friend_summaries' でクエリされる", async () => {
    mockUpdateResult = { data: null, error: null };

    await migrateFriendSummary("a", "b");

    expect(mockFrom).toHaveBeenCalledWith("friend_summaries");
  });

  it("新旧patient_idが正しく渡される", async () => {
    mockUpdateResult = { data: null, error: null };

    await migrateFriendSummary("old-patient", "new-patient");

    // update呼び出し時のチェーンで update({ patient_id: newId }).eq("patient_id", oldId)
    const fromResult = mockFrom.mock.results[0].value;
    expect(fromResult.update).toHaveBeenCalledWith({ patient_id: "new-patient" });
    expect(mockEq).toHaveBeenCalledWith("patient_id", "old-patient");
  });
});
