// __tests__/api/small-routes-batch1.test.ts
// 小型管理APIルートの一括テスト（カバレッジ向上用）
// 各ルート: 認証テスト + 正常系1-2件の最小構成
import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================
// 共通モック
// ============================================================

// Supabaseチェーンビルダー
function createChain(defaultResolve = { data: null, error: null }) {
  const chain: any = {};
  [
    "insert", "update", "delete", "select", "eq", "neq", "gt", "gte",
    "lt", "lte", "in", "is", "not", "order", "limit", "range", "single",
    "maybeSingle", "upsert", "ilike", "or", "count", "csv",
  ].forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = vi.fn((resolve: any) => resolve(defaultResolve));
  return chain;
}

let tableChains: Record<string, any> = {};
function getOrCreateChain(table: string) {
  if (!tableChains[table]) tableChains[table] = createChain();
  return tableChains[table];
}

// 認証モック
const mockVerifyAdminAuth = vi.fn();
vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: (...args: any[]) => mockVerifyAdminAuth(...args),
}));

// Supabase モック
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: vi.fn((table: string) => getOrCreateChain(table)) },
}));

// テナントモック
vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((q: any) => q),
  tenantPayload: vi.fn(() => ({ tenant_id: "test-tenant" })),
}));

// Redis モック
vi.mock("@/lib/redis", () => ({
  invalidateDashboardCache: vi.fn().mockResolvedValue(undefined),
}));

// jose モック（session / update-order-address用）
vi.mock("jose", () => ({
  jwtVerify: vi.fn().mockResolvedValue({
    payload: {
      userId: "user-1",
      email: "admin@test.com",
      name: "テスト管理者",
      role: "admin",
      tenantId: "test-tenant",
      platformRole: "tenant_admin",
      tenantRole: "admin",
      exp: Math.floor(Date.now() / 1000) + 3600,
    },
  }),
  SignJWT: vi.fn(),
}));

// session モック（logout用）
vi.mock("@/lib/session", () => ({
  revokeSession: vi.fn().mockResolvedValue(undefined),
}));

// undo モック
vi.mock("@/lib/undo", () => ({
  getRecentUndoActions: vi.fn().mockResolvedValue([]),
  executeUndo: vi.fn().mockResolvedValue({ success: true }),
}));

// flex-message/config モック
vi.mock("@/lib/flex-message/config", () => ({
  getFlexConfig: vi.fn().mockResolvedValue({ enabled: true }),
  setFlexConfig: vi.fn().mockResolvedValue(true),
}));

// feature-flags モック
vi.mock("@/lib/feature-flags", () => ({
  getEnabledFeatures: vi.fn().mockResolvedValue(["chat", "reservation"]),
  ALL_FEATURES: ["chat", "reservation", "karte"],
  FEATURE_LABELS: { chat: "チャット", reservation: "予約", karte: "カルテ" } as Record<string, string>,
}));

// intake-form-defaults モック
vi.mock("@/lib/intake-form-defaults", () => ({
  DEFAULT_INTAKE_FIELDS: [{ id: "name", type: "text", label: "名前", required: true, sort_order: 0 }],
  DEFAULT_INTAKE_SETTINGS: { step_by_step: false, header_title: "問診フォーム" },
}));

// patient-segments モック
vi.mock("@/lib/patient-segments", () => ({
  ALL_SEGMENTS: ["loyal", "dormant", "new"],
  SEGMENT_LABELS: { loyal: "ロイヤル", dormant: "休眠", new: "新規" },
}));

// bank-transfer-orders は @supabase/supabase-js を直接使用
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table: string) => getOrCreateChain(table)),
  })),
}));

// ============================================================
// リクエストヘルパー
// ============================================================
function createRequest(method: string, url: string, body?: any, cookies?: Record<string, string>) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const req = new Request(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // cookies プロパティを追加（NextRequest互換）
  const cookieMap = cookies || {};
  (req as any).cookies = {
    get: (name: string) => cookieMap[name] ? { value: cookieMap[name] } : undefined,
  };
  (req as any).nextUrl = new URL(url);

  return req as any;
}

