// __tests__/api/ai-query-segments.test.ts
// AIセグメントクエリ API のテスト
// - SQL安全性バリデーション（validateGeneratedSQL）
// - APIエンドポイントの認証・バリデーション

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── トップレベルのモック変数 ──────────────────────────────────

const mockVerifyAdminAuth = vi.fn();
const mockGetSettingOrEnv = vi.fn();
const mockRpc = vi.fn();

vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: (...args: any[]) => mockVerifyAdminAuth(...args),
}));

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn(),
    rpc: (...args: any[]) => mockRpc(...args),
  },
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => null),
  withTenant: vi.fn((q: any) => q),
}));

vi.mock("@/lib/settings", () => ({
  getSettingOrEnv: (...args: any[]) => mockGetSettingOrEnv(...args),
}));

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn(),
}));

// ── validateGeneratedSQL の単体テスト ──────────────────────────

describe("validateGeneratedSQL", () => {
  let validateGeneratedSQL: typeof import("@/app/api/admin/line/segments/ai-query/route").validateGeneratedSQL;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/app/api/admin/line/segments/ai-query/route");
    validateGeneratedSQL = mod.validateGeneratedSQL;
  });

  // ── 正常系 ──

  it("正常なSELECT文 → valid: true", () => {
    const sql = "SELECT p.patient_id, p.name FROM patients p";
    expect(validateGeneratedSQL(sql)).toEqual({ valid: true });
  });

  it("JOIN付きSELECT → valid: true", () => {
    const sql = `SELECT p.patient_id, p.name
FROM patients p
INNER JOIN orders o ON o.patient_id = p.patient_id
WHERE o.payment_status = 'paid'
GROUP BY p.patient_id, p.name
HAVING SUM(o.total_amount) >= 50000`;
    expect(validateGeneratedSQL(sql)).toEqual({ valid: true });
  });

  it("複数テーブルJOIN → valid: true", () => {
    const sql = `SELECT DISTINCT p.patient_id, p.name
FROM patients p
INNER JOIN reservations r ON r.patient_id = p.patient_id
LEFT JOIN reorders ro ON ro.patient_id = p.patient_id
WHERE r.reserved_date >= CURRENT_DATE - INTERVAL '3 months'`;
    expect(validateGeneratedSQL(sql)).toEqual({ valid: true });
  });

  it("末尾セミコロン付き → valid: true", () => {
    const sql = "SELECT p.patient_id, p.name FROM patients p;";
    expect(validateGeneratedSQL(sql)).toEqual({ valid: true });
  });

  // ── 異常系: 禁止キーワード ──

  it("DELETE文 → valid: false", () => {
    const sql = "DELETE FROM patients WHERE patient_id = 'P001'";
    const result = validateGeneratedSQL(sql);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("SELECT文のみ");
  });

  it("UPDATE文 → valid: false", () => {
    const sql = "UPDATE patients SET name = 'hack' WHERE 1=1";
    const result = validateGeneratedSQL(sql);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("SELECT文のみ");
  });

  it("INSERT文 → valid: false", () => {
    const sql = "INSERT INTO patients (patient_id) VALUES ('hack')";
    const result = validateGeneratedSQL(sql);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("SELECT文のみ");
  });

  it("DROP TABLE（SELECT内に埋め込み） → valid: false", () => {
    // SELECT文で始まるが、DROPを含む場合
    const sql = "SELECT 1 FROM patients WHERE name = 'x' OR 1=1; DROP TABLE patients";
    const result = validateGeneratedSQL(sql);
    expect(result.valid).toBe(false);
  });

  it("TRUNCATE → valid: false（SELECT外） ", () => {
    const sql = "TRUNCATE patients";
    const result = validateGeneratedSQL(sql);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("SELECT文のみ");
  });

  it("セミコロンで複数文を分離 → valid: false", () => {
    const sql = "SELECT p.patient_id FROM patients p; SELECT 1";
    const result = validateGeneratedSQL(sql);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("複数のSQL文");
  });

  it("SQLコメント（--）→ valid: false", () => {
    const sql = "SELECT p.patient_id FROM patients p WHERE 1=1 --";
    const result = validateGeneratedSQL(sql);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("--");
  });

  it("pg_sleep関数 → valid: false", () => {
    const sql = "SELECT pg_sleep(10) FROM patients";
    const result = validateGeneratedSQL(sql);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("pg_sleep");
  });

  // ── 異常系: テーブル制限 ──

  it("許可されていないテーブル → valid: false", () => {
    const sql = "SELECT * FROM admin_users";
    const result = validateGeneratedSQL(sql);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("admin_users");
    expect(result.reason).toContain("参照できません");
  });

  it("JOINで許可されていないテーブル → valid: false", () => {
    const sql = "SELECT p.patient_id FROM patients p INNER JOIN audit_logs a ON a.patient_id = p.patient_id";
    const result = validateGeneratedSQL(sql);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("audit_logs");
  });

  it("tenant_settingsテーブル → valid: false", () => {
    const sql = "SELECT * FROM tenant_settings";
    const result = validateGeneratedSQL(sql);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("tenant_settings");
  });
});

