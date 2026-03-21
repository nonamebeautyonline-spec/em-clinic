// lib/__tests__/patient-session.test.ts
// 患者セッションJWT のテスト
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SignJWT } from "jose";

// テスト用シークレット
const TEST_SECRET = "test-patient-secret-for-vitest-12345";

// Supabase モック
vi.mock("@/lib/supabase", () => {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  ["select", "eq", "maybeSingle"].forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.maybeSingle = vi.fn().mockResolvedValue({ data: { patient_id: "PT-001" }, error: null });
  return {
    supabaseAdmin: {
      from: vi.fn(() => chain),
    },
    __chain: chain,
  };
});

// 環境変数設定
vi.stubEnv("PATIENT_SESSION_SECRET", TEST_SECRET);

import {
  createPatientToken,
  verifyPatientSession,
  verifyPatientSessionFromCookies,
  patientSessionCookieOptions,
} from "@/lib/patient-session";

function createMockRequest(cookies: Record<string, string>) {
  return {
    cookies: {
      get: vi.fn((name: string) => {
        const val = cookies[name];
        return val ? { value: val } : undefined;
      }),
    },
  } as unknown as import("next/server").NextRequest;
}

function createMockCookieStore(cookies: Record<string, string>) {
  return {
    get: (name: string) => {
      const val = cookies[name];
      return val ? { value: val } : undefined;
    },
  };
}

describe("patient-session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ========================================
  // createPatientToken
  // ========================================
  describe("createPatientToken", () => {
    it("JWTトークンを生成できる", async () => {
      const token = await createPatientToken("PT-001", "U123abc", "tenant-1");
      expect(token).toBeTruthy();
      expect(typeof token).toBe("string");
      // JWT形式（header.payload.signature）
      expect(token.split(".")).toHaveLength(3);
    });

    it("ペイロードに pid, lid, tid が含まれる", async () => {
      const token = await createPatientToken("PT-002", "Uxyz", "tenant-2");
      const secret = new TextEncoder().encode(TEST_SECRET);
      const { payload } = await import("jose").then((j) => j.jwtVerify(token, secret));
      expect(payload.pid).toBe("PT-002");
      expect(payload.lid).toBe("Uxyz");
      expect(payload.tid).toBe("tenant-2");
    });

    it("tenantId省略時はnull", async () => {
      const token = await createPatientToken("PT-003", "Uabc");
      const secret = new TextEncoder().encode(TEST_SECRET);
      const { payload } = await import("jose").then((j) => j.jwtVerify(token, secret));
      expect(payload.tid).toBeNull();
    });
  });

  // ========================================
  // verifyPatientSession (APIルート用)
  // ========================================
  describe("verifyPatientSession", () => {
    it("有効なJWT → patientId・lineUserId取得", async () => {
      const token = await createPatientToken("PT-100", "Uline100");
      const req = createMockRequest({ patient_session: token });
      const session = await verifyPatientSession(req);
      expect(session).toEqual({ patientId: "PT-100", lineUserId: "Uline100" });
    });

    it("改ざんされたJWT → null", async () => {
      const token = await createPatientToken("PT-100", "Uline100");
      const tampered = token.slice(0, -5) + "XXXXX";
      const req = createMockRequest({ patient_session: tampered });
      const session = await verifyPatientSession(req);
      // フォールバックも失敗（旧Cookieなし）
      expect(session).toBeNull();
    });

    it("期限切れJWT → フォールバック", async () => {
      // 手動で期限切れトークンを生成
      const secret = new TextEncoder().encode(TEST_SECRET);
      const expired = await new SignJWT({ pid: "PT-EXP", lid: "Uexp" })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime(new Date(Date.now() - 1000)) // 1秒前に期限切れ
        .sign(secret);

      const req = createMockRequest({ patient_session: expired });
      const session = await verifyPatientSession(req);
      // フォールバックも旧Cookieなし → null
      expect(session).toBeNull();
    });

    it("JWT Cookieなし + 旧Cookie + DB照合成功 → フォールバック成功", async () => {
      const req = createMockRequest({
        "__Host-patient_id": "PT-OLD",
        "__Host-line_user_id": "Uold",
      });
      const session = await verifyPatientSession(req);
      expect(session).toEqual({ patientId: "PT-OLD", lineUserId: "Uold" });
    });

    it("JWT Cookieなし + 旧Cookie + DB照合失敗 → null", async () => {
      // DB照合失敗をモック
      const { __chain } = await import("@/lib/supabase") as { __chain: Record<string, ReturnType<typeof vi.fn>> };
      __chain.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

      const req = createMockRequest({
        patient_id: "PT-FAKE",
        line_user_id: "Ufake",
      });
      const session = await verifyPatientSession(req);
      expect(session).toBeNull();
    });

    it("Cookieが全くない → null", async () => {
      const req = createMockRequest({});
      const session = await verifyPatientSession(req);
      expect(session).toBeNull();
    });
  });

  // ========================================
  // verifyPatientSessionFromCookies (サーバーコンポーネント用)
  // ========================================
  describe("verifyPatientSessionFromCookies", () => {
    it("有効なJWT → patientId・lineUserId取得", async () => {
      const token = await createPatientToken("PT-SC", "Usc");
      const store = createMockCookieStore({ patient_session: token });
      const session = await verifyPatientSessionFromCookies(store);
      expect(session).toEqual({ patientId: "PT-SC", lineUserId: "Usc" });
    });

    it("旧Cookieフォールバック → DB照合成功", async () => {
      const store = createMockCookieStore({
        patient_id: "PT-LEGACY",
        line_user_id: "Ulegacy",
      });
      const session = await verifyPatientSessionFromCookies(store);
      expect(session).toEqual({ patientId: "PT-LEGACY", lineUserId: "Ulegacy" });
    });
  });

  // ========================================
  // patientSessionCookieOptions
  // ========================================
  describe("patientSessionCookieOptions", () => {
    it("正しいCookie属性を返す", () => {
      const opts = patientSessionCookieOptions();
      expect(opts.httpOnly).toBe(true);
      expect(opts.secure).toBe(true);
      expect(opts.sameSite).toBe("none");
      expect(opts.path).toBe("/");
      expect(opts.maxAge).toBe(365 * 24 * 60 * 60);
    });
  });
});