// ============================================================
// beforeEach: 各テスト前にモックをリセット
// ============================================================
beforeEach(() => {
  vi.clearAllMocks();
  tableChains = {};
  mockVerifyAdminAuth.mockResolvedValue(true);
});

// ============================================================
// 1. chat-reads
// ============================================================
import { GET as chatReadsGET, PUT as chatReadsPUT } from "@/app/api/admin/chat-reads/route";

describe("admin/chat-reads", () => {
  it("未認証なら401を返す", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const req = createRequest("GET", "http://localhost/api/admin/chat-reads");
    const res = await chatReadsGET(req);
    expect(res.status).toBe(401);
  });

  it("GET: 既読データをオブジェクト形式で返す", async () => {
    const chain = getOrCreateChain("chat_reads");
    chain.then = vi.fn((resolve: any) =>
      resolve({ data: [{ patient_id: "p1", read_at: "2026-01-01T00:00:00Z" }], error: null }),
    );
    const req = createRequest("GET", "http://localhost/api/admin/chat-reads");
    const res = await chatReadsGET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.reads).toEqual({ p1: "2026-01-01T00:00:00Z" });
  });

  it("PUT: 既読マーク成功で ok:true を返す", async () => {
    const chain = getOrCreateChain("chat_reads");
    chain.then = vi.fn((resolve: any) => resolve({ data: null, error: null }));
    const req = createRequest("PUT", "http://localhost/api/admin/chat-reads", { patient_id: "p1" });
    const res = await chatReadsPUT(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.read_at).toBeDefined();
  });
});

// ============================================================
// 2. update-line-user-id
// ============================================================
import { POST as updateLineUserIdPOST } from "@/app/api/admin/update-line-user-id/route";

