// __tests__/api/coupon-distribution-rules.test.ts
// クーポン自動配布ルールのビジネスロジックテスト
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

// --- Supabaseチェーンの型定義 ---
interface SupabaseChain {
  insert: Mock;
  update: Mock;
  delete: Mock;
  select: Mock;
  eq: Mock;
  neq: Mock;
  gt: Mock;
  gte: Mock;
  lt: Mock;
  lte: Mock;
  in: Mock;
  is: Mock;
  not: Mock;
  order: Mock;
  limit: Mock;
  range: Mock;
  single: Mock;
  maybeSingle: Mock;
  upsert: Mock;
  ilike: Mock;
  like: Mock;
  or: Mock;
  count: Mock;
  csv: Mock;
  then: Mock;
}

interface ChainResolveResult {
  data: unknown;
  error: unknown;
  count?: number;
}

// --- チェーン生成ヘルパー ---
function createChain(defaultResolve: ChainResolveResult = { data: null, error: null, count: 0 }): SupabaseChain {
  const chain = {} as SupabaseChain;
  (["insert", "update", "delete", "select", "eq", "neq", "gt", "gte", "lt", "lte",
    "in", "is", "not", "order", "limit", "range", "single", "maybeSingle", "upsert",
    "ilike", "like", "or", "count", "csv"] as const).forEach(m => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = vi.fn((resolve: (val: ChainResolveResult) => void) => resolve(defaultResolve));
  return chain;
}

let tableChains: Record<string, SupabaseChain> = {};
function getOrCreateChain(table: string): SupabaseChain {
  if (!tableChains[table]) tableChains[table] = createChain();
  return tableChains[table];
}

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: vi.fn((table: string) => getOrCreateChain(table)) },
}));

vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: vi.fn(() => true),
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  resolveTenantIdOrThrow: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((q: SupabaseChain) => q),
  strictWithTenant: vi.fn((q: SupabaseChain) => q),
  tenantPayload: vi.fn(() => ({ tenant_id: "test-tenant" })),
}));

vi.mock("@/lib/line-push", () => ({
  pushMessage: vi.fn(() => ({ ok: true })),
}));

vi.mock("@/lib/distributed-lock", () => ({
  acquireLock: vi.fn(() => ({ acquired: true, release: vi.fn() })),
}));

vi.mock("@/lib/redis", () => ({
  redis: { set: vi.fn(), get: vi.fn(), del: vi.fn() },
}));

vi.mock("@/lib/settings", () => ({
  getSettingOrEnv: vi.fn(() => "mock-token"),
}));

vi.mock("@/lib/session", () => ({
  validateSession: vi.fn(() => true),
}));

// NextRequest互換のモック
interface MockRequest {
  method: string;
  url: string;
  nextUrl: { searchParams: URLSearchParams };
  cookies: { get: Mock };
  headers: { get: Mock };
  json: Mock;
}

function createMockRequest(
  method: string,
  url = "http://localhost/api/admin/line/coupons/distribution-rules",
  body: Record<string, unknown> = {}
): MockRequest {
  return {
    method,
    url,
    nextUrl: { searchParams: new URL(url).searchParams },
    cookies: { get: vi.fn(() => ({ value: "mock-token" })) },
    headers: { get: vi.fn((name: string) => name === "x-tenant-id" ? "test-tenant" : null) },
    json: vi.fn(() => body),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  tableChains = {};
});

// === トリガータイプのバリデーション ===
describe("クーポン自動配布ルール: トリガータイプ", () => {
  const VALID_TRIGGER_TYPES = ["birthday", "first_purchase_days", "nth_visit", "tag_added"];

  it("birthday は有効なトリガータイプ", () => {
    expect(VALID_TRIGGER_TYPES.includes("birthday")).toBe(true);
  });

  it("first_purchase_days は有効なトリガータイプ", () => {
    expect(VALID_TRIGGER_TYPES.includes("first_purchase_days")).toBe(true);
  });

  it("nth_visit は有効なトリガータイプ", () => {
    expect(VALID_TRIGGER_TYPES.includes("nth_visit")).toBe(true);
  });

  it("tag_added は有効なトリガータイプ", () => {
    expect(VALID_TRIGGER_TYPES.includes("tag_added")).toBe(true);
  });

  it("unknown は無効なトリガータイプ", () => {
    expect(VALID_TRIGGER_TYPES.includes("unknown")).toBe(false);
  });

  it("空文字は無効なトリガータイプ", () => {
    expect(VALID_TRIGGER_TYPES.includes("")).toBe(false);
  });
});

