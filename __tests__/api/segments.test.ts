// __tests__/api/segments.test.ts
// 患者セグメント API エンドポイントのテスト
// API仕様:
//   パラメータなし → サマリー（件数のみ）
//   ?segment=xxx&page=1&limit=20 → 患者リスト（ページネーション付き）

import { describe, it, expect, vi, beforeEach } from "vitest";

// --- モック関数 ---
const mockVerifyAdminAuth = vi.fn();
const mockClassifyPatients = vi.fn();
const mockSaveSegments = vi.fn();

// --- Supabase チェーンモック ---
// from() 呼び出しごとに結果を制御するための設定オブジェクト
// テストケースごとに fromCallIndex をリセットし、呼び出し順で結果を返す
let fromCallResults: Array<{
  // select のオプション（head: true なら count クエリ）
  selectResult?: { data?: unknown; error?: unknown; count?: number | null };
  // チェーン末端（eq / range / in）の結果
  chainResult?: { data?: unknown; error?: unknown; count?: number | null };
}> = [];
let fromCallIndex = 0;

// 汎用チェーンモック生成 — 1回の from() 呼び出しに対応
function createChainMock(callIdx: number) {
  const config = fromCallResults[callIdx] || {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: Record<string, any> = {};

  // select は呼び出しオプションに応じて結果を振り分ける
  chain.select = vi.fn().mockImplementation((_cols?: string, opts?: { count?: string; head?: boolean }) => {
    if (opts?.head) {
      // count クエリ — eq チェーン後に結果を直接返す
      return createTerminalChain(config.selectResult || { count: 0, error: null });
    }
    // 通常 select — eq/order/range/in チェーンを経て結果を返す
    return createTerminalChain(config.chainResult || { data: [], error: null });
  });

  return chain;
}

// チェーン末端モック — どのメソッドを呼んでも自身を返し、最終的に結果オブジェクトとして使える
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createTerminalChain(result: Record<string, any>): Record<string, any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: Record<string, any> = { ...result };
  const methods = ["select", "eq", "in", "order", "range", "limit", "single", "maybeSingle"];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  return chain;
}

const mockFrom = vi.fn().mockImplementation(() => {
  const idx = fromCallIndex++;
  return createChainMock(idx);
});

vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: (...args: unknown[]) => mockVerifyAdminAuth(...args),
}));

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant-id"),
  resolveTenantIdOrThrow: vi.fn(() => "test-tenant-id"),
  withTenant: vi.fn((query: unknown) => query),
  strictWithTenant: vi.fn((query: unknown) => query),
  tenantPayload: vi.fn((tid: unknown) => (tid ? { tenant_id: tid } : { tenant_id: null })),
}));

vi.mock("@/lib/patient-segments", async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return {
    ...actual,
    classifyPatients: (...args: unknown[]) => mockClassifyPatients(...args),
    saveSegments: (...args: unknown[]) => mockSaveSegments(...args),
  };
});

// NextRequest互換のモック生成
function createMockRequest(method: string, url: string, body?: Record<string, unknown>) {
  const req = new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return req as unknown as Request;
}

// ── セグメントサマリー API（パラメータなし） ──────────────────────