describe("admin/update-line-user-id", () => {
  it("未認証なら401を返す", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const req = createRequest("POST", "http://localhost/api/admin/update-line-user-id", {
      patient_id: "p1",
      line_user_id: "U123",
    });
    const res = await updateLineUserIdPOST(req);
    expect(res.status).toBe(401);
  });

  it("POST: LINE UID更新成功で ok:true を返す", async () => {
    const chain = getOrCreateChain("patients");
    chain.then = vi.fn((resolve: any) => resolve({ data: null, error: null }));
    const req = createRequest("POST", "http://localhost/api/admin/update-line-user-id", {
      patient_id: "p1",
      line_user_id: "U123",
    });
    const res = await updateLineUserIdPOST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});

// ============================================================
// 3. update-order-address
// ============================================================
import { POST as updateOrderAddressPOST } from "@/app/api/admin/update-order-address/route";

describe("admin/update-order-address", () => {
  it("未認証（Cookie無し）なら401を返す", async () => {
    const req = createRequest("POST", "http://localhost/api/admin/update-order-address", {
      orderId: "order-1",
      postalCode: "1234567",
      address: "東京都渋谷区",
    });
    // Cookieなし → verifyAdmin は false
    const res = await updateOrderAddressPOST(req);
    expect(res.status).toBe(401);
  });

  it("POST: 住所更新成功で ok:true を返す", async () => {
    // ordersチェーンを準備（存在確認 → maybeSingle → 更新）
    const chain = getOrCreateChain("orders");
    chain.maybeSingle = vi.fn().mockResolvedValue({
      data: { id: "order-1", patient_id: "p1" },
      error: null,
    });
    chain.then = vi.fn((resolve: any) => resolve({ data: null, error: null }));

    const req = createRequest(
      "POST",
      "http://localhost/api/admin/update-order-address",
      { orderId: "order-1", postalCode: "1234567", address: "東京都渋谷区" },
      { admin_session: "valid-jwt-token" },
    );
    const res = await updateOrderAddressPOST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});

// ============================================================
// 4. invalidate-cache
// ============================================================
import { POST as invalidateCachePOST } from "@/app/api/admin/invalidate-cache/route";

describe("admin/invalidate-cache", () => {
  it("未認証なら401を返す", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const req = createRequest("POST", "http://localhost/api/admin/invalidate-cache", {
      patient_id: "p1",
    });
    const res = await invalidateCachePOST(req);
    expect(res.status).toBe(401);
  });

  it("POST: キャッシュ無効化成功で ok:true を返す", async () => {
    const req = createRequest("POST", "http://localhost/api/admin/invalidate-cache", {
      patient_id: "p1",
    });
    const res = await invalidateCachePOST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.patientId).toBe("p1");
  });
});

// ============================================================
// 5. pins
// ============================================================
import { GET as pinsGET, PUT as pinsPUT } from "@/app/api/admin/pins/route";

describe("admin/pins", () => {
  it("GET: 未認証なら401を返す", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const req = createRequest("GET", "http://localhost/api/admin/pins");
    const res = await pinsGET(req);
    expect(res.status).toBe(401);
  });

  it("GET: ピン一覧を返す", async () => {
    const chain = getOrCreateChain("admin_users");
    chain.then = vi.fn((resolve: any) =>
      resolve({
        data: [{ pinned_patients: ["p1", "p2"] }, { pinned_patients: ["p2", "p3"] }],
        error: null,
      }),
    );
    const req = createRequest("GET", "http://localhost/api/admin/pins");
    const res = await pinsGET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    // 重複排除されたピン一覧
    expect(json.pins).toEqual(["p1", "p2", "p3"]);
  });

  it("PUT: ピン更新成功で ok:true を返す", async () => {
    const chain = getOrCreateChain("admin_users");
    // selectでユーザー一覧、updateでピン書き込み
    chain.then = vi.fn((resolve: any) =>
      resolve({ data: [{ id: "u1" }], error: null }),
    );
    const req = createRequest("PUT", "http://localhost/api/admin/pins", { pins: ["p1"] });
    const res = await pinsPUT(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});

// ============================================================
// 6. refunds
// ============================================================
import { GET as refundsGET } from "@/app/api/admin/refunds/route";

describe("admin/refunds", () => {
  it("未認証なら401を返す", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const req = createRequest("GET", "http://localhost/api/admin/refunds");
    const res = await refundsGET(req);
    expect(res.status).toBe(401);
  });

  it("GET: 返金一覧を返す", async () => {
    const ordersChain = getOrCreateChain("orders");
    ordersChain.then = vi.fn((resolve: any) =>
      resolve({
        data: [
          {
            id: "o1",
            patient_id: "p1",
            amount: 10000,
            refunded_amount: 10000,
            refund_status: "COMPLETED",
            refunded_at: "2026-01-01T00:00:00Z",
            status: "refunded",
            created_at: "2025-12-01T00:00:00Z",
            product_code: "MJL_2.5mg_1m",
            product_name: null,
          },
        ],
        error: null,
      }),
    );
    const patientsChain = getOrCreateChain("patients");
    patientsChain.then = vi.fn((resolve: any) =>
      resolve({
        data: [{ patient_id: "p1", name: "テスト太郎" }],
        error: null,
      }),
    );

    const req = createRequest("GET", "http://localhost/api/admin/refunds");
    const res = await refundsGET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.refunds).toHaveLength(1);
    expect(json.refunds[0].patient_name).toBe("テスト太郎");
    expect(json.refunds[0].product_display).toBe("マンジャロ 2.5mg 1ヶ月");
  });
});

// ============================================================
// 7. unread-count
// ============================================================
import { GET as unreadCountGET } from "@/app/api/admin/unread-count/route";

describe("admin/unread-count", () => {
  it("未認証なら401を返す", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const req = createRequest("GET", "http://localhost/api/admin/unread-count");
    const res = await unreadCountGET(req);
    expect(res.status).toBe(401);
  });

  it("GET: 未読カウントを返す", async () => {
    // chat_reads: 既読情報
    const chatReadsChain = getOrCreateChain("chat_reads");
    chatReadsChain.then = vi.fn((resolve: any) =>
      resolve({ data: [{ patient_id: "p1", read_at: "2026-01-01T00:00:00Z" }], error: null }),
    );
    // message_log: メッセージ一覧（1ページ分で終了）
    const msgChain = getOrCreateChain("message_log");
    msgChain.then = vi.fn((resolve: any) =>
      resolve({
        data: [
          { patient_id: "p1", sent_at: "2026-01-02T00:00:00Z" }, // 未読（read_atより後）
          { patient_id: "p2", sent_at: "2026-01-01T00:00:00Z" }, // 未読（既読情報なし）
        ],
        error: null,
      }),
    );

    const req = createRequest("GET", "http://localhost/api/admin/unread-count");
    const res = await unreadCountGET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.count).toBe(2);
  });
});

