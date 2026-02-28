// __tests__/api/small-routes-batch4.test.ts
// 小規模APIルートの一括テスト（バッチ4）
// カバレッジ向上のため、各ルートに認証テスト+正常系1件のみ

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ============================================================
// 共通モックヘルパー
// ============================================================
function createChain(defaultResolve = { data: null, error: null }) {
  const chain: any = {};
  [
    "insert", "update", "delete", "select", "eq", "neq", "gt", "gte",
    "lt", "lte", "in", "is", "not", "order", "limit", "range", "single",
    "maybeSingle", "upsert", "ilike", "or", "count", "csv", "like",
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

// ============================================================
// 共通モック
// ============================================================
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => getOrCreateChain(table)),
    rpc: vi.fn().mockResolvedValue({ data: 0, error: null }),
  },
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((q: any) => q),
  tenantPayload: vi.fn(() => ({ tenantId: "test-tenant" })),
}));

vi.mock("@/lib/auth", () => ({
  verifyAdminAuth: vi.fn().mockResolvedValue({ userId: "user-1", role: "admin", tenantId: "test-tenant" }),
}));

vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: vi.fn().mockResolvedValue({ userId: "user-1", role: "admin", tenantId: "test-tenant" }),
}));

vi.mock("@/lib/redis", () => ({
  redis: {
    ping: vi.fn().mockResolvedValue("PONG"),
    smembers: vi.fn().mockResolvedValue([]),
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue("OK"),
    incr: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(1),
  },
  invalidateDashboardCache: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/line-push", () => ({
  pushMessage: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock("@/lib/settings", () => ({
  getSettingOrEnv: vi.fn().mockResolvedValue("test-value"),
}));

vi.mock("@/lib/ai-reply", () => ({
  processPendingAiReplies: vi.fn().mockResolvedValue(0),
  lastProcessLog: [],
  sendAiReply: vi.fn().mockResolvedValue(undefined),
  buildSystemPrompt: vi.fn().mockReturnValue("test prompt"),
}));

vi.mock("@/lib/ai-reply-sign", () => ({
  verifyDraftSignature: vi.fn().mockReturnValue(true),
}));

vi.mock("@/lib/followup", () => ({
  processFollowups: vi.fn().mockResolvedValue({ sent: 0, failed: 0, skipped: 0 }),
}));

vi.mock("@/lib/patient-segments", () => ({
  classifyPatients: vi.fn().mockResolvedValue([]),
  saveSegments: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/reservation-flex", () => ({
  buildReminderFlex: vi.fn().mockResolvedValue({ altText: "リマインド", contents: {} }),
}));

vi.mock("@/lib/auto-reminder", () => ({
  getJSTToday: vi.fn().mockReturnValue("2026-02-23"),
  addOneDay: vi.fn().mockReturnValue("2026-02-24"),
  formatReservationTime: vi.fn().mockReturnValue("14:00"),
  buildReminderMessage: vi.fn().mockReturnValue("リマインドメッセージ"),
}));

vi.mock("@/lib/intake-form-defaults", () => ({
  DEFAULT_INTAKE_FIELDS: [{ id: "field1", label: "テスト項目" }],
  DEFAULT_INTAKE_SETTINGS: { title: "テスト問診" },
}));

vi.mock("@/lib/validations/helpers", () => ({
  parseBody: vi.fn().mockResolvedValue({ data: {} }),
}));

vi.mock("@/lib/validations/repair", () => ({
  repairSchema: { parse: vi.fn() },
}));

vi.mock("@/lib/validations/patient", () => ({
  verifySendSchema: { parse: vi.fn() },
  verifyCheckSchema: { parse: vi.fn() },
}));

vi.mock("@/lib/validations/ai-reply", () => ({
  aiReplySendSchema: { parse: vi.fn() },
  aiReplyRejectSchema: { parse: vi.fn() },
  aiReplyRegenerateSchema: { parse: vi.fn() },
}));

vi.mock("@/lib/validations/forms", () => ({
  formSubmitSchema: { parse: vi.fn() },
}));

vi.mock("@/lib/validations/nps", () => ({
  npsResponseSchema: { parse: vi.fn() },
}));

vi.mock("twilio", () => ({
  default: vi.fn(() => ({
    verify: {
      v2: {
        services: vi.fn(() => ({
          verifications: { create: vi.fn().mockResolvedValue({ status: "pending" }) },
          verificationChecks: { create: vi.fn().mockResolvedValue({ valid: true }) },
        })),
      },
    },
  })),
}));

vi.mock("@anthropic-ai/sdk", () => {
  class AnthropicMock {
    messages = {
      create: vi.fn().mockResolvedValue({
        content: [{ type: "text", text: "再生成された返信" }],
      }),
    };
  }
  return { default: AnthropicMock };
});

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table: string) => getOrCreateChain(table)),
  })),
}));

