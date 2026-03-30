// AI設定バージョン管理のテスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Supabaseモック ---
const mockQueryBuilder = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  is: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
};

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({ ...mockQueryBuilder })),
  },
}));

vi.mock("@/lib/tenant", () => ({
  tenantPayload: (tenantId: string | null) => ({ tenant_id: tenantId }),
}));

import { diffConfigs, type ConfigDiff } from "@/lib/ai-config-versioning";

// ============================================================
// diffConfigs のテスト（純ロジック、Supabase不要）
// ============================================================

describe("diffConfigs", () => {
  it("追加されたキーを検出する", () => {
    const before = { a: 1 };
    const after = { a: 1, b: 2 };
    const result: ConfigDiff = diffConfigs(before, after);

    expect(result.added).toEqual({ b: 2 });
    expect(Object.keys(result.changed)).toHaveLength(0);
    expect(Object.keys(result.removed)).toHaveLength(0);
  });

  it("削除されたキーを検出する", () => {
    const before = { a: 1, b: 2 };
    const after = { a: 1 };
    const result: ConfigDiff = diffConfigs(before, after);

    expect(Object.keys(result.added)).toHaveLength(0);
    expect(Object.keys(result.changed)).toHaveLength(0);
    expect(result.removed).toEqual({ b: 2 });
  });

  it("変更されたキーを検出する", () => {
    const before = { a: 1, b: "old" };
    const after = { a: 1, b: "new" };
    const result: ConfigDiff = diffConfigs(before, after);

    expect(Object.keys(result.added)).toHaveLength(0);
    expect(result.changed).toEqual({ b: { before: "old", after: "new" } });
    expect(Object.keys(result.removed)).toHaveLength(0);
  });

  it("ネストされたオブジェクトの変更を検出する", () => {
    const before = { config: { threshold: 0.5 } };
    const after = { config: { threshold: 0.7 } };
    const result: ConfigDiff = diffConfigs(before, after);

    expect(result.changed).toEqual({
      config: {
        before: { threshold: 0.5 },
        after: { threshold: 0.7 },
      },
    });
  });

  it("変更がない場合は空の差分を返す", () => {
    const before = { a: 1, b: "test" };
    const after = { a: 1, b: "test" };
    const result: ConfigDiff = diffConfigs(before, after);

    expect(Object.keys(result.added)).toHaveLength(0);
    expect(Object.keys(result.changed)).toHaveLength(0);
    expect(Object.keys(result.removed)).toHaveLength(0);
  });

  it("追加・変更・削除を同時に検出する", () => {
    const before = { a: 1, b: 2, c: 3 };
    const after = { a: 10, c: 3, d: 4 };
    const result: ConfigDiff = diffConfigs(before, after);

    expect(result.added).toEqual({ d: 4 });
    expect(result.changed).toEqual({ a: { before: 1, after: 10 } });
    expect(result.removed).toEqual({ b: 2 });
  });

  it("空オブジェクト同士は差分なし", () => {
    const result: ConfigDiff = diffConfigs({}, {});
    expect(Object.keys(result.added)).toHaveLength(0);
    expect(Object.keys(result.changed)).toHaveLength(0);
    expect(Object.keys(result.removed)).toHaveLength(0);
  });

  it("空→値ありは全て追加として検出", () => {
    const result: ConfigDiff = diffConfigs({}, { x: 1, y: 2 });
    expect(result.added).toEqual({ x: 1, y: 2 });
  });

  it("値あり→空は全て削除として検出", () => {
    const result: ConfigDiff = diffConfigs({ x: 1, y: 2 }, {});
    expect(result.removed).toEqual({ x: 1, y: 2 });
  });
});