// ============================================================
// 8. undo
// ============================================================
import { GET as undoGET, POST as undoPOST } from "@/app/api/admin/undo/route";

describe("admin/undo", () => {
  it("GET: 未認証なら401を返す", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const req = createRequest("GET", "http://localhost/api/admin/undo");
    const res = await undoGET(req);
    expect(res.status).toBe(401);
  });

  it("GET: 取り消し可能な操作一覧を返す", async () => {
    const req = createRequest("GET", "http://localhost/api/admin/undo");
    const res = await undoGET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.actions).toEqual([]);
  });

  it("POST: 取り消し実行成功で ok:true を返す", async () => {
    const req = createRequest("POST", "http://localhost/api/admin/undo", { undo_id: 1 });
    const res = await undoPOST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});

// ============================================================
// 9. flex-settings
// ============================================================
import { GET as flexGET, PUT as flexPUT } from "@/app/api/admin/flex-settings/route";

describe("admin/flex-settings", () => {
  it("GET: 未認証なら401を返す", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const req = createRequest("GET", "http://localhost/api/admin/flex-settings");
    const res = await flexGET(req);
    expect(res.status).toBe(401);
  });

  it("GET: FLEX設定を返す", async () => {
    const req = createRequest("GET", "http://localhost/api/admin/flex-settings");
    const res = await flexGET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.config).toEqual({ enabled: true });
  });

  it("PUT: FLEX設定更新成功で ok:true を返す", async () => {
    const req = createRequest("PUT", "http://localhost/api/admin/flex-settings", {
      config: { enabled: false, template: "default" },
    });
    const res = await flexPUT(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});

// ============================================================
// 10. logout
// ============================================================
import { POST as logoutPOST } from "@/app/api/admin/logout/route";

describe("admin/logout", () => {
  it("POST: ログアウト成功で ok:true を返す", async () => {
    const req = createRequest(
      "POST",
      "http://localhost/api/admin/logout",
      undefined,
      { admin_session: "some-jwt" },
    );
    const res = await logoutPOST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("POST: Cookie無しでもエラーにならない", async () => {
    const req = createRequest("POST", "http://localhost/api/admin/logout");
    const res = await logoutPOST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});

// ============================================================
// 11. session
// ============================================================
import { GET as sessionGET } from "@/app/api/admin/session/route";

describe("admin/session", () => {
  it("GET: Cookie無しなら401を返す", async () => {
    const req = createRequest("GET", "http://localhost/api/admin/session");
    const res = await sessionGET(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("no_session");
  });

  it("GET: 有効なセッションでユーザー情報を返す", async () => {
    const req = createRequest(
      "GET",
      "http://localhost/api/admin/session",
      undefined,
      { admin_session: "valid-jwt" },
    );
    const res = await sessionGET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.user.userId).toBe("user-1");
    expect(json.user.email).toBe("admin@test.com");
  });
});

// ============================================================
// 12. features
// ============================================================
import { GET as featuresGET } from "@/app/api/admin/features/route";

describe("admin/features", () => {
  it("GET: 未認証なら401を返す", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const req = createRequest("GET", "http://localhost/api/admin/features");
    const res = await featuresGET(req);
    expect(res.status).toBe(401);
  });

  it("GET: 機能一覧を返す", async () => {
    const req = createRequest("GET", "http://localhost/api/admin/features");
    const res = await featuresGET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.features).toHaveLength(3);
    expect(json.enabledKeys).toEqual(["chat", "reservation"]);
  });
});

// ============================================================
// 13. tenant-info
// ============================================================
import { GET as tenantInfoGET } from "@/app/api/admin/tenant-info/route";

describe("admin/tenant-info", () => {
  it("GET: テナント情報を返す（認証不要）", async () => {
    const chain = getOrCreateChain("tenants");
    chain.maybeSingle = vi.fn().mockResolvedValue({
      data: { name: "テストクリニック", logo_url: "https://example.com/logo.png" },
      error: null,
    });
    const req = createRequest("GET", "http://localhost/api/admin/tenant-info");
    const res = await tenantInfoGET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.name).toBe("テストクリニック");
  });
});

// ============================================================
// 14. messages/log
// ============================================================
import { GET as messagesLogGET } from "@/app/api/admin/messages/log/route";

describe("admin/messages/log", () => {
  it("GET: 未認証なら401を返す", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const req = createRequest("GET", "http://localhost/api/admin/messages/log");
    const res = await messagesLogGET(req);
    expect(res.status).toBe(401);
  });

  it("GET: メッセージ一覧を返す", async () => {
    const chain = getOrCreateChain("message_log");
    // selectで count: "exact" を使うため、countプロパティも返す
    chain.then = vi.fn((resolve: any) =>
      resolve({
        data: [
          { id: 1, patient_id: "p1", content: "こんにちは", status: "sent", direction: "outgoing", sent_at: "2026-01-01T00:00:00Z" },
        ],
        error: null,
        count: 1,
      }),
    );
    const req = createRequest("GET", "http://localhost/api/admin/messages/log?limit=10");
    const res = await messagesLogGET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.messages).toHaveLength(1);
    expect(json.total).toBe(1);
  });
});