// ============================================================
// テスト用リクエスト生成ヘルパー
// ============================================================
function makeReq(
  url: string,
  opts: {
    method?: string;
    headers?: Record<string, string>;
    cookies?: Record<string, string>;
    body?: any;
  } = {},
): NextRequest {
  const { method = "GET", headers = {}, cookies = {}, body } = opts;
  const init: any = { method, headers: new Headers(headers) };
  if (body) {
    init.body = JSON.stringify(body);
    init.headers.set("content-type", "application/json");
  }
  const req = new NextRequest(new URL(url, "http://localhost:3000"), init);
  // Cookieを設定
  for (const [k, v] of Object.entries(cookies)) {
    req.cookies.set(k, v);
  }
  return req;
}

beforeEach(() => {
  tableChains = {};
  vi.clearAllMocks();
  // CRON_SECRET をデフォルトで設定
  process.env.CRON_SECRET = "test-cron-secret";
  process.env.ANTHROPIC_API_KEY = "test-api-key";
});

// ============================================================
// 1. cron/generate-reminders
// ============================================================
describe("cron/generate-reminders", () => {
  it("正常系: ルールがない場合 sent=0 を返す", async () => {
    const chain = getOrCreateChain("reminder_rules");
    chain.then = vi.fn((resolve: any) => resolve({ data: [], error: null }));

    const { GET } = await import("@/app/api/cron/generate-reminders/route");
    const req = makeReq("http://localhost:3000/api/cron/generate-reminders", {
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
    });
    const res = await GET(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.sent).toBe(0);
  });

  it("DBエラー時は500を返す", async () => {
    const chain = getOrCreateChain("reminder_rules");
    chain.then = vi.fn((resolve: any) => resolve({ data: null, error: { message: "DB error" } }));

    const { GET } = await import("@/app/api/cron/generate-reminders/route");
    const req = makeReq("http://localhost:3000/api/cron/generate-reminders", {
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
    });
    const res = await GET(req);
    expect(res.status).toBe(500);
  });
});

// ============================================================
// 2. cron/collect-line-stats
// ============================================================
describe("cron/collect-line-stats", () => {
  it("正常系: 既に収集済みの場合 skipped=1 を返す", async () => {
    // テナント一覧
    const tenantsChain = getOrCreateChain("tenants");
    tenantsChain.then = vi.fn((resolve: any) => resolve({ data: [{ id: "test-tenant" }], error: null }));
    // 既存データあり
    const chain = getOrCreateChain("line_daily_stats");
    chain.then = vi.fn((resolve: any) => resolve({ data: { id: "existing" }, error: null }));

    const { GET } = await import("@/app/api/cron/collect-line-stats/route");
    const req = makeReq("http://localhost:3000/api/cron/collect-line-stats", {
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
    });
    const res = await GET(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.skipped).toBe(1);
  });
});

