// AI設定バージョン管理のテスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Supabaseモック ---
function createMockChain(data: unknown = null, error: unknown = null) {
  const chain: Record<string, any> = {};
  const methods = ["from", "select", "eq", "is", "order", "limit", "insert", "single", "maybeSingle"];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.then = (resolve: any) => resolve({ data, error });
  return chain;
}

const mockFrom = vi.fn();
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

vi.mock("@/lib/tenant", () => ({
  tenantPayload: (tenantId: string | null) => ({ tenant_id: tenantId }),
}));

import {
  diffConfigs,
  saveConfigVersion,
  getConfigVersions,
  getConfigVersion,
  rollbackConfig,
  type ConfigDiff,
} from "@/lib/ai-config-versioning";

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

// ── saveConfigVersion ──

describe("saveConfigVersion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("既存バージョンがない場合、version_number=1で保存する", async () => {
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // 最大version_number取得（既存なし）
        return createMockChain([]);
      } else if (callCount === 2) {
        // INSERT + select + single
        return createMockChain({
          id: 1,
          tenant_id: "t1",
          config_type: "prompt",
          config_snapshot: { key: "value" },
          version_number: 1,
          created_by: "admin",
          created_at: "2026-01-01T00:00:00Z",
        });
      } else {
        // 監査ログ
        return createMockChain(null);
      }
    });

    const result = await saveConfigVersion("t1", "prompt", { key: "value" }, "admin");
    expect(result.version_number).toBe(1);
    expect(result.config_type).toBe("prompt");
  });

  it("既存バージョンがある場合、version_numberをインクリメントする", async () => {
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return createMockChain([{ version_number: 3 }]);
      } else if (callCount === 2) {
        return createMockChain({
          id: 4,
          tenant_id: "t1",
          config_type: "prompt",
          config_snapshot: { key: "new" },
          version_number: 4,
          created_by: "admin",
          created_at: "2026-01-01T00:00:00Z",
        });
      } else {
        return createMockChain(null);
      }
    });

    const result = await saveConfigVersion("t1", "prompt", { key: "new" }, "admin");
    expect(result.version_number).toBe(4);
  });

  it("INSERT失敗時にエラーをthrowする", async () => {
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return createMockChain([]);
      }
      return createMockChain(null, { message: "insert failed" });
    });

    await expect(
      saveConfigVersion("t1", "prompt", {}, "admin")
    ).rejects.toThrow("バージョン保存に失敗しました");
  });

  it("tenantId=nullの場合でも正常に動作する", async () => {
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return createMockChain([]);
      } else if (callCount === 2) {
        return createMockChain({
          id: 1,
          tenant_id: null,
          config_type: "global",
          config_snapshot: {},
          version_number: 1,
          created_by: "system",
          created_at: "2026-01-01T00:00:00Z",
        });
      } else {
        return createMockChain(null);
      }
    });

    const result = await saveConfigVersion(null, "global", {}, "system");
    expect(result.tenant_id).toBeNull();
  });
});

// ── getConfigVersions ──

describe("getConfigVersions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("バージョン一覧を返す", async () => {
    const versions = [
      { id: 2, version_number: 2, config_type: "prompt" },
      { id: 1, version_number: 1, config_type: "prompt" },
    ];
    mockFrom.mockReturnValue(createMockChain(versions));

    const result = await getConfigVersions("t1", "prompt");
    expect(result).toHaveLength(2);
  });

  it("エラー時は空配列を返す", async () => {
    mockFrom.mockReturnValue(createMockChain(null, { message: "error" }));

    const result = await getConfigVersions("t1", "prompt");
    expect(result).toEqual([]);
  });

  it("limitパラメータを指定できる", async () => {
    mockFrom.mockReturnValue(createMockChain([]));

    const result = await getConfigVersions("t1", "prompt", 5);
    expect(result).toEqual([]);
  });
});

// ── getConfigVersion ──

describe("getConfigVersion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("指定バージョンを返す", async () => {
    const version = { id: 1, version_number: 1, config_type: "prompt", config_snapshot: { key: "val" } };
    mockFrom.mockReturnValue(createMockChain([version]));

    const result = await getConfigVersion("t1", "prompt", 1);
    expect(result).toEqual(version);
  });

  it("存在しない場合nullを返す", async () => {
    mockFrom.mockReturnValue(createMockChain([]));

    const result = await getConfigVersion("t1", "prompt", 999);
    expect(result).toBeNull();
  });

  it("エラー時nullを返す", async () => {
    mockFrom.mockReturnValue(createMockChain(null, { message: "error" }));

    const result = await getConfigVersion("t1", "prompt", 1);
    expect(result).toBeNull();
  });
});

// ── rollbackConfig ──

describe("rollbackConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("対象バージョンが見つからない場合エラーをthrowする", async () => {
    // getConfigVersion → null
    mockFrom.mockReturnValue(createMockChain([]));

    await expect(
      rollbackConfig("t1", "prompt", 999, "admin")
    ).rejects.toThrow("バージョン 999 が見つかりません");
  });
});
