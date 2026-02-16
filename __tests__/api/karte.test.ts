// __tests__/api/karte.test.ts
// カルテロック・カルテ編集 API のテスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- モック ---
const mockVerifyAdminAuth = vi.fn();

// Supabase チェーン用モック
const mockChain = {
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: null, error: null }),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  range: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
};
mockChain.insert.mockReturnValue(mockChain);
mockChain.update.mockReturnValue(mockChain);
mockChain.select.mockReturnValue(mockChain);

vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: (...args: any[]) => mockVerifyAdminAuth(...args),
}));
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: vi.fn(() => mockChain) },
}));
vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => null),
  withTenant: vi.fn((query: any) => query),
  tenantPayload: vi.fn((tid: any) => (tid ? { tenant_id: tid } : {})),
}));

// NextRequest互換のモック生成
function createMockRequest(method: string, url: string, body?: any) {
  const req = new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return req as any;
}

// ボディなしリクエスト（Content-Type付きだが body が不正な JSON）
function createBadBodyRequest(method: string, url: string) {
  const req = new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: "INVALID_JSON",
  });
  return req as any;
}

import { POST as karteLockPOST } from "@/app/api/admin/karte-lock/route";
import { POST as karteEditPOST } from "@/app/api/admin/karte-edit/route";

describe("カルテロック API (app/api/admin/karte-lock/route.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdminAuth.mockResolvedValue(true);
    // チェーンリセット
    mockChain.update.mockReturnValue(mockChain);
    mockChain.eq.mockReturnValue(mockChain);
    mockChain.select.mockReturnValue(mockChain);
    // デフォルトで update 成功
    mockChain.eq.mockReturnValue({ data: null, error: null });
  });

  it("ロック成功 → {ok:true, locked:true}", async () => {
    const req = createMockRequest("POST", "http://localhost/api/admin/karte-lock", {
      intakeId: "intake-001",
      action: "lock",
    });
    const res = await karteLockPOST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.locked).toBe(true);
  });

  it("ロック解除 → {ok:true, locked:false}", async () => {
    const req = createMockRequest("POST", "http://localhost/api/admin/karte-lock", {
      intakeId: "intake-001",
      action: "unlock",
    });
    const res = await karteLockPOST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.locked).toBe(false);
  });

  it("intakeId 未指定 → 400", async () => {
    const req = createMockRequest("POST", "http://localhost/api/admin/karte-lock", {
      action: "lock",
    });
    const res = await karteLockPOST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("intakeId");
  });

  it("認証NG → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const req = createMockRequest("POST", "http://localhost/api/admin/karte-lock", {
      intakeId: "intake-001",
    });
    const res = await karteLockPOST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Unauthorized");
  });
});

describe("カルテ編集 API (app/api/admin/karte-edit/route.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdminAuth.mockResolvedValue(true);
    // チェーンリセット
    mockChain.update.mockReturnValue(mockChain);
    mockChain.select.mockReturnValue(mockChain);
    mockChain.eq.mockReturnValue(mockChain);
    mockChain.single.mockResolvedValue({ data: null, error: null });
  });

  it("正常更新 → {ok:true}", async () => {
    // ロック確認: locked_at=null（ロックなし）
    mockChain.single.mockResolvedValue({
      data: { id: "intake-001", locked_at: null },
      error: null,
    });
    // eq は mockChain を返し続ける（single チェーンを維持）
    // withTenant(mockChain) → mockChain が await されるため、error プロパティで判定
    (mockChain as any).error = null;

    const req = createMockRequest("POST", "http://localhost/api/admin/karte-edit", {
      intakeId: "intake-001",
      note: "更新テストメモ",
    });
    const res = await karteEditPOST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("intakeId 未指定 → 400", async () => {
    const req = createMockRequest("POST", "http://localhost/api/admin/karte-edit", {
      note: "テスト",
    });
    const res = await karteEditPOST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("intakeId");
  });

  it("カルテ不存在 → 404", async () => {
    // single で null（レコードなし）
    mockChain.single.mockResolvedValue({ data: null, error: null });

    const req = createMockRequest("POST", "http://localhost/api/admin/karte-edit", {
      intakeId: "nonexistent",
      note: "テスト",
    });
    const res = await karteEditPOST(req);
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toContain("見つかりません");
  });

  it("ロック中 → 403", async () => {
    // ロック確認: locked_at あり（ロック中）
    mockChain.single.mockResolvedValue({
      data: { id: "intake-001", locked_at: "2026-02-17T00:00:00Z" },
      error: null,
    });

    const req = createMockRequest("POST", "http://localhost/api/admin/karte-edit", {
      intakeId: "intake-001",
      note: "ロック中のテスト",
    });
    const res = await karteEditPOST(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain("ロック");
  });

  it("ボディなし → 400", async () => {
    const req = createBadBodyRequest("POST", "http://localhost/api/admin/karte-edit");
    const res = await karteEditPOST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("リクエストボディ");
  });

  it("認証NG → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const req = createMockRequest("POST", "http://localhost/api/admin/karte-edit", {
      intakeId: "intake-001",
      note: "テスト",
    });
    const res = await karteEditPOST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Unauthorized");
  });
});
