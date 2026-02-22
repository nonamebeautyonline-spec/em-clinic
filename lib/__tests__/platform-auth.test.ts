// lib/__tests__/platform-auth.test.ts — プラットフォーム管理者認証テスト
import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { NextRequest } from "next/server";

// JWT_SECRETをモジュールロード前に設定
vi.hoisted(() => {
  process.env.JWT_SECRET = "test-secret-key-for-testing";
});

// jose モック
vi.mock("jose", () => ({
  jwtVerify: vi.fn(),
}));

// session モック
vi.mock("@/lib/session", () => ({
  validateSession: vi.fn().mockResolvedValue(true),
}));

// Supabase モック（チェーンを正しく構築）
const { mockSingle, mockFrom } = vi.hoisted(() => {
  const mockSingle = vi.fn();
  const chainedEq = vi.fn().mockReturnValue({ single: mockSingle });
  const mockFrom = vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: chainedEq,
        })),
      })),
    })),
  }));
  return { mockSingle, mockFrom };
});

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: (...args: any[]) => mockFrom(...args) },
}));

import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { jwtVerify } from "jose";
import { validateSession } from "@/lib/session";

describe("platform-auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateSession).mockResolvedValue(true);
  });

  function createRequest(cookie?: string): NextRequest {
    const url = "https://example.com/api/test";
    if (cookie) {
      return new NextRequest(url, {
        headers: { cookie: `admin_session=${cookie}` },
      });
    }
    return new NextRequest(url);
  }

  it("Cookieなしの場合はnullを返す", async () => {
    const req = createRequest();
    const result = await verifyPlatformAdmin(req);
    expect(result).toBeNull();
  });

  it("JWT検証成功＆DB確認成功で認証情報を返す", async () => {
    const payload = {
      userId: "user-1",
      email: "admin@test.com",
      name: "Admin",
      tenantId: "t1",
      platformRole: "platform_admin",
    };
    vi.mocked(jwtVerify).mockResolvedValue({
      payload,
      protectedHeader: { alg: "HS256" },
    } as any);
    mockSingle.mockResolvedValue({ data: { id: "user-1", platform_role: "platform_admin" } });

    const req = createRequest("valid-jwt-token");
    const result = await verifyPlatformAdmin(req);
    expect(result).toEqual({
      userId: "user-1",
      email: "admin@test.com",
      name: "Admin",
      tenantId: "t1",
      platformRole: "platform_admin",
    });
  });

  it("platformRoleがplatform_adminでない場合はnull", async () => {
    vi.mocked(jwtVerify).mockResolvedValue({
      payload: { platformRole: "tenant_admin" },
      protectedHeader: { alg: "HS256" },
    } as any);

    const req = createRequest("valid-jwt-token");
    const result = await verifyPlatformAdmin(req);
    expect(result).toBeNull();
  });

  it("DBにユーザーが存在しない場合はnull", async () => {
    vi.mocked(jwtVerify).mockResolvedValue({
      payload: {
        userId: "user-1",
        email: "admin@test.com",
        name: "Admin",
        platformRole: "platform_admin",
      },
      protectedHeader: { alg: "HS256" },
    } as any);
    mockSingle.mockResolvedValue({ data: null });

    const req = createRequest("valid-jwt-token");
    const result = await verifyPlatformAdmin(req);
    expect(result).toBeNull();
  });

  it("JWT検証エラー時はnull", async () => {
    vi.mocked(jwtVerify).mockRejectedValue(new Error("Invalid token"));

    const req = createRequest("invalid-token");
    const result = await verifyPlatformAdmin(req);
    expect(result).toBeNull();
  });

  it("セッション無効時はnull", async () => {
    vi.mocked(jwtVerify).mockResolvedValue({
      payload: {
        userId: "user-1",
        email: "admin@test.com",
        name: "Admin",
        platformRole: "platform_admin",
      },
      protectedHeader: { alg: "HS256" },
    } as any);
    vi.mocked(validateSession).mockResolvedValue(false);

    const req = createRequest("expired-token");
    const result = await verifyPlatformAdmin(req);
    expect(result).toBeNull();
  });
});