// ============================================================
// 15. intake-form
// ============================================================
import { GET as intakeFormGET, PUT as intakeFormPUT } from "@/app/api/admin/intake-form/route";

describe("admin/intake-form", () => {
  it("GET: 未認証なら401を返す", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const req = createRequest("GET", "http://localhost/api/admin/intake-form");
    const res = await intakeFormGET(req);
    expect(res.status).toBe(401);
  });

  it("GET: DB定義なしの場合デフォルトを返す", async () => {
    const chain = getOrCreateChain("intake_form_definitions");
    chain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const req = createRequest("GET", "http://localhost/api/admin/intake-form");
    const res = await intakeFormGET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.definition.is_default).toBe(true);
    expect(json.definition.name).toBe("問診フォーム");
  });

  it("PUT: 新規作成成功で ok:true を返す", async () => {
    const chain = getOrCreateChain("intake_form_definitions");
    chain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null }); // 既存なし
    chain.then = vi.fn((resolve: any) => resolve({ data: null, error: null })); // insert成功
    const req = createRequest("PUT", "http://localhost/api/admin/intake-form", {
      fields: [{ id: "name", type: "text", label: "名前", required: true, sort_order: 0 }],
      settings: { step_by_step: false, header_title: "問診フォーム" },
    });
    const res = await intakeFormPUT(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});

// ============================================================
// 16. intake-form/reset
// ============================================================
import { POST as intakeFormResetPOST } from "@/app/api/admin/intake-form/reset/route";

describe("admin/intake-form/reset", () => {
  it("POST: 未認証なら401を返す", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const req = createRequest("POST", "http://localhost/api/admin/intake-form/reset");
    const res = await intakeFormResetPOST(req);
    expect(res.status).toBe(401);
  });

  it("POST: リセット成功でデフォルト値を返す", async () => {
    const chain = getOrCreateChain("intake_form_definitions");
    chain.maybeSingle = vi.fn().mockResolvedValue({ data: { id: 1 }, error: null }); // 既存あり
    chain.then = vi.fn((resolve: any) => resolve({ data: null, error: null })); // update成功
    const req = createRequest("POST", "http://localhost/api/admin/intake-form/reset");
    const res = await intakeFormResetPOST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.fields).toBeDefined();
    expect(json.settings).toBeDefined();
  });
});

// ============================================================
// 17. date_override
// ============================================================
import { POST as dateOverridePOST, DELETE as dateOverrideDELETE } from "@/app/api/admin/date_override/route";