// ── POST /api/admin/line/segments/ai-query ──────────────────

describe("POST /api/admin/line/segments/ai-query", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createMockRequest(body: any) {
    return new Request("http://localhost/api/admin/line/segments/ai-query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }) as any;
  }

  it("認証失敗 → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);

    const { POST } = await import("@/app/api/admin/line/segments/ai-query/route");
    const req = createMockRequest({ query: "テスト", execute: false });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("queryが空 → 400", async () => {
    mockVerifyAdminAuth.mockResolvedValue(true);

    const { POST } = await import("@/app/api/admin/line/segments/ai-query/route");
    const req = createMockRequest({ query: "", execute: false });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("APIキー未設定 → 500", async () => {
    mockVerifyAdminAuth.mockResolvedValue(true);
    mockGetSettingOrEnv.mockResolvedValue(null);

    const { POST } = await import("@/app/api/admin/line/segments/ai-query/route");
    const req = createMockRequest({ query: "VIP患者を検索", execute: false });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toContain("ANTHROPIC_API_KEY");
  });

  it("execute=true + 安全なSQL → RPC呼び出し", async () => {
    mockVerifyAdminAuth.mockResolvedValue(true);
    mockRpc.mockResolvedValue({
      data: [
        { patient_id: "P001", name: "田中太郎" },
        { patient_id: "P002", name: "山田花子" },
      ],
      error: null,
    });

    const { POST } = await import("@/app/api/admin/line/segments/ai-query/route");
    const sql = "SELECT p.patient_id, p.name FROM patients p";
    const req = createMockRequest({ query: "全患者", execute: true, sql });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.patients).toHaveLength(2);
    expect(json.count).toBe(2);
    expect(json.patients[0].patient_id).toBe("P001");
  });

  it("execute=true + 危険なSQL → 400拒否", async () => {
    mockVerifyAdminAuth.mockResolvedValue(true);

    const { POST } = await import("@/app/api/admin/line/segments/ai-query/route");
    const sql = "DELETE FROM patients WHERE 1=1";
    const req = createMockRequest({ query: "全削除", execute: true, sql });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
  });

  it("execute=true + 禁止テーブル → 400拒否", async () => {
    mockVerifyAdminAuth.mockResolvedValue(true);

    const { POST } = await import("@/app/api/admin/line/segments/ai-query/route");
    const sql = "SELECT * FROM admin_sessions";
    const req = createMockRequest({ query: "セッション一覧", execute: true, sql });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error).toContain("admin_sessions");
  });

  it("RPC不在 → 501 セットアップ必要", async () => {
    mockVerifyAdminAuth.mockResolvedValue(true);
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: "function exec_readonly_query does not exist" },
    });

    const { POST } = await import("@/app/api/admin/line/segments/ai-query/route");
    const sql = "SELECT p.patient_id, p.name FROM patients p";
    const req = createMockRequest({ query: "全患者", execute: true, sql });
    const res = await POST(req);

    expect(res.status).toBe(501);
    const json = await res.json();
    expect(json.setup_required).toBe(true);
  });
});
