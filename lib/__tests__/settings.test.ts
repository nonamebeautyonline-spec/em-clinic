// lib/__tests__/settings.test.ts
// テナント設定 CRUD のテスト（supabase & crypto モック）
import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------- モック用チェーンビルダー ----------
let mockChainResult: any = {};

const mockQueryBuilder: any = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  is: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  upsert: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn(async () => mockChainResult),
  then: vi.fn(async (resolve: any) => resolve(mockChainResult)),
};

// supabaseAdmin.from() が呼ばれるたびにリセット済みチェーンを返す
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn(() => mockQueryBuilder),
  },
}));

vi.mock("@/lib/crypto", () => ({
  encrypt: vi.fn((v: string) => `encrypted:${v}`),
  decrypt: vi.fn((v: string) => {
    if (v.startsWith("encrypted:")) return v.slice(10);
    throw new Error("not encrypted");
  }),
}));

// テスト対象をモック後にインポート
import {
  getSetting,
  getSettingOrEnv,
  setSetting,
  deleteSetting,
  getSettingsBulk,
  getSettingsByCategory,
} from "@/lib/settings";

beforeEach(() => {
  vi.clearAllMocks();
  mockChainResult = {};
});

// ---------- getSetting ----------
describe("getSetting", () => {
  it("DB値ありの場合、decryptして返す", async () => {
    mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
      data: { value: "encrypted:my-secret" },
      error: null,
    });

    const result = await getSetting("line", "channel_secret");
    expect(result).toBe("my-secret");
    expect(mockQueryBuilder.eq).toHaveBeenCalledWith("category", "line");
    expect(mockQueryBuilder.eq).toHaveBeenCalledWith("key", "channel_secret");
  });

  it("DB値なしの場合、nullを返す", async () => {
    mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: null,
    });

    const result = await getSetting("line", "nonexistent");
    expect(result).toBeNull();
  });

  it("暗号化前データ（decrypt失敗）はそのまま返す", async () => {
    mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
      data: { value: "plain-old-value" },
      error: null,
    });

    const result = await getSetting("general", "legacy_key");
    // decrypt が throw → catch でそのまま返す
    expect(result).toBe("plain-old-value");
  });

  it("tenantId指定時は eq('tenant_id', tenantId) で絞り込む", async () => {
    mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
      data: { value: "encrypted:tenant-val" },
      error: null,
    });

    await getSetting("square", "app_id", "tenant-abc");
    expect(mockQueryBuilder.eq).toHaveBeenCalledWith("tenant_id", "tenant-abc");
  });

  it("tenantIdなしの場合は is('tenant_id', null) で絞り込む", async () => {
    mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
      data: { value: "encrypted:global-val" },
      error: null,
    });

    await getSetting("square", "app_id");
    expect(mockQueryBuilder.is).toHaveBeenCalledWith("tenant_id", null);
  });
});

// ---------- getSettingOrEnv ----------
describe("getSettingOrEnv", () => {
  it("DB値がある場合はDB値を優先", async () => {
    mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
      data: { value: "encrypted:db-value" },
      error: null,
    });
    process.env.TEST_ENV_VAR = "env-value";

    const result = await getSettingOrEnv("line", "token", "TEST_ENV_VAR");
    expect(result).toBe("db-value");

    delete process.env.TEST_ENV_VAR;
  });

  it("DB値なしの場合は process.env にフォールバック", async () => {
    mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: null,
    });
    process.env.FALLBACK_VAR = "from-env";

    const result = await getSettingOrEnv("line", "missing", "FALLBACK_VAR");
    expect(result).toBe("from-env");

    delete process.env.FALLBACK_VAR;
  });
});