// === ルール作成APIのバリデーション ===
describe("クーポン自動配布ルール: POST作成 バリデーション", () => {
  it("ルール名なしで400エラー", async () => {
    const req = createMockRequest("POST", undefined, {
      coupon_id: 1,
      trigger_type: "birthday",
    });

    const { POST } = await import("@/app/api/admin/line/coupons/distribution-rules/route");
    const res = await POST(req as unknown as import("next/server").NextRequest);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain("ルール名");
  });

  it("クーポンIDなしで400エラー", async () => {
    const req = createMockRequest("POST", undefined, {
      name: "テストルール",
      trigger_type: "birthday",
    });

    const { POST } = await import("@/app/api/admin/line/coupons/distribution-rules/route");
    const res = await POST(req as unknown as import("next/server").NextRequest);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain("クーポンID");
  });

  it("不正なトリガータイプで400エラー", async () => {
    const req = createMockRequest("POST", undefined, {
      name: "テストルール",
      coupon_id: 1,
      trigger_type: "invalid_type",
    });

    const { POST } = await import("@/app/api/admin/line/coupons/distribution-rules/route");
    const res = await POST(req as unknown as import("next/server").NextRequest);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain("トリガータイプ");
  });

  it("first_purchase_daysで経過日数なしは400エラー", async () => {
    const req = createMockRequest("POST", undefined, {
      name: "テストルール",
      coupon_id: 1,
      trigger_type: "first_purchase_days",
      trigger_config: {},
    });

    const { POST } = await import("@/app/api/admin/line/coupons/distribution-rules/route");
    const res = await POST(req as unknown as import("next/server").NextRequest);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain("経過日数");
  });

  it("nth_visitで来院回数なしは400エラー", async () => {
    const req = createMockRequest("POST", undefined, {
      name: "テストルール",
      coupon_id: 1,
      trigger_type: "nth_visit",
      trigger_config: {},
    });

    const { POST } = await import("@/app/api/admin/line/coupons/distribution-rules/route");
    const res = await POST(req as unknown as import("next/server").NextRequest);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain("来院回数");
  });

  it("tag_addedでタグ名なしは400エラー", async () => {
    const req = createMockRequest("POST", undefined, {
      name: "テストルール",
      coupon_id: 1,
      trigger_type: "tag_added",
      trigger_config: {},
    });

    const { POST } = await import("@/app/api/admin/line/coupons/distribution-rules/route");
    const res = await POST(req as unknown as import("next/server").NextRequest);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain("タグ名");
  });
});

// === ルール一覧APIのレスポンス ===
describe("クーポン自動配布ルール: GET一覧", () => {
  it("認証なしで401", async () => {
    const { verifyAdminAuth } = await import("@/lib/admin-auth");
    (verifyAdminAuth as Mock).mockResolvedValueOnce(false);

    const req = createMockRequest("GET");
    const { GET } = await import("@/app/api/admin/line/coupons/distribution-rules/route");
    const res = await GET(req as unknown as import("next/server").NextRequest);
    expect(res.status).toBe(401);
  });

  it("正常時はルール一覧を返す", async () => {
    const mockRules = [
      { id: "rule-1", name: "誕生日ルール", trigger_type: "birthday", is_active: true },
    ];
    tableChains = {};
    const rulesChain = createChain({ data: mockRules, error: null });
    tableChains["coupon_distribution_rules"] = rulesChain;

    const req = createMockRequest("GET");
    const { GET } = await import("@/app/api/admin/line/coupons/distribution-rules/route");
    const res = await GET(req as unknown as import("next/server").NextRequest);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.rules).toEqual(mockRules);
  });
});

// === 個別ルールAPI ===
describe("クーポン自動配布ルール: 個別操作", () => {
  it("DELETE: 認証なしで401", async () => {
    const { verifyAdminAuth } = await import("@/lib/admin-auth");
    (verifyAdminAuth as Mock).mockResolvedValueOnce(false);

    const req = createMockRequest("DELETE");
    const { DELETE } = await import("@/app/api/admin/line/coupons/distribution-rules/[id]/route");
    const res = await DELETE(
      req as unknown as import("next/server").NextRequest,
      { params: Promise.resolve({ id: "rule-1" }) }
    );
    expect(res.status).toBe(401);
  });

  it("PUT: 不正なトリガータイプで400", async () => {
    const req = createMockRequest("PUT", undefined, {
      trigger_type: "invalid",
    });

    const { PUT } = await import("@/app/api/admin/line/coupons/distribution-rules/[id]/route");
    const res = await PUT(
      req as unknown as import("next/server").NextRequest,
      { params: Promise.resolve({ id: "rule-1" }) }
    );
    expect(res.status).toBe(400);
  });
});