describe("GET /api/admin/segments（サマリー）", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fromCallIndex = 0;
    fromCallResults = [];
    mockVerifyAdminAuth.mockResolvedValue(true);
  });

  it("認証失敗 → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);

    const { GET } = await import("@/app/api/admin/segments/route");
    const req = createMockRequest("GET", "http://localhost/api/admin/segments");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("データなし → 全セグメント0件", async () => {
    // from("patient_segments").select("segment", { count: "exact" }).eq(...)
    // → select に head がないので chainResult を使う
    fromCallResults = [
      { chainResult: { data: [], error: null } },
    ];

    const { GET } = await import("@/app/api/admin/segments/route");
    const req = createMockRequest("GET", "http://localhost/api/admin/segments");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.total).toBe(0);
    expect(json.summary.vip).toBe(0);
    expect(json.summary.active).toBe(0);
    expect(json.summary.churn_risk).toBe(0);
    expect(json.summary.dormant).toBe(0);
    expect(json.summary.new).toBe(0);
  });

  it("セグメントデータあり → 件数のみ返す（患者リストは含まない）", async () => {
    fromCallResults = [
      {
        chainResult: {
          data: [
            { segment: "vip" },
            { segment: "vip" },
            { segment: "active" },
            { segment: "new" },
          ],
          error: null,
        },
      },
    ];

    const { GET } = await import("@/app/api/admin/segments/route");
    const req = createMockRequest("GET", "http://localhost/api/admin/segments");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.total).toBe(4);
    expect(json.summary.vip).toBe(2);
    expect(json.summary.active).toBe(1);
    expect(json.summary.new).toBe(1);
    expect(json.summary.churn_risk).toBe(0);
    expect(json.summary.dormant).toBe(0);
    // 患者リストは返さない
    expect(json.segments).toBeUndefined();
  });

  it("DBエラー → 500", async () => {
    fromCallResults = [
      { chainResult: { data: null, error: { message: "DB error" } } },
    ];

    const { GET } = await import("@/app/api/admin/segments/route");
    const req = createMockRequest("GET", "http://localhost/api/admin/segments");
    const res = await GET(req);

    expect(res.status).toBe(500);
  });
});

// ── セグメント患者リスト API（ページネーション） ──────────────────────

describe("GET /api/admin/segments?segment=xxx（患者リスト）", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fromCallIndex = 0;
    fromCallResults = [];
    mockVerifyAdminAuth.mockResolvedValue(true);
  });

  it("無効なセグメント → 400", async () => {
    const { GET } = await import("@/app/api/admin/segments/route");
    const req = createMockRequest(
      "GET",
      "http://localhost/api/admin/segments?segment=invalid",
    );
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("患者リストをページネーション付きで返す", async () => {
    // 呼び出し順:
    // 1. from("patient_segments").select("*", { head: true }).eq().eq() → count
    // 2. from("patient_segments").select(...).eq().eq().order().range() → 患者セグメントデータ
    // 3. from("patients").select(...).eq().in() → 患者マスタ情報
    fromCallResults = [
      // 1回目: count クエリ
      { selectResult: { count: 1, error: null } },
      // 2回目: 患者セグメントリスト
      {
        chainResult: {
          data: [
            {
              patient_id: "P001",
              segment: "vip",
              rfm_score: { recency: 5, frequency: 5, monetary: 5 },
              calculated_at: "2026-02-22T00:00:00Z",
            },
          ],
          error: null,
        },
      },
      // 3回目: patients テーブルから氏名等
      {
        chainResult: {
          data: [
            {
              patient_id: "P001",
              name: "田中太郎",
              name_kana: "タナカタロウ",
              tel: "09012345678",
              line_id: "U123",
            },
          ],
          error: null,
        },
      },
    ];

    const { GET } = await import("@/app/api/admin/segments/route");
    const req = createMockRequest(
      "GET",
      "http://localhost/api/admin/segments?segment=vip&page=1&limit=20",
    );
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.segment).toBe("vip");
    expect(json.patients).toHaveLength(1);
    expect(json.patients[0].patientId).toBe("P001");
    expect(json.patients[0].name).toBe("田中太郎");
    expect(json.patients[0].tel).toBe("09012345678");
    expect(json.patients[0].rfmScore).toEqual({ recency: 5, frequency: 5, monetary: 5 });
    expect(json.pagination.page).toBe(1);
    expect(json.pagination.limit).toBe(20);
    expect(json.pagination.totalCount).toBe(1);
    expect(json.pagination.totalPages).toBe(1);
  });

  it("該当患者なし → 空配列", async () => {
    fromCallResults = [
      { selectResult: { count: 0, error: null } },
      { chainResult: { data: [], error: null } },
    ];

    const { GET } = await import("@/app/api/admin/segments/route");
    const req = createMockRequest(
      "GET",
      "http://localhost/api/admin/segments?segment=dormant&page=1&limit=20",
    );
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.segment).toBe("dormant");
    expect(json.patients).toHaveLength(0);
    expect(json.pagination.totalCount).toBe(0);
    expect(json.pagination.totalPages).toBe(0);
  });

  it("件数取得でエラー → 500", async () => {
    fromCallResults = [
      { selectResult: { count: null, error: { message: "DB error" } } },
    ];

    const { GET } = await import("@/app/api/admin/segments/route");
    const req = createMockRequest(
      "GET",
      "http://localhost/api/admin/segments?segment=vip&page=1&limit=20",
    );
    const res = await GET(req);

    expect(res.status).toBe(500);
  });
});

