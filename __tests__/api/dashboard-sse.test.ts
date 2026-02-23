// __tests__/api/dashboard-sse.test.ts
// ダッシュボード SSE API（dashboard-sse/route.ts）のテスト
// JWT検証、ReadableStream生成、SSEヘッダー確認
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- モック定義 ---

let mockJwtVerifyResult: { payload: any } | null = null;
let mockJwtError = false;

vi.mock("jose", () => ({
  jwtVerify: vi.fn(async () => {
    if (mockJwtError) throw new Error("Invalid token");
    return mockJwtVerifyResult;
  }),
}));

// Supabase クライアント モック
let mockSupabaseResults: Record<string, any> = {};

function createMockQuery(table: string) {
  const chain: any = {};
  const methods = [
    "select", "eq", "neq", "in", "is", "not", "or",
    "ilike", "order", "limit", "single", "maybeSingle",
    "gte", "lte", "lt", "like", "range",
  ];
  methods.forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });

  chain.then = (resolve: any, reject: any) => {
    const result = mockSupabaseResults[table] || { data: null, error: null, count: 0 };
    return Promise.resolve(result).then(resolve, reject);
  };
  return chain;
}

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table: string) => createMockQuery(table)),
  })),
}));

// SSEユーティリティは実際のものを使う
// ただし、sleepを即座に完了させるためにタイマーを制御する

// 環境変数設定
vi.stubEnv("JWT_SECRET", "test-jwt-secret");
vi.stubEnv("ADMIN_TOKEN", "test-admin-token");
vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");

// --- テスト ---

import { GET } from "@/app/api/admin/dashboard-sse/route";
import { NextRequest } from "next/server";

function createReq(options?: {
  cookie?: string;
  bearer?: string;
  tenantHeader?: string;
}) {
  const url = new URL("http://localhost/api/admin/dashboard-sse");
  const headers: Record<string, string> = {};

  if (options?.bearer) {
    headers["authorization"] = `Bearer ${options.bearer}`;
  }
  if (options?.tenantHeader) {
    headers["x-tenant-id"] = options.tenantHeader;
  }

  const req = new NextRequest(url, { headers });

  // クッキーは NextRequest のコンストラクタで設定
  if (options?.cookie) {
    // NextRequest にクッキーを手動設定するため、headers に Cookie を追加
    return new NextRequest(url, {
      headers: {
        ...headers,
        Cookie: `admin_session=${options.cookie}`,
      },
    });
  }
  return req;
}