// ---------- setSetting ----------
describe("setSetting", () => {
  it("encrypt→upsert成功でtrueを返す", async () => {
    mockQueryBuilder.upsert.mockReturnValueOnce({
      error: null,
    });

    const result = await setSetting("line", "channel_secret", "new-secret");
    expect(result).toBe(true);

    // encrypt が呼ばれたことを確認
    const { encrypt } = await import("@/lib/crypto");
    expect(encrypt).toHaveBeenCalledWith("new-secret");
  });

  it("upsert失敗でfalseを返す", async () => {
    mockQueryBuilder.upsert.mockReturnValueOnce({
      error: { message: "DB error" },
    });

    const result = await setSetting("line", "channel_secret", "value");
    expect(result).toBe(false);
  });
});

// ---------- deleteSetting ----------
describe("deleteSetting", () => {
  it("正常削除でtrueを返す", async () => {
    // delete().eq().eq().is() の最終結果
    mockQueryBuilder.is.mockResolvedValueOnce({ error: null });

    const result = await deleteSetting("line", "channel_secret");
    expect(result).toBe(true);
    expect(mockQueryBuilder.delete).toHaveBeenCalled();
    expect(mockQueryBuilder.eq).toHaveBeenCalledWith("category", "line");
    expect(mockQueryBuilder.eq).toHaveBeenCalledWith("key", "channel_secret");
  });
});

// ---------- getSettingsBulk ----------
describe("getSettingsBulk", () => {
  it("複数カテゴリを一括取得してMapを返す", async () => {
    // getSettingsBulk はチェーン最後に await query（then経由）で解決する
    mockChainResult = {
      data: [
        { category: "line", key: "token", value: "encrypted:line-token" },
        { category: "square", key: "app_id", value: "encrypted:sq-app" },
      ],
      error: null,
    };

    const result = await getSettingsBulk(["line", "square"]);
    expect(result).toBeInstanceOf(Map);
    expect(result.get("line:token")).toBe("line-token");
    expect(result.get("square:app_id")).toBe("sq-app");
    expect(mockQueryBuilder.in).toHaveBeenCalledWith("category", ["line", "square"]);
  });

  it("DB値なしの場合は空Mapを返す", async () => {
    mockChainResult = { data: null, error: null };

    const result = await getSettingsBulk(["line"]);
    expect(result).toBeInstanceOf(Map);
    expect(result.size).toBe(0);
  });

  it("decrypt失敗時はそのまま値を返す", async () => {
    mockChainResult = {
      data: [
        { category: "general", key: "legacy", value: "plain-text-value" },
      ],
      error: null,
    };

    const result = await getSettingsBulk(["general"]);
    // decrypt が throw → catch でそのまま返す
    expect(result.get("general:legacy")).toBe("plain-text-value");
  });

  it("tenantId指定時はeq('tenant_id')で絞り込む", async () => {
    mockChainResult = { data: [], error: null };

    await getSettingsBulk(["line"], "tenant-bulk");
    expect(mockQueryBuilder.eq).toHaveBeenCalledWith("tenant_id", "tenant-bulk");
  });
});

// ---------- getSettingsByCategory ----------
describe("getSettingsByCategory", () => {
  it("カテゴリ内のキー一覧を返す", async () => {
    mockChainResult = {
      data: [
        { key: "token", value: "encrypted:val" },
        { key: "secret", value: "encrypted:sec" },
      ],
      error: null,
    };

    const result = await getSettingsByCategory("line");
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("token");
    expect(result[1].key).toBe("secret");
  });

  it("valueがあればhasValue: true", async () => {
    mockChainResult = {
      data: [{ key: "token", value: "some-value" }],
      error: null,
    };

    const result = await getSettingsByCategory("line");
    expect(result[0].hasValue).toBe(true);
  });

  it("valueが空文字の場合hasValue: false", async () => {
    mockChainResult = {
      data: [{ key: "empty_key", value: "" }],
      error: null,
    };

    const result = await getSettingsByCategory("line");
    expect(result[0].hasValue).toBe(false);
  });

  it("DB例外時は空配列を返す", async () => {
    mockChainResult = { data: null, error: { message: "DB error" } };

    const result = await getSettingsByCategory("line");
    expect(result).toEqual([]);
  });
});