// ── セグメント再計算 API ──────────────────────────────────

describe("POST /api/admin/segments/recalculate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fromCallIndex = 0;
    fromCallResults = [];
    mockVerifyAdminAuth.mockResolvedValue(true);
  });

  it("認証失敗 → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);

    const { POST } = await import("@/app/api/admin/segments/recalculate/route");
    const req = createMockRequest("POST", "http://localhost/api/admin/segments/recalculate");
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("再計算成功 → 処理件数とセグメントカウントを返す", async () => {
    mockClassifyPatients.mockResolvedValue([
      { patientId: "P001", segment: "vip", rfmScore: { recency: 5, frequency: 5, monetary: 5 } },
      { patientId: "P002", segment: "active", rfmScore: { recency: 4, frequency: 3, monetary: 3 } },
      { patientId: "P003", segment: "new", rfmScore: { recency: 1, frequency: 1, monetary: 1 } },
    ]);
    mockSaveSegments.mockResolvedValue(undefined);

    const { POST } = await import("@/app/api/admin/segments/recalculate/route");
    const req = createMockRequest("POST", "http://localhost/api/admin/segments/recalculate");
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.processed).toBe(3);
    expect(json.segments.vip).toBe(1);
    expect(json.segments.active).toBe(1);
    expect(json.segments.new).toBe(1);
    expect(json.segments.churn_risk).toBe(0);
    expect(json.segments.dormant).toBe(0);
  });

  it("classifyPatients エラー → 500", async () => {
    mockClassifyPatients.mockRejectedValue(new Error("分類エラー"));

    const { POST } = await import("@/app/api/admin/segments/recalculate/route");
    const req = createMockRequest("POST", "http://localhost/api/admin/segments/recalculate");
    const res = await POST(req);

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.message).toBe("セグメント再計算に失敗しました");
  });
});

// ── Cron API ──────────────────────────────────────

describe("GET /api/cron/segment-recalculate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fromCallIndex = 0;
    fromCallResults = [];
    // CRON_SECRET を設定
    process.env.CRON_SECRET = "test-cron-secret";
    // tenants テーブル取得用モック
    fromCallResults = [
      { chainResult: { data: [], error: null } },
    ];
  });

  it("認証なし → 401", async () => {
    const { GET } = await import("@/app/api/cron/segment-recalculate/route");
    const req = createMockRequest("GET", "http://localhost/api/cron/segment-recalculate");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("不正なCRON_SECRET → 401", async () => {
    const { GET } = await import("@/app/api/cron/segment-recalculate/route");
    const req = new Request("http://localhost/api/cron/segment-recalculate", {
      headers: { authorization: "Bearer wrong-secret" },
    }) as unknown as Request;
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("正しいCRON_SECRET → 再計算を実行", async () => {
    mockClassifyPatients.mockResolvedValue([
      { patientId: "P001", segment: "vip", rfmScore: { recency: 5, frequency: 5, monetary: 5 } },
    ]);
    mockSaveSegments.mockResolvedValue(undefined);

    const { GET } = await import("@/app/api/cron/segment-recalculate/route");
    const req = new Request("http://localhost/api/cron/segment-recalculate", {
      headers: { authorization: "Bearer test-cron-secret" },
    }) as unknown as Request;
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.processed).toBe(1);
  });
});
