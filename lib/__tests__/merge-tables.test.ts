// lib/__tests__/merge-tables.test.ts — MERGE_TABLES定数テスト

// merge-tables.ts が supabaseAdmin をインポートするためモックが必要
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then: vi.fn((resolve: any) => resolve({ data: null, error: null })),
    })),
  },
}));

import { describe, it, expect, vi } from "vitest";
import { MERGE_TABLES } from "@/lib/merge-tables";

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