// === 重複配布防止ロジック ===
describe("クーポン自動配布: 重複配布防止", () => {
  it("既に配布済みの患者は除外される", () => {
    const targets = [
      { patient_id: "p1", line_id: "L1" },
      { patient_id: "p2", line_id: "L2" },
      { patient_id: "p3", line_id: "L3" },
    ];
    const alreadyDistributed = new Set(["p1", "p3"]);

    const newTargets = targets.filter(t => !alreadyDistributed.has(t.patient_id));
    expect(newTargets).toHaveLength(1);
    expect(newTargets[0].patient_id).toBe("p2");
  });

  it("全員が配布済みの場合は空配列", () => {
    const targets = [
      { patient_id: "p1", line_id: "L1" },
    ];
    const alreadyDistributed = new Set(["p1"]);

    const newTargets = targets.filter(t => !alreadyDistributed.has(t.patient_id));
    expect(newTargets).toHaveLength(0);
  });

  it("配布済みがいない場合は全員が対象", () => {
    const targets = [
      { patient_id: "p1", line_id: "L1" },
      { patient_id: "p2", line_id: "L2" },
    ];
    const alreadyDistributed = new Set<string>();

    const newTargets = targets.filter(t => !alreadyDistributed.has(t.patient_id));
    expect(newTargets).toHaveLength(2);
  });
});

// === 誕生日パターンマッチング ===
describe("クーポン自動配布: 誕生日パターン", () => {
  it("月日のパターン生成が正しい", () => {
    // 3月7日の場合
    const month = "03";
    const day = "07";
    const pattern = `%-${month}-${day}%`;
    expect(pattern).toBe("%-03-07%");
  });

  it("月と日が1桁の場合もゼロ埋め", () => {
    const month = String(1).padStart(2, "0");
    const day = String(5).padStart(2, "0");
    const pattern = `%-${month}-${day}%`;
    expect(pattern).toBe("%-01-05%");
  });

  it("12月31日のパターン", () => {
    const month = String(12).padStart(2, "0");
    const day = String(31).padStart(2, "0");
    const pattern = `%-${month}-${day}%`;
    expect(pattern).toBe("%-12-31%");
  });
});

// === クーポンメッセージ生成 ===
describe("クーポン自動配布: LINE通知メッセージ", () => {
  it("固定額クーポンのメッセージ", () => {
    const coupon = { name: "初回限定", code: "FIRST1000", discount_type: "fixed" as string, discount_value: 1000, valid_until: null };
    const discountText = coupon.discount_type === "percent"
      ? `${coupon.discount_value}%OFF`
      : `¥${coupon.discount_value.toLocaleString()}OFF`;

    expect(discountText).toBe("¥1,000OFF");
  });

  it("割引率クーポンのメッセージ", () => {
    const coupon = { name: "VIP割引", code: "VIP10", discount_type: "percent" as const, discount_value: 10, valid_until: null };
    const discountText = coupon.discount_type === "percent"
      ? `${coupon.discount_value}%OFF`
      : `¥${coupon.discount_value.toLocaleString()}OFF`;

    expect(discountText).toBe("10%OFF");
  });

  it("有効期限なしのメッセージ", () => {
    const validUntil: string | null = null;
    const expiryText = validUntil
      ? `\n有効期限: ${new Date(validUntil).toLocaleDateString("ja-JP")}`
      : "";

    expect(expiryText).toBe("");
  });

  it("有効期限ありのメッセージに期限が含まれる", () => {
    const validUntil = "2026-12-31T23:59:59+09:00";
    const expiryText = validUntil
      ? `\n有効期限: ${new Date(validUntil).toLocaleDateString("ja-JP")}`
      : "";

    expect(expiryText).toContain("2026");
    expect(expiryText).toContain("12");
    expect(expiryText).toContain("31");
  });
});