// ============================================================
// 3. cron/send-scheduled
// ============================================================
describe("cron/send-scheduled", () => {
  it("CRON_SECRET不一致で401", async () => {
    const { GET } = await import("@/app/api/cron/send-scheduled/route");
    const req = makeReq("http://localhost:3000/api/cron/send-scheduled", {
      headers: { authorization: "Bearer wrong-secret" },
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("正常系: メッセージがない場合 processed=0 を返す", async () => {
    const chain = getOrCreateChain("scheduled_messages");
    chain.then = vi.fn((resolve: any) => resolve({ data: [], error: null }));

    const { GET } = await import("@/app/api/cron/send-scheduled/route");
    const req = makeReq("http://localhost:3000/api/cron/send-scheduled", {
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
    });
    const res = await GET(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.processed).toBe(0);
  });
});

// ============================================================
// 4. cron/ai-reply
// ============================================================
describe("cron/ai-reply", () => {
  it("CRON_SECRET不一致で401", async () => {
    const { GET } = await import("@/app/api/cron/ai-reply/route");
    const req = makeReq("http://localhost:3000/api/cron/ai-reply", {
      headers: { authorization: "Bearer wrong-secret" },
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("正常系: processed=0 で正常レスポンス", async () => {
    const { GET } = await import("@/app/api/cron/ai-reply/route");
    const req = makeReq("http://localhost:3000/api/cron/ai-reply", {
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
    });
    const res = await GET(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.processed).toBe(0);
  });
});

// ============================================================
// 5. cron/followup
// ============================================================
describe("cron/followup", () => {
  it("CRON_SECRET不一致で401", async () => {
    const { GET } = await import("@/app/api/cron/followup/route");
    const req = makeReq("http://localhost:3000/api/cron/followup", {
      headers: { authorization: "Bearer wrong-secret" },
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("正常系: 処理結果を返す", async () => {
    const { GET } = await import("@/app/api/cron/followup/route");
    const req = makeReq("http://localhost:3000/api/cron/followup", {
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
    });
    const res = await GET(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
  });
});

// ============================================================
// 6. cron/segment-recalculate
// ============================================================
describe("cron/segment-recalculate", () => {
  it("CRON_SECRET不一致で401", async () => {
    const { GET } = await import("@/app/api/cron/segment-recalculate/route");
    const req = makeReq("http://localhost:3000/api/cron/segment-recalculate", {
      headers: { authorization: "Bearer wrong-secret" },
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("正常系: テナント0件でも正常に返す", async () => {
    const tenantsChain = getOrCreateChain("tenants");
    tenantsChain.then = vi.fn((resolve: any) => resolve({ data: [], error: null }));

    const { GET } = await import("@/app/api/cron/segment-recalculate/route");
    const req = makeReq("http://localhost:3000/api/cron/segment-recalculate", {
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
    });
    const res = await GET(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
  });
});

// ============================================================
// 7. cron/health-report
// ============================================================
describe("cron/health-report", () => {
  it("CRON_SECRET不一致で401", async () => {
    const { GET } = await import("@/app/api/cron/health-report/route");
    const req = makeReq("http://localhost:3000/api/cron/health-report", {
      headers: { authorization: "Bearer wrong-secret" },
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("正常系: 全項目OKで issues=[] を返す", async () => {
    // patients テーブルクエリ
    const patientsChain = getOrCreateChain("patients");
    patientsChain.then = vi.fn((resolve: any) => resolve({ data: [], error: null }));

    // intake テーブルクエリ
    const intakeChain = getOrCreateChain("intake");
    intakeChain.then = vi.fn((resolve: any) => resolve({ count: 0, error: null }));

    const { GET } = await import("@/app/api/cron/health-report/route");
    const req = makeReq("http://localhost:3000/api/cron/health-report", {
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
    });
    const res = await GET(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.issues).toEqual([]);
  });
});

// ============================================================
// 8. health
// ============================================================
describe("health", () => {
  it("正常系: Supabase/Redis両方OKで healthy を返す", async () => {
    const intakeChain = getOrCreateChain("intake");
    intakeChain.then = vi.fn((resolve: any) => resolve({ data: [{ id: 1 }], error: null }));

    const { GET } = await import("@/app/api/health/route");
    const res = await GET();
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.status).toBe("healthy");
  });
});

// ============================================================
// 9. profile
// ============================================================
describe("profile", () => {
  it("Cookie未設定で401", async () => {
    const { GET } = await import("@/app/api/profile/route");
    const req = makeReq("http://localhost:3000/api/profile");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("正常系: patient_id+patient_name Cookieで200", async () => {
    const { GET } = await import("@/app/api/profile/route");
    const req = makeReq("http://localhost:3000/api/profile", {
      cookies: { patient_id: "P001", patient_name: "テスト太郎" },
    });
    const res = await GET(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.patientId).toBe("P001");
    expect(json.name).toBe("テスト太郎");
  });
});

// ============================================================
// 10. repair
// ============================================================
describe("repair", () => {
  it("Cookie未設定で401", async () => {
    const { parseBody } = await import("@/lib/validations/helpers");
    // parseBodyが呼ばれる前にreturnするのでモック不要

    const { POST } = await import("@/app/api/repair/route");
    const req = makeReq("http://localhost:3000/api/repair", {
      method: "POST",
      body: { name_kana: "テスト", sex: "男性", birth: "1990-01-01", tel: "09012345678" },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("正常系: Cookie付きで200", async () => {
    const { parseBody } = await import("@/lib/validations/helpers");
    (parseBody as any).mockResolvedValue({
      data: { name_kana: "テストタロウ", sex: "男性", birth: "1990-01-01", tel: "09012345678" },
    });

    const intakeChain = getOrCreateChain("intake");
    intakeChain.then = vi.fn((resolve: any) => resolve({ data: { answers: {} }, error: null }));
    // update用
    const intakeChain2 = getOrCreateChain("intake");
    intakeChain2.then = vi.fn((resolve: any) => resolve({ data: null, error: null }));

    const patientsChain = getOrCreateChain("patients");
    patientsChain.then = vi.fn((resolve: any) => resolve({ data: null, error: null }));

    const { POST } = await import("@/app/api/repair/route");
    const req = makeReq("http://localhost:3000/api/repair", {
      method: "POST",
      cookies: { patient_id: "P001" },
      body: { name_kana: "テストタロウ", sex: "男性", birth: "1990-01-01", tel: "09012345678" },
    });
    const res = await POST(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
  });
});

// ============================================================
// 11. csrf-token（既存テストあるがカバレッジ用にインポートテスト追加）
// ============================================================
describe("csrf-token", () => {
  it("正常系: csrfToken を含むレスポンスを返す", async () => {
    const { GET } = await import("@/app/api/csrf-token/route");
    const res = await GET();
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.csrfToken).toBeDefined();
    expect(typeof json.csrfToken).toBe("string");
  });
});

// ============================================================
// 12. verify/send
// ============================================================
describe("verify/send", () => {
  it("正常系: 認証コード送信成功", async () => {
    const { parseBody } = await import("@/lib/validations/helpers");
    (parseBody as any).mockResolvedValue({ data: { phone: "+819012345678" } });

    const { POST } = await import("@/app/api/verify/send/route");
    const req = makeReq("http://localhost:3000/api/verify/send", {
      method: "POST",
      body: { phone: "+819012345678" },
    });
    const res = await POST(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.status).toBe("pending");
  });
});

// ============================================================
// 13. verify/check
// ============================================================
describe("verify/check", () => {
  it("正常系: 認証コード確認成功", async () => {
    const { parseBody } = await import("@/lib/validations/helpers");
    (parseBody as any).mockResolvedValue({ data: { phone: "+819012345678", code: "123456" } });

    const { POST } = await import("@/app/api/verify/check/route");
    const req = makeReq("http://localhost:3000/api/verify/check", {
      method: "POST",
      body: { phone: "+819012345678", code: "123456" },
    });
    const res = await POST(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.valid).toBe(true);
  });
});

// ============================================================
// 14. register/check
// ============================================================
describe("register/check", () => {
  it("line_user_id Cookie未設定で needsLineLogin=true", async () => {
    const { GET } = await import("@/app/api/register/check/route");
    const req = makeReq("http://localhost:3000/api/register/check");
    const res = await GET(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.registered).toBe(false);
    expect(json.needsLineLogin).toBe(true);
  });

  it("正常系: 患者が未登録の場合 registered=false", async () => {
    const patientsChain = getOrCreateChain("patients");
    patientsChain.then = vi.fn((resolve: any) => resolve({ data: null, error: null }));

    const { GET } = await import("@/app/api/register/check/route");
    const req = makeReq("http://localhost:3000/api/register/check", {
      cookies: { line_user_id: "U1234567890" },
    });
    const res = await GET(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.registered).toBe(false);
  });
});

// ============================================================
// 15. intake/form-definition
// ============================================================
describe("intake/form-definition", () => {
  it("正常系: DB未定義でもデフォルトフィールドを返す", async () => {
    const chain = getOrCreateChain("intake_form_definitions");
    chain.then = vi.fn((resolve: any) => resolve({ data: null, error: null }));

    const { GET } = await import("@/app/api/intake/form-definition/route");
    const req = makeReq("http://localhost:3000/api/intake/form-definition");
    const res = await GET(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.fields).toBeDefined();
    expect(json.settings).toBeDefined();
  });
});

// ============================================================
// 16. intake/has
// ============================================================
describe("intake/has", () => {
  it("Cookie未設定で401", async () => {
    const { GET } = await import("@/app/api/intake/has/route");
    const req = makeReq("http://localhost:3000/api/intake/has?reserveId=R001");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("reserveId未指定で400", async () => {
    const { GET } = await import("@/app/api/intake/has/route");
    const req = makeReq("http://localhost:3000/api/intake/has", {
      cookies: { patient_id: "P001" },
    });
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("正常系: 問診なしの場合 exists=false", async () => {
    const intakeChain = getOrCreateChain("intake");
    intakeChain.then = vi.fn((resolve: any) => resolve({ data: null, error: null }));

    const { GET } = await import("@/app/api/intake/has/route");
    const req = makeReq("http://localhost:3000/api/intake/has?reserveId=R001", {
      cookies: { patient_id: "P001" },
    });
    const res = await GET(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.exists).toBe(false);
  });
});

// ============================================================
// 17. shipping/share/[id]
// ============================================================
describe("shipping/share/[id]", () => {
  it("正常系: 共有データを返す", async () => {
    const chain = getOrCreateChain("shipping_shares");
    const futureDate = new Date(Date.now() + 86400000).toISOString();
    chain.then = vi.fn((resolve: any) =>
      resolve({ data: { data: { items: [] }, expires_at: futureDate }, error: null })
    );

    const { GET } = await import("@/app/api/shipping/share/[id]/route");
    const req = makeReq("http://localhost:3000/api/shipping/share/test-id");
    const params = Promise.resolve({ id: "test-id" });
    const res = await GET(req, { params });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data).toBeDefined();
  });

  it("IDが空の場合400", async () => {
    const { GET } = await import("@/app/api/shipping/share/[id]/route");
    const req = makeReq("http://localhost:3000/api/shipping/share/");
    const params = Promise.resolve({ id: "" });
    const res = await GET(req, { params });
    expect(res.status).toBe(400);
  });
});

// ============================================================
// 18. ai-reply/[draftId] (GET)
// ============================================================
describe("ai-reply/[draftId]", () => {
  it("無効なIDで400", async () => {
    const { GET } = await import("@/app/api/ai-reply/[draftId]/route");
    const req = new Request("http://localhost:3000/api/ai-reply/abc");
    const params = Promise.resolve({ draftId: "abc" });
    const res = await GET(req, { params });
    expect(res.status).toBe(400);
  });

  it("署名不正で403", async () => {
    const { verifyDraftSignature } = await import("@/lib/ai-reply-sign");
    (verifyDraftSignature as any).mockReturnValue(false);

    const { GET } = await import("@/app/api/ai-reply/[draftId]/route");
    const req = new Request("http://localhost:3000/api/ai-reply/1?sig=bad&exp=0");
    const params = Promise.resolve({ draftId: "1" });
    const res = await GET(req, { params });
    expect(res.status).toBe(403);

    // 元に戻す
    (verifyDraftSignature as any).mockReturnValue(true);
  });

  it("正常系: ドラフト情報を返す", async () => {
    const draftsChain = getOrCreateChain("ai_reply_drafts");
    draftsChain.then = vi.fn((resolve: any) =>
      resolve({
        data: {
          id: 1, patient_id: "P001", original_message: "元メッセージ",
          draft_reply: "返信案", status: "pending", ai_category: "general", confidence: 0.9,
        },
        error: null,
      })
    );
    const patientsChain = getOrCreateChain("patients");
    patientsChain.then = vi.fn((resolve: any) =>
      resolve({ data: { name: "テスト太郎" }, error: null })
    );

    const { GET } = await import("@/app/api/ai-reply/[draftId]/route");
    const req = new Request("http://localhost:3000/api/ai-reply/1?sig=valid&exp=9999999999");
    const params = Promise.resolve({ draftId: "1" });
    const res = await GET(req, { params });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.id).toBe(1);
    expect(json.patientName).toBe("テスト太郎");
  });
});

// ============================================================
// 19. ai-reply/[draftId]/send
// ============================================================
describe("ai-reply/[draftId]/send", () => {
  it("無効なIDで400", async () => {
    const { POST } = await import("@/app/api/ai-reply/[draftId]/send/route");
    const req = makeReq("http://localhost:3000/api/ai-reply/abc/send", {
      method: "POST",
      body: { sig: "s", exp: 0 },
    });
    const params = Promise.resolve({ draftId: "abc" });
    const res = await POST(req, { params });
    expect(res.status).toBe(400);
  });

  it("正常系: 送信成功でok=true", async () => {
    const { parseBody } = await import("@/lib/validations/helpers");
    (parseBody as any).mockResolvedValue({ data: { sig: "valid", exp: 9999999999 } });

    const draftsChain = getOrCreateChain("ai_reply_drafts");
    // 最初のselect: ドラフト取得
    draftsChain.then = vi.fn((resolve: any) =>
      resolve({
        data: {
          id: 1, patient_id: "P001", line_uid: "U123",
          draft_reply: "返信", status: "pending", tenant_id: "test-tenant",
          original_message: "質問",
        },
        error: null,
      })
    );

    const settingsChain = getOrCreateChain("ai_reply_settings");
    settingsChain.then = vi.fn((resolve: any) =>
      resolve({ data: { id: 1, knowledge_base: "" }, error: null })
    );

    const { POST } = await import("@/app/api/ai-reply/[draftId]/send/route");
    const req = makeReq("http://localhost:3000/api/ai-reply/1/send", {
      method: "POST",
      body: { sig: "valid", exp: 9999999999 },
    });
    const params = Promise.resolve({ draftId: "1" });
    const res = await POST(req, { params });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
  });
});

// ============================================================
// 20. ai-reply/[draftId]/reject
// ============================================================
describe("ai-reply/[draftId]/reject", () => {
  it("無効なIDで400", async () => {
    const { POST } = await import("@/app/api/ai-reply/[draftId]/reject/route");
    const req = makeReq("http://localhost:3000/api/ai-reply/abc/reject", {
      method: "POST",
      body: { sig: "s", exp: 0 },
    });
    const params = Promise.resolve({ draftId: "abc" });
    const res = await POST(req, { params });
    expect(res.status).toBe(400);
  });

  it("正常系: 却下成功でok=true", async () => {
    const { parseBody } = await import("@/lib/validations/helpers");
    (parseBody as any).mockResolvedValue({
      data: { sig: "valid", exp: 9999999999, reason: "不正確", reject_category: "inaccurate" },
    });

    const draftsChain = getOrCreateChain("ai_reply_drafts");
    draftsChain.then = vi.fn((resolve: any) =>
      resolve({ data: { status: "pending" }, error: null })
    );

    const { POST } = await import("@/app/api/ai-reply/[draftId]/reject/route");
    const req = makeReq("http://localhost:3000/api/ai-reply/1/reject", {
      method: "POST",
      body: { sig: "valid", exp: 9999999999, reason: "不正確" },
    });
    const params = Promise.resolve({ draftId: "1" });
    const res = await POST(req, { params });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
  });
});

// ============================================================
// 21. ai-reply/[draftId]/regenerate
// ============================================================
describe("ai-reply/[draftId]/regenerate", () => {
  it("無効なIDで400", async () => {
    const { POST } = await import("@/app/api/ai-reply/[draftId]/regenerate/route");
    const req = makeReq("http://localhost:3000/api/ai-reply/abc/regenerate", {
      method: "POST",
      body: { instruction: "もっと丁寧に", sig: "s", exp: 0 },
    });
    const params = Promise.resolve({ draftId: "abc" });
    const res = await POST(req, { params });
    expect(res.status).toBe(400);
  });

  it("正常系: 再生成成功で新しい返信を返す", async () => {
    const { parseBody } = await import("@/lib/validations/helpers");
    (parseBody as any).mockResolvedValue({
      data: { instruction: "もっと丁寧に", sig: "valid", exp: 9999999999 },
    });

    const draftsChain = getOrCreateChain("ai_reply_drafts");
    draftsChain.then = vi.fn((resolve: any) =>
      resolve({
        data: {
          id: 1, patient_id: "P001", original_message: "質問",
          draft_reply: "元の返信", status: "pending", tenant_id: "test-tenant",
        },
        error: null,
      })
    );

    const settingsChain = getOrCreateChain("ai_reply_settings");
    settingsChain.then = vi.fn((resolve: any) =>
      resolve({ data: { knowledge_base: "", custom_instructions: "" }, error: null })
    );

    const { POST } = await import("@/app/api/ai-reply/[draftId]/regenerate/route");
    const req = makeReq("http://localhost:3000/api/ai-reply/1/regenerate", {
      method: "POST",
      body: { instruction: "もっと丁寧に", sig: "valid", exp: 9999999999 },
    });
    const params = Promise.resolve({ draftId: "1" });
    const res = await POST(req, { params });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.newReply).toBeDefined();
  });
});

// ============================================================
// 22. forms/[slug] (GET)
// ============================================================
describe("forms/[slug]", () => {
  it("フォーム未発見で404", async () => {
    const formsChain = getOrCreateChain("forms");
    formsChain.then = vi.fn((resolve: any) => resolve({ data: null, error: { message: "not found" } }));

    const { GET } = await import("@/app/api/forms/[slug]/route");
    const req = makeReq("http://localhost:3000/api/forms/test-form");
    const params = Promise.resolve({ slug: "test-form" });
    const res = await GET(req, { params });
    expect(res.status).toBe(404);
  });

  it("正常系: 公開フォーム情報を返す", async () => {
    const formsChain = getOrCreateChain("forms");
    formsChain.then = vi.fn((resolve: any) =>
      resolve({
        data: {
          id: 1, title: "テストフォーム", description: "説明",
          fields: [{ id: "q1", label: "質問1", type: "text" }],
          settings: {}, is_published: true, slug: "test-form",
        },
        error: null,
      })
    );

    const { GET } = await import("@/app/api/forms/[slug]/route");
    const req = makeReq("http://localhost:3000/api/forms/test-form");
    const params = Promise.resolve({ slug: "test-form" });
    const res = await GET(req, { params });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.form.title).toBe("テストフォーム");
  });
});

// ============================================================
// 23. forms/[slug]/submit (POST)
// ============================================================
describe("forms/[slug]/submit", () => {
  it("非公開フォームで403", async () => {
    const formsChain = getOrCreateChain("forms");
    formsChain.then = vi.fn((resolve: any) =>
      resolve({
        data: { id: 1, fields: [], settings: {}, is_published: false },
        error: null,
      })
    );

    const { POST } = await import("@/app/api/forms/[slug]/submit/route");
    const req = makeReq("http://localhost:3000/api/forms/test-form/submit", {
      method: "POST",
      body: { answers: {} },
    });
    const params = Promise.resolve({ slug: "test-form" });
    const res = await POST(req, { params });
    expect(res.status).toBe(403);
  });

  it("正常系: 回答送信成功", async () => {
    const { parseBody } = await import("@/lib/validations/helpers");
    (parseBody as any).mockResolvedValue({
      data: { answers: { q1: "回答" }, line_user_id: null, respondent_name: null },
    });

    const formsChain = getOrCreateChain("forms");
    formsChain.then = vi.fn((resolve: any) =>
      resolve({
        data: {
          id: 1,
          fields: [{ id: "q1", label: "質問1", type: "text" }],
          settings: {},
          is_published: true,
        },
        error: null,
      })
    );

    const responsesChain = getOrCreateChain("form_responses");
    responsesChain.then = vi.fn((resolve: any) =>
      resolve({ data: { id: "resp-1" }, error: null })
    );

    const { POST } = await import("@/app/api/forms/[slug]/submit/route");
    const req = makeReq("http://localhost:3000/api/forms/test-form/submit", {
      method: "POST",
      body: { answers: { q1: "回答" } },
    });
    const params = Promise.resolve({ slug: "test-form" });
    const res = await POST(req, { params });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
  });
});

// ============================================================
// 24. nps/[id]
// ============================================================
describe("nps/[id]", () => {
  it("GET: 調査未発見で404", async () => {
    const npsChain = getOrCreateChain("nps_surveys");
    npsChain.then = vi.fn((resolve: any) => resolve({ data: null, error: null }));

    const { GET } = await import("@/app/api/nps/[id]/route");
    const req = makeReq("http://localhost:3000/api/nps/999");
    const params = Promise.resolve({ id: "999" });
    const res = await GET(req, { params });
    expect(res.status).toBe(404);
  });

  it("GET: 正常系: 調査情報を返す", async () => {
    const npsChain = getOrCreateChain("nps_surveys");
    npsChain.then = vi.fn((resolve: any) =>
      resolve({
        data: {
          id: 1, title: "NPS調査", question_text: "お勧め度は？",
          comment_label: "コメント", thank_you_message: "ありがとうございます",
        },
        error: null,
      })
    );

    const { GET } = await import("@/app/api/nps/[id]/route");
    const req = makeReq("http://localhost:3000/api/nps/1");
    const params = Promise.resolve({ id: "1" });
    const res = await GET(req, { params });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.survey.title).toBe("NPS調査");
  });

  it("POST: 正常系: 回答送信成功", async () => {
    const { parseBody } = await import("@/lib/validations/helpers");
    (parseBody as any).mockResolvedValue({
      data: { score: 9, comment: "とても良い", patient_id: "P001" },
    });

    const npsChain = getOrCreateChain("nps_surveys");
    npsChain.then = vi.fn((resolve: any) =>
      resolve({ data: { id: 1 }, error: null })
    );

    const responsesChain = getOrCreateChain("nps_responses");
    responsesChain.then = vi.fn((resolve: any) =>
      resolve({ data: null, error: null })
    );

    const { POST } = await import("@/app/api/nps/[id]/route");
    const req = makeReq("http://localhost:3000/api/nps/1", {
      method: "POST",
      body: { score: 9, comment: "とても良い", patient_id: "P001" },
    });
    const params = Promise.resolve({ id: "1" });
    const res = await POST(req, { params });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
  });
});
