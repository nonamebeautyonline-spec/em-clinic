// lib/__tests__/audit.test.ts
// 監査ログ（logAudit）のテスト
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// vi.hoisted() でモック関数を作成（ホイストされ、vi.mockより先に評価される）
const { mockInsert, mockJwtVerify, mockResolveTenantId } = vi.hoisted(() => {
  // JWT_SECRET はモジュールレベルで評価されるため、ここで設定
  process.env.JWT_SECRET = "test-jwt-secret";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

  return {
    mockInsert: vi.fn().mockResolvedValue({ error: null }),
    mockJwtVerify: vi.fn(),
    mockResolveTenantId: vi.fn(),
  };
});

// --- モック ---
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: () => ({
      insert: mockInsert,
    }),
  }),
}));

vi.mock("jose", () => ({
  jwtVerify: (...args: unknown[]) => mockJwtVerify(...args),
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: (...args: unknown[]) => mockResolveTenantId(...args),
}));

import { logAudit } from "@/lib/audit";

// --- ヘルパー ---
function createMockRequest(options: {
  cookies?: Record<string, string>;
  headers?: Record<string, string>;
} = {}): NextRequest {
  const url = "https://noname-beauty.l-ope.jp/api/admin/test";
  const headers = new Headers(options.headers || {});

  // NextRequestのcookies.get()が動作するようCookieヘッダーで渡す
  if (options.cookies) {
    const cookieStr = Object.entries(options.cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
    headers.set("cookie", cookieStr);
  }

  return new NextRequest(url, { headers });
}

// --- テスト ---
describe("logAudit — JWT解析", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockResolvedValue({ error: null });
    mockResolveTenantId.mockReturnValue("tenant_001");
  });

  it("有効JWT→adminUserId/adminNameを抽出してINSERT", async () => {
    mockJwtVerify.mockResolvedValueOnce({
      payload: { userId: "admin_001", name: "田中太郎" },
    });

    const req = createMockRequest({
      cookies: { admin_session: "valid.jwt.token" },
    });

    await logAudit(req, "update", "patient", "P001");

    expect(mockJwtVerify).toHaveBeenCalledTimes(1);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        admin_user_id: "admin_001",
        admin_name: "田中太郎",
      }),
    );
  });

  it("無効JWT→adminUserId=nullだがログは記録する", async () => {
    mockJwtVerify.mockRejectedValueOnce(new Error("JWTVerificationFailed"));

    const req = createMockRequest({
      cookies: { admin_session: "invalid.jwt.token" },
    });

    await logAudit(req, "delete", "order", "O001");

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        admin_user_id: null,
        admin_name: null,
      }),
    );
  });

  it("session Cookieなし→adminUserId=null", async () => {
    const req = createMockRequest();

    await logAudit(req, "create", "reservation", "RES001");

    expect(mockJwtVerify).not.toHaveBeenCalled();
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        admin_user_id: null,
        admin_name: null,
      }),
    );
  });
});

describe("logAudit — テナントID・IP解決", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockResolvedValue({ error: null });
    mockJwtVerify.mockResolvedValue({
      payload: { userId: "admin_001", name: "Dr" },
    });
  });

  it("resolveTenantIdが呼ばれる", async () => {
    mockResolveTenantId.mockReturnValue("tenant_xyz");

    const req = createMockRequest({
      cookies: { admin_session: "valid.jwt" },
    });

    await logAudit(req, "read", "patient", "P002");

    expect(mockResolveTenantId).toHaveBeenCalledWith(req);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant_id: "tenant_xyz",
      }),
    );
  });

  it("x-forwarded-for→最初のIPを取得", async () => {
    mockResolveTenantId.mockReturnValue(null);

    const req = createMockRequest({
      cookies: { admin_session: "valid.jwt" },
      headers: {
        "x-forwarded-for": "203.0.113.1, 10.0.0.1, 192.168.1.1",
      },
    });

    await logAudit(req, "login", "session", "S001");

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        ip_address: "203.0.113.1",
      }),
    );
  });

  it("x-real-ip→そのままIPを取得", async () => {
    mockResolveTenantId.mockReturnValue(null);

    const req = createMockRequest({
      cookies: { admin_session: "valid.jwt" },
      headers: {
        "x-real-ip": "198.51.100.42",
      },
    });

    await logAudit(req, "login", "session", "S002");

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        ip_address: "198.51.100.42",
      }),
    );
  });
});

describe("logAudit — INSERT検証", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockResolvedValue({ error: null });
    mockResolveTenantId.mockReturnValue("tenant_001");
    mockJwtVerify.mockResolvedValue({
      payload: { userId: "admin_001", name: "管理者" },
    });
  });

  it("全フィールドが正しくINSERTされる", async () => {
    const req = createMockRequest({
      cookies: { admin_session: "valid.jwt" },
      headers: {
        "x-forwarded-for": "203.0.113.50",
        "user-agent": "Mozilla/5.0 TestBrowser",
      },
    });

    await logAudit(req, "update", "patient", "P100");

    expect(mockInsert).toHaveBeenCalledWith({
      tenant_id: "tenant_001",
      admin_user_id: "admin_001",
      admin_name: "管理者",
      action: "update",
      resource_type: "patient",
      resource_id: "P100",
      details: null,
      ip_address: "203.0.113.50",
      user_agent: "Mozilla/5.0 TestBrowser",
    });
  });

  it("details付きINSERT", async () => {
    const req = createMockRequest({
      cookies: { admin_session: "valid.jwt" },
    });

    const details = { before: { name: "旧名前" }, after: { name: "新名前" } };
    await logAudit(req, "update", "patient", "P200", details);

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        details: { before: { name: "旧名前" }, after: { name: "新名前" } },
      }),
    );
  });
});

describe("logAudit — エラーハンドリング", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResolveTenantId.mockReturnValue(null);
  });

  it("INSERT失敗→console.errorが出るが例外は伝播しない", async () => {
    mockInsert.mockResolvedValueOnce({
      error: { message: "DB connection failed" },
    });
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const req = createMockRequest();

    // 例外が飛ばないことを確認
    await expect(logAudit(req, "create", "order", "O999")).resolves.toBeUndefined();

    consoleErrorSpy.mockRestore();
  });

  it("外側try-catch→予期しない例外も握りつぶす", async () => {
    // resolveTenantIdが例外をthrowするケース
    mockResolveTenantId.mockImplementationOnce(() => {
      throw new Error("Unexpected tenant error");
    });
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const req = createMockRequest({
      cookies: { admin_session: "valid.jwt" },
    });

    // 例外が伝播せずresolveすることを確認
    await expect(logAudit(req, "read", "patient", "P999")).resolves.toBeUndefined();

    // console.errorが呼ばれていることを確認
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[audit] Failed to log:",
      expect.any(Error),
    );

    consoleErrorSpy.mockRestore();
  });
});
