// __tests__/api/segments.test.ts
// 患者セグメント API エンドポイントのテスト

import { describe, it, expect, vi, beforeEach } from "vitest";

// --- モック ---
const mockVerifyAdminAuth = vi.fn();
const mockClassifyPatients = vi.fn();
const mockSaveSegments = vi.fn();

// Supabase チェーン用モック
const mockSelectResult = { data: null as any, error: null as any };

const mockChain = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  upsert: vi.fn(() => ({ error: null })),
};

vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: (...args: any[]) => mockVerifyAdminAuth(...args),
}));

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn(() => mockChain),
  },
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => null),
  withTenant: vi.fn((query: any) => query),
  tenantPayload: vi.fn((tid: any) => (tid ? { tenant_id: tid } : { tenant_id: null })),
}));

vi.mock("@/lib/patient-segments", async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    classifyPatients: (...args: any[]) => mockClassifyPatients(...args),
    saveSegments: (...args: any[]) => mockSaveSegments(...args),
  };
});

// NextRequest互換のモック生成
function createMockRequest(method: string, url: string, body?: any) {
  const req = new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return req as any;
}

// ── セグメント一覧 API ──────────────────────────────────

describe("GET /api/admin/segments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdminAuth.mockResolvedValue(true);
    // チェーンリセット
    mockChain.select.mockReturnThis();
    mockChain.eq.mockReturnThis();
    mockChain.in.mockReturnThis();
    mockChain.order.mockReturnThis();
  });

  it("認証失敗 → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);

    const { GET } = await import("@/app/api/admin/segments/route");
    const req = createMockRequest("GET", "http://localhost/api/admin/segments");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("データが空の場合 → 空のセグメント一覧", async () => {
    // select → 空配列
    mockChain.select.mockReturnValue({ data: [], error: null });

    const { GET } = await import("@/app/api/admin/segments/route");
    const req = createMockRequest("GET", "http://localhost/api/admin/segments");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.total).toBe(0);
    expect(json.summary.vip).toBe(0);
    expect(json.summary.active).toBe(0);
    expect(json.segments.vip).toEqual([]);
  });

  it("セグメントデータがある場合 → 患者情報付きで返す", async () => {
    // 1回目: patient_segments の select
    const segmentData = [
      {
        patient_id: "P001",
        segment: "vip",
        rfm_score: { recency: 5, frequency: 5, monetary: 5 },
        calculated_at: "2026-02-22T00:00:00Z",
      },
      {
        patient_id: "P002",
        segment: "new",
        rfm_score: { recency: 1, frequency: 1, monetary: 1 },
        calculated_at: "2026-02-22T00:00:00Z",
      },
    ];

    const patientData = [
      {
        patient_id: "P001",
        name: "田中太郎",
        name_kana: "タナカタロウ",
        tel: "09012345678",
        line_id: "U123",
        created_at: "2026-01-01",
      },
      {
        patient_id: "P002",
        name: "山田花子",
        name_kana: "ヤマダハナコ",
        tel: "08087654321",
        line_id: "U456",
        created_at: "2026-02-01",
      },
    ];

    let callCount = 0;
    mockChain.select.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // patient_segments の select
        return { data: segmentData, error: null };
      }
      // patients の select（in チェーンの後）
      return mockChain;
    });

    mockChain.in.mockReturnValue({ data: patientData, error: null });

    const { GET } = await import("@/app/api/admin/segments/route");
    const req = createMockRequest("GET", "http://localhost/api/admin/segments");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.total).toBe(2);
    expect(json.summary.vip).toBe(1);
    expect(json.summary.new).toBe(1);
    expect(json.segments.vip).toHaveLength(1);
    expect(json.segments.vip[0].patientId).toBe("P001");
    expect(json.segments.vip[0].name).toBe("田中太郎");
    expect(json.segments.new).toHaveLength(1);
    expect(json.segments.new[0].patientId).toBe("P002");
  });

  it("DBエラー → 500", async () => {
    mockChain.select.mockReturnValue({
      data: null,
      error: { message: "DB error" },
    });

    const { GET } = await import("@/app/api/admin/segments/route");
    const req = createMockRequest("GET", "http://localhost/api/admin/segments");
    const res = await GET(req);

    expect(res.status).toBe(500);
  });
});

// ── セグメント再計算 API ──────────────────────────────────

describe("POST /api/admin/segments/recalculate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    expect(json.error).toBe("セグメント再計算に失敗しました");
  });
});

// ── Cron API ──────────────────────────────────────

describe("GET /api/cron/segment-recalculate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // CRON_SECRET を設定
    process.env.CRON_SECRET = "test-cron-secret";
    // tenants テーブルのモック
    mockChain.select.mockReturnThis();
    mockChain.eq.mockReturnValue({ data: [], error: null });
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
    }) as any;
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
    }) as any;
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.processed).toBe(1);
  });
});