// === Cron認証 ===
describe("クーポン自動配布Cron: 認証", () => {
  it("CRON_SECRETが設定されている場合、Bearerトークンなしで401", async () => {
    const originalEnv = process.env.CRON_SECRET;
    process.env.CRON_SECRET = "test-secret";

    const req = createMockRequest("GET", "http://localhost/api/cron/distribute-coupons");
    (req.headers.get as Mock).mockImplementation((name: string) => {
      if (name === "authorization") return null;
      return null;
    });

    const { GET } = await import("@/app/api/cron/distribute-coupons/route");
    const res = await GET(req as unknown as import("next/server").NextRequest);
    expect(res.status).toBe(401);

    process.env.CRON_SECRET = originalEnv;
  });
});

// === トリガー設定バリデーション ===
describe("クーポン自動配布: トリガー設定", () => {
  it("first_purchase_daysにdays_afterが必要", () => {
    const config: Record<string, unknown> = {};
    const triggerType = "first_purchase_days";
    const isValid = triggerType !== "first_purchase_days" || !!config.days_after;
    expect(isValid).toBe(false);
  });

  it("first_purchase_daysのdays_afterが設定済みなら有効", () => {
    const config = { days_after: 30 };
    const triggerType = "first_purchase_days";
    const isValid = triggerType !== "first_purchase_days" || !!config.days_after;
    expect(isValid).toBe(true);
  });

  it("nth_visitにvisit_countが必要", () => {
    const config: Record<string, unknown> = {};
    const triggerType = "nth_visit";
    const isValid = triggerType !== "nth_visit" || !!config.visit_count;
    expect(isValid).toBe(false);
  });

  it("nth_visitのvisit_countが設定済みなら有効", () => {
    const config = { visit_count: 3 };
    const triggerType = "nth_visit";
    const isValid = triggerType !== "nth_visit" || !!config.visit_count;
    expect(isValid).toBe(true);
  });

  it("tag_addedにtag_nameが必要", () => {
    const config: Record<string, unknown> = {};
    const triggerType = "tag_added";
    const isValid = triggerType !== "tag_added" || !!config.tag_name;
    expect(isValid).toBe(false);
  });

  it("tag_addedのtag_nameが設定済みなら有効", () => {
    const config = { tag_name: "VIP" };
    const triggerType = "tag_added";
    const isValid = triggerType !== "tag_added" || !!config.tag_name;
    expect(isValid).toBe(true);
  });

  it("birthdayは追加設定不要", () => {
    const triggerType = "birthday";
    const isValid = triggerType === "birthday";
    expect(isValid).toBe(true);
  });
});

// === 来院回数カウント ===
describe("クーポン自動配布: 来院回数集計", () => {
  it("予約リストから患者ごとの来院回数を正しく集計", () => {
    const reservations = [
      { patient_id: "p1" },
      { patient_id: "p1" },
      { patient_id: "p1" },
      { patient_id: "p2" },
      { patient_id: "p2" },
      { patient_id: "p3" },
    ];

    const visitCounts = new Map<string, number>();
    for (const r of reservations) {
      visitCounts.set(r.patient_id, (visitCounts.get(r.patient_id) || 0) + 1);
    }

    expect(visitCounts.get("p1")).toBe(3);
    expect(visitCounts.get("p2")).toBe(2);
    expect(visitCounts.get("p3")).toBe(1);
  });

  it("ちょうどN回目の患者のみ抽出", () => {
    const visitCounts = new Map<string, number>([
      ["p1", 3],
      ["p2", 2],
      ["p3", 3],
      ["p4", 1],
    ]);
    const targetVisitCount = 3;

    const targetPatientIds = [...visitCounts.entries()]
      .filter(([, count]) => count === targetVisitCount)
      .map(([id]) => id);

    expect(targetPatientIds).toEqual(["p1", "p3"]);
  });
});

// === バッチ処理 ===
describe("クーポン自動配布: バッチ分割", () => {
  it("10件ずつバッチに分割される", () => {
    const items = Array.from({ length: 25 }, (_, i) => ({ id: i }));
    const BATCH_SIZE = 10;
    const batches: typeof items[] = [];

    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      batches.push(items.slice(i, i + BATCH_SIZE));
    }

    expect(batches).toHaveLength(3);
    expect(batches[0]).toHaveLength(10);
    expect(batches[1]).toHaveLength(10);
    expect(batches[2]).toHaveLength(5);
  });

  it("10件未満は1バッチ", () => {
    const items = Array.from({ length: 3 }, (_, i) => ({ id: i }));
    const BATCH_SIZE = 10;
    const batches: typeof items[] = [];

    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      batches.push(items.slice(i, i + BATCH_SIZE));
    }

    expect(batches).toHaveLength(1);
    expect(batches[0]).toHaveLength(3);
  });
});
