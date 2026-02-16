// lib/__tests__/settings.test.ts
// テナント設定 CRUD のテスト（supabase & crypto モック）
import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------- モック用チェーンビルダー ----------
let mockChainResult: any = {};

const mockQueryBuilder: any = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  is: vi.fn().mockReturnThis(),
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