describe("ダッシュボード SSE API", () => {
  beforeEach(() => {
    mockJwtVerifyResult = null;
    mockJwtError = false;
    mockSupabaseResults = {};
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // =============================================
  // 認証テスト
  // =============================================
  describe("認証", () => {
    it("認証情報なしで 401 を返す", async () => {
      const res = await GET(createReq());
      expect(res.status).toBe(401);

      const body = await res.json();
      expect(body.error).toBe("Unauthorized");
    });

    it("Bearer トークンで認証成功", async () => {
      // Supabase のクエリ結果をモック
      mockSupabaseResults["reservations"] = { data: null, error: null, count: 5 };
      mockSupabaseResults["orders"] = { data: null, error: null, count: 3 };
      mockSupabaseResults["intake"] = { data: null, error: null, count: 2 };

      const res = await GET(createReq({ bearer: "test-admin-token" }));
      expect(res.status).toBe(200);
    });

    it("不正な Bearer トークンで 401 を返す", async () => {
      const res = await GET(createReq({ bearer: "wrong-token" }));
      expect(res.status).toBe(401);
    });

    it("有効な JWT クッキーで認証成功", async () => {
      mockJwtVerifyResult = { payload: { tenantId: "tenant-1" } };
      mockSupabaseResults["reservations"] = { data: null, error: null, count: 0 };
      mockSupabaseResults["orders"] = { data: null, error: null, count: 0 };
      mockSupabaseResults["intake"] = { data: null, error: null, count: 0 };

      const res = await GET(createReq({ cookie: "valid-jwt-token" }));
      expect(res.status).toBe(200);
    });

    it("無効な JWT クッキーで Bearer にフォールバック", async () => {
      mockJwtError = true;

      // JWT失敗後、Bearerでも認証失敗
      const res = await GET(createReq({ cookie: "invalid-jwt" }));
      expect(res.status).toBe(401);
    });
  });

  // =============================================
  // SSE レスポンス
  // =============================================
  describe("SSE レスポンス", () => {
    it("Content-Type が text/event-stream", async () => {
      mockSupabaseResults["reservations"] = { data: null, error: null, count: 10 };
      mockSupabaseResults["orders"] = { data: null, error: null, count: 5 };
      mockSupabaseResults["intake"] = { data: null, error: null, count: 3 };

      const res = await GET(createReq({ bearer: "test-admin-token" }));
      expect(res.headers.get("Content-Type")).toBe("text/event-stream");
    });

    it("Cache-Control が no-cache, no-transform", async () => {
      mockSupabaseResults["reservations"] = { data: null, error: null, count: 0 };
      mockSupabaseResults["orders"] = { data: null, error: null, count: 0 };
      mockSupabaseResults["intake"] = { data: null, error: null, count: 0 };

      const res = await GET(createReq({ bearer: "test-admin-token" }));
      expect(res.headers.get("Cache-Control")).toBe("no-cache, no-transform");
    });

    it("レスポンスボディが ReadableStream", async () => {
      mockSupabaseResults["reservations"] = { data: null, error: null, count: 0 };
      mockSupabaseResults["orders"] = { data: null, error: null, count: 0 };
      mockSupabaseResults["intake"] = { data: null, error: null, count: 0 };

      const res = await GET(createReq({ bearer: "test-admin-token" }));
      expect(res.body).toBeInstanceOf(ReadableStream);
    });

    it("初回接続時に ping イベントが送信される", async () => {
      mockSupabaseResults["reservations"] = { data: null, error: null, count: 2 };
      mockSupabaseResults["orders"] = { data: null, error: null, count: 1 };
      mockSupabaseResults["intake"] = { data: null, error: null, count: 0 };

      const res = await GET(createReq({ bearer: "test-admin-token" }));
      expect(res.status).toBe(200);

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();

      // 最初のチャンクを読み取り（初回スナップショット送信後にsleepでブロックされる）
      // fakeTimers で即座に進める
      const readPromise = reader.read();
      await vi.advanceTimersByTimeAsync(0);
      const { value, done } = await readPromise;

      expect(done).toBe(false);
      const text = decoder.decode(value);
      // ping イベントが含まれる
      expect(text).toContain("event: ping");
      expect(text).toContain("connected");

      // リーダーをキャンセル（クリーンアップ）
      await reader.cancel();
    });
  });

  // =============================================
  // テナント分離
  // =============================================
  describe("テナント分離", () => {
    it("Bearer トークンの場合 x-tenant-id ヘッダーからテナントIDを取得", async () => {
      mockSupabaseResults["reservations"] = { data: null, error: null, count: 0 };
      mockSupabaseResults["orders"] = { data: null, error: null, count: 0 };
      mockSupabaseResults["intake"] = { data: null, error: null, count: 0 };

      const res = await GET(createReq({
        bearer: "test-admin-token",
        tenantHeader: "tenant-abc",
      }));
      expect(res.status).toBe(200);
    });

    it("JWT クッキーから tenantId を抽出", async () => {
      mockJwtVerifyResult = { payload: { tenantId: "tenant-from-jwt" } };
      mockSupabaseResults["reservations"] = { data: null, error: null, count: 0 };
      mockSupabaseResults["orders"] = { data: null, error: null, count: 0 };
      mockSupabaseResults["intake"] = { data: null, error: null, count: 0 };

      const res = await GET(createReq({ cookie: "jwt-with-tenant" }));
      expect(res.status).toBe(200);
    });
  });

  // =============================================
  // 環境変数チェック
  // =============================================
  describe("環境変数", () => {
    it("JWT_SECRET がない場合は認証失敗", async () => {
      // JWT_SECRET と ADMIN_TOKEN を一時的に削除
      const origJwt = process.env.JWT_SECRET;
      const origAdmin = process.env.ADMIN_TOKEN;
      delete process.env.JWT_SECRET;
      delete process.env.ADMIN_TOKEN;

      const res = await GET(createReq({ bearer: "any-token" }));
      expect(res.status).toBe(401);

      // 復元
      process.env.JWT_SECRET = origJwt;
      process.env.ADMIN_TOKEN = origAdmin;
    });
  });
});

// afterEach で fakeTimers の import を確実に使えるようにする
import { afterEach } from "vitest";