describe("admin/date_override", () => {
  it("POST: 未認証なら401を返す", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const req = createRequest("POST", "http://localhost/api/admin/date_override", {
      override: { doctor_id: "d1", date: "2026-03-01" },
    });
    const res = await dateOverridePOST(req);
    expect(res.status).toBe(401);
  });

  it("POST: オーバーライド作成成功で ok:true を返す", async () => {
    const chain = getOrCreateChain("doctor_date_overrides");
    chain.then = vi.fn((resolve: any) => resolve({ data: null, error: null }));
    const req = createRequest("POST", "http://localhost/api/admin/date_override", {
      override: {
        doctor_id: "d1",
        date: "2026-03-01",
        type: "modify",
        start_time: "09:00",
        end_time: "17:00",
      },
    });
    const res = await dateOverridePOST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.override.doctor_id).toBe("d1");
  });

  it("DELETE: オーバーライド削除成功で ok:true を返す", async () => {
    const chain = getOrCreateChain("doctor_date_overrides");
    chain.then = vi.fn((resolve: any) => resolve({ data: null, error: null }));
    const req = createRequest("DELETE", "http://localhost/api/admin/date_override", {
      doctor_id: "d1",
      date: "2026-03-01",
    });
    const res = await dateOverrideDELETE(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});

// ============================================================
// 18. segments
// ============================================================
import { GET as segmentsGET } from "@/app/api/admin/segments/route";

describe("admin/segments", () => {
  it("GET: 未認証なら401を返す", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const req = createRequest("GET", "http://localhost/api/admin/segments");
    const res = await segmentsGET(req);
    expect(res.status).toBe(401);
  });

  it("GET: セグメント一覧を返す（空データ）", async () => {
    const chain = getOrCreateChain("patient_segments");
    chain.then = vi.fn((resolve: any) => resolve({ data: [], error: null }));
    const req = createRequest("GET", "http://localhost/api/admin/segments");
    const res = await segmentsGET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.total).toBe(0);
    expect(json.segments).toBeDefined();
    expect(json.summary).toBeDefined();
  });
});

// ============================================================
// 19. doctors
// ============================================================
import { POST as doctorsPOST } from "@/app/api/admin/doctors/route";

describe("admin/doctors", () => {
  it("POST: 未認証なら401を返す", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const req = createRequest("POST", "http://localhost/api/admin/doctors", {
      doctor: { doctor_id: "d1", doctor_name: "テスト医師" },
    });
    const res = await doctorsPOST(req);
    expect(res.status).toBe(401);
  });

  it("POST: 医師登録成功で ok:true を返す", async () => {
    const chain = getOrCreateChain("doctors");
    chain.then = vi.fn((resolve: any) => resolve({ data: null, error: null }));
    const req = createRequest("POST", "http://localhost/api/admin/doctors", {
      doctor: { doctor_id: "d1", doctor_name: "テスト医師", is_active: true, sort_order: 1 },
    });
    const res = await doctorsPOST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.doctor.doctor_id).toBe("d1");
    expect(json.doctor.doctor_name).toBe("テスト医師");
  });
});

// ============================================================
// 20. bank-transfer-orders
// ============================================================
import { GET as bankTransferOrdersGET } from "@/app/api/admin/bank-transfer-orders/route";

describe("admin/bank-transfer-orders", () => {
  it("GET: 未認証なら401を返す", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const req = createRequest("GET", "http://localhost/api/admin/bank-transfer-orders");
    const res = await bankTransferOrdersGET(req);
    expect(res.status).toBe(401);
  });

  it("GET: 銀行振込注文一覧を返す", async () => {
    const chain = getOrCreateChain("orders");
    chain.then = vi.fn((resolve: any) =>
      resolve({
        data: [
          { id: "o1", patient_id: "p1", payment_method: "bank_transfer", amount: 50000 },
        ],
        error: null,
      }),
    );
    const req = createRequest("GET", "http://localhost/api/admin/bank-transfer-orders");
    const res = await bankTransferOrdersGET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.orders).toHaveLength(1);
    expect(json.orders[0].payment_method).toBe("bank_transfer");
  });
});
