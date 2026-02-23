// __tests__/api/admin-line-misc.test.ts
// LINE関連小型APIルートの統合テスト
// 対象: friends-list, reminder-rules, coupons, keyword-replies,
//        ai-reply-settings, send, actions, marks, followers, nps

import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================
// 共通モック
// ============================================================

function createChain(defaultResolve = { data: null, error: null }) {
  const chain: any = {};
  [
    "insert", "update", "delete", "select", "eq", "neq", "gt", "gte", "lt", "lte",
    "in", "is", "not", "order", "limit", "range", "single", "maybeSingle", "upsert",
    "ilike", "or", "count", "csv", "head",
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

const mockVerifyAdminAuth = vi.fn();
const mockPushMessage = vi.fn();
const mockHandleImplicitAiFeedback = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => getOrCreateChain(table)),
    rpc: vi.fn(() => createChain({ data: [], error: null })),
  },
}));

vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: (...args: any[]) => mockVerifyAdminAuth(...args),
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((query: any) => query),
  tenantPayload: vi.fn((tid: any) => (tid ? { tenant_id: tid } : {})),
}));

vi.mock("@/lib/line-push", () => ({
  pushMessage: (...args: any[]) => mockPushMessage(...args),
}));

vi.mock("@/lib/ai-reply", () => ({
  handleImplicitAiFeedback: (...args: any[]) => mockHandleImplicitAiFeedback(...args),
}));

vi.mock("@/lib/settings", () => ({
  getSetting: vi.fn(() => null),
  getSettingOrEnv: vi.fn(() => "mock-line-token"),
}));

// fetch をグローバルモック
vi.stubGlobal("fetch", vi.fn());

// NextRequest互換のモック生成
function createReq(method: string, url: string, body?: any) {
  const req = new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }) as any;
  req.nextUrl = new URL(url);
  return req;
}

// ============================================================
// テスト対象ルートのインポート
// ============================================================

import { GET as friendsListGET } from "@/app/api/admin/line/friends-list/route";
import { GET as reminderRulesGET, POST as reminderRulesPOST, DELETE as reminderRulesDELETE } from "@/app/api/admin/line/reminder-rules/route";
import { GET as couponsGET, POST as couponsPOST, DELETE as couponsDELETE } from "@/app/api/admin/line/coupons/route";
import { GET as keywordRepliesGET, POST as keywordRepliesPOST, DELETE as keywordRepliesDELETE } from "@/app/api/admin/line/keyword-replies/route";
import { GET as aiReplySettingsGET, PUT as aiReplySettingsPUT } from "@/app/api/admin/line/ai-reply-settings/route";
import { POST as lineSendPOST } from "@/app/api/admin/line/send/route";
import { GET as actionsGET, POST as actionsPOST, DELETE as actionsDELETE } from "@/app/api/admin/line/actions/route";
import { GET as marksGET, POST as marksPOST } from "@/app/api/admin/line/marks/route";
import { GET as followersGET } from "@/app/api/admin/line/followers/route";
import { GET as npsGET, POST as npsPOST, DELETE as npsDELETE } from "@/app/api/admin/line/nps/route";

// ============================================================
// beforeEach
// ============================================================
beforeEach(() => {
  vi.clearAllMocks();
  tableChains = {};
  mockVerifyAdminAuth.mockResolvedValue(true);
  mockPushMessage.mockResolvedValue({ ok: true });
  mockHandleImplicitAiFeedback.mockResolvedValue(undefined);
});

// ============================================================
// 1. friends-list
// ============================================================
describe("friends-list API", () => {
  it("認証失敗 → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const res = await friendsListGET(createReq("GET", "http://localhost/api/admin/line/friends-list"));
    expect(res.status).toBe(401);
  });

  it("GET 正常系 → 友達一覧を返す", async () => {
    // intake
    const intakeChain = getOrCreateChain("intake");
    intakeChain.then = vi.fn((resolve: any) => resolve({ data: [], error: null }));
    // patients
    const patientsChain = getOrCreateChain("patients");
    patientsChain.then = vi.fn((resolve: any) => resolve({ data: [], error: null }));
    // patient_marks
    const marksChain = getOrCreateChain("patient_marks");
    marksChain.then = vi.fn((resolve: any) => resolve({ data: [], error: null }));
    // rpc結果
    const { supabaseAdmin } = await import("@/lib/supabase");
    (supabaseAdmin.rpc as any).mockReturnValue(
      Promise.resolve({ data: [], error: null }),
    );

    const res = await friendsListGET(createReq("GET", "http://localhost/api/admin/line/friends-list"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.patients).toBeDefined();
    expect(Array.isArray(json.patients)).toBe(true);
  });
});

// ============================================================
// 2. reminder-rules
// ============================================================
describe("reminder-rules API", () => {
  it("認証失敗 → 401 (GET)", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const res = await reminderRulesGET(createReq("GET", "http://localhost/api/admin/line/reminder-rules"));
    expect(res.status).toBe(401);
  });

  it("GET 正常系 → ルール一覧を返す", async () => {
    const rulesChain = getOrCreateChain("reminder_rules");
    rulesChain.then = vi.fn((resolve: any) => resolve({ data: [], error: null }));

    const res = await reminderRulesGET(createReq("GET", "http://localhost/api/admin/line/reminder-rules"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.rules).toBeDefined();
  });

  it("POST 正常系 → ルール作成成功", async () => {
    const rulesChain = getOrCreateChain("reminder_rules");
    rulesChain.then = vi.fn((resolve: any) => resolve({
      data: { id: 1, name: "テストルール" },
      error: null,
    }));

    const res = await reminderRulesPOST(
      createReq("POST", "http://localhost/api/admin/line/reminder-rules", {
        name: "テストルール",
        message_template: "予約のご確認です",
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("DELETE id未指定 → 400", async () => {
    const res = await reminderRulesDELETE(
      createReq("DELETE", "http://localhost/api/admin/line/reminder-rules"),
    );
    expect(res.status).toBe(400);
  });

  it("DELETE 正常系 → 削除成功", async () => {
    const rulesChain = getOrCreateChain("reminder_rules");
    rulesChain.then = vi.fn((resolve: any) => resolve({ data: null, error: null }));

    const res = await reminderRulesDELETE(
      createReq("DELETE", "http://localhost/api/admin/line/reminder-rules?id=1"),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});

// ============================================================
// 3. coupons
// ============================================================
describe("coupons API", () => {
  it("認証失敗 → 401 (GET)", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const res = await couponsGET(createReq("GET", "http://localhost/api/admin/line/coupons"));
    expect(res.status).toBe(401);
  });

  it("GET 正常系 → クーポン一覧を返す", async () => {
    const couponsChain = getOrCreateChain("coupons");
    couponsChain.then = vi.fn((resolve: any) => resolve({ data: [], error: null }));

    const res = await couponsGET(createReq("GET", "http://localhost/api/admin/line/coupons"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.coupons).toBeDefined();
  });

  it("POST 正常系 → クーポン作成成功", async () => {
    const couponsChain = getOrCreateChain("coupons");
    couponsChain.then = vi.fn((resolve: any) => resolve({
      data: { id: 1, name: "テストクーポン", code: "TEST01" },
      error: null,
    }));

    const res = await couponsPOST(
      createReq("POST", "http://localhost/api/admin/line/coupons", {
        name: "テストクーポン",
        code: "TEST01",
        discount_type: "fixed",
        discount_value: 1000,
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.coupon).toBeDefined();
  });

  it("POST コード重複 → 400", async () => {
    const couponsChain = getOrCreateChain("coupons");
    couponsChain.then = vi.fn((resolve: any) => resolve({
      data: [{ id: 1 }],
      error: null,
    }));

    const res = await couponsPOST(
      createReq("POST", "http://localhost/api/admin/line/coupons", {
        name: "重複クーポン",
        code: "EXISTING",
        discount_value: 500,
      }),
    );
    expect(res.status).toBe(400);
  });

  it("DELETE 正常系 → 削除成功", async () => {
    const couponsChain = getOrCreateChain("coupons");
    couponsChain.then = vi.fn((resolve: any) => resolve({ data: null, error: null }));

    const res = await couponsDELETE(
      createReq("DELETE", "http://localhost/api/admin/line/coupons?id=1"),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});

// ============================================================
// 4. keyword-replies
// ============================================================
describe("keyword-replies API", () => {
  it("認証失敗 → 401 (GET)", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const res = await keywordRepliesGET(createReq("GET", "http://localhost/api/admin/line/keyword-replies"));
    expect(res.status).toBe(401);
  });

  it("GET 正常系 → ルール一覧を返す", async () => {
    const chain = getOrCreateChain("keyword_auto_replies");
    chain.then = vi.fn((resolve: any) => resolve({ data: [], error: null }));

    const res = await keywordRepliesGET(createReq("GET", "http://localhost/api/admin/line/keyword-replies"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.rules).toBeDefined();
  });

  it("POST 正常系 → ルール作成成功", async () => {
    const chain = getOrCreateChain("keyword_auto_replies");
    chain.then = vi.fn((resolve: any) => resolve({
      data: { id: 1, name: "テストルール", keyword: "予約" },
      error: null,
    }));

    const res = await keywordRepliesPOST(
      createReq("POST", "http://localhost/api/admin/line/keyword-replies", {
        name: "テストルール",
        keyword: "予約",
        reply_text: "ご予約はこちらです",
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("POST 不正な正規表現 → 400", async () => {
    const res = await keywordRepliesPOST(
      createReq("POST", "http://localhost/api/admin/line/keyword-replies", {
        name: "不正regex",
        keyword: "[invalid(",
        match_type: "regex",
        reply_text: "テスト",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("DELETE 正常系 → 削除成功", async () => {
    const chain = getOrCreateChain("keyword_auto_replies");
    chain.then = vi.fn((resolve: any) => resolve({ data: null, error: null }));

    const res = await keywordRepliesDELETE(
      createReq("DELETE", "http://localhost/api/admin/line/keyword-replies?id=1"),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});

// ============================================================
// 5. ai-reply-settings
// ============================================================
describe("ai-reply-settings API", () => {
  it("認証失敗 → 401 (GET)", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const res = await aiReplySettingsGET(createReq("GET", "http://localhost/api/admin/line/ai-reply-settings"));
    expect(res.status).toBe(401);
  });

  it("GET 正常系 → 設定なしの場合デフォルト値を返す", async () => {
    const settingsChain = getOrCreateChain("ai_reply_settings");
    settingsChain.then = vi.fn((resolve: any) => resolve({ data: null, error: null }));

    const draftsChain = getOrCreateChain("ai_reply_drafts");
    draftsChain.then = vi.fn((resolve: any) => resolve({ count: 0, error: null }));

    const res = await aiReplySettingsGET(createReq("GET", "http://localhost/api/admin/line/ai-reply-settings"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.settings).toBeDefined();
    expect(json.settings.is_enabled).toBe(false);
    expect(json.todayUsage).toBe(0);
  });

  it("PUT 正常系（新規作成） → 設定保存成功", async () => {
    // 既存設定なし
    const settingsChain = getOrCreateChain("ai_reply_settings");
    settingsChain.then = vi.fn((resolve: any) => resolve({
      data: { id: 1, is_enabled: true },
      error: null,
    }));

    const res = await aiReplySettingsPUT(
      createReq("PUT", "http://localhost/api/admin/line/ai-reply-settings", {
        is_enabled: true,
        mode: "auto",
        daily_limit: 50,
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});

// ============================================================
// 6. send
// ============================================================
describe("line/send API", () => {
  it("認証失敗 → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const res = await lineSendPOST(
      createReq("POST", "http://localhost/api/admin/line/send", {
        patient_id: "p1",
        message: "テスト",
      }),
    );
    expect(res.status).toBe(401);
  });

  it("POST 正常系 → テキストメッセージ送信成功", async () => {
    // patients取得
    const patientsChain = getOrCreateChain("patients");
    patientsChain.then = vi.fn((resolve: any) => resolve({
      data: { name: "テスト患者", line_id: "U1234567890" },
      error: null,
    }));

    // reservations（次回予約）
    const reservationsChain = getOrCreateChain("reservations");
    reservationsChain.then = vi.fn((resolve: any) => resolve({
      data: null,
      error: null,
    }));

    // message_log insert
    const msgLogChain = getOrCreateChain("message_log");
    msgLogChain.then = vi.fn((resolve: any) => resolve({ data: null, error: null }));

    mockPushMessage.mockResolvedValue({ ok: true });

    const res = await lineSendPOST(
      createReq("POST", "http://localhost/api/admin/line/send", {
        patient_id: "p1",
        message: "テストメッセージ",
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.status).toBe("sent");
  });

  it("POST LINE UID未登録 → 400", async () => {
    const patientsChain = getOrCreateChain("patients");
    patientsChain.then = vi.fn((resolve: any) => resolve({
      data: { name: "テスト患者", line_id: null },
      error: null,
    }));

    const msgLogChain = getOrCreateChain("message_log");
    msgLogChain.then = vi.fn((resolve: any) => resolve({ data: null, error: null }));

    const res = await lineSendPOST(
      createReq("POST", "http://localhost/api/admin/line/send", {
        patient_id: "p1",
        message: "テスト",
      }),
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.status).toBe("no_uid");
  });
});

// ============================================================
// 7. actions
// ============================================================
describe("actions API", () => {
  it("認証失敗 → 401 (GET)", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const res = await actionsGET(createReq("GET", "http://localhost/api/admin/line/actions"));
    expect(res.status).toBe(401);
  });

  it("GET 正常系 → アクション一覧を返す", async () => {
    const chain = getOrCreateChain("actions");
    chain.then = vi.fn((resolve: any) => resolve({ data: [], error: null }));

    const res = await actionsGET(createReq("GET", "http://localhost/api/admin/line/actions"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.actions).toBeDefined();
  });

  it("POST 正常系 → アクション作成成功", async () => {
    const chain = getOrCreateChain("actions");
    chain.then = vi.fn((resolve: any) => resolve({
      data: { id: 1, name: "テストアクション" },
      error: null,
    }));

    const res = await actionsPOST(
      createReq("POST", "http://localhost/api/admin/line/actions", {
        name: "テストアクション",
        steps: [{ type: "send_message", message: "Hello" }],
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.action).toBeDefined();
  });

  it("DELETE id未指定 → 400", async () => {
    const res = await actionsDELETE(
      createReq("DELETE", "http://localhost/api/admin/line/actions"),
    );
    expect(res.status).toBe(400);
  });

  it("DELETE 正常系 → 削除成功", async () => {
    const chain = getOrCreateChain("actions");
    chain.then = vi.fn((resolve: any) => resolve({ data: null, error: null }));

    const res = await actionsDELETE(
      createReq("DELETE", "http://localhost/api/admin/line/actions?id=1"),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});

// ============================================================
// 8. marks
// ============================================================
describe("marks API", () => {
  it("認証失敗 → 401 (GET)", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const res = await marksGET(createReq("GET", "http://localhost/api/admin/line/marks"));
    expect(res.status).toBe(401);
  });

  it("GET 正常系 → マーク定義一覧を返す", async () => {
    const markDefChain = getOrCreateChain("mark_definitions");
    markDefChain.then = vi.fn((resolve: any) => resolve({ data: [], error: null }));

    const intakeChain = getOrCreateChain("intake");
    intakeChain.then = vi.fn((resolve: any) => resolve({ count: 0, error: null }));

    const res = await marksGET(createReq("GET", "http://localhost/api/admin/line/marks"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.marks).toBeDefined();
  });

  it("POST 正常系 → マーク作成成功", async () => {
    // max sort_order 取得
    const markDefChain = getOrCreateChain("mark_definitions");
    markDefChain.then = vi.fn((resolve: any) => resolve({
      data: { sort_order: 5, value: "custom_test", label: "テストマーク" },
      error: null,
    }));

    const res = await marksPOST(
      createReq("POST", "http://localhost/api/admin/line/marks", {
        label: "テストマーク",
        color: "#FF0000",
        icon: "★",
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.mark).toBeDefined();
  });
});

// ============================================================
// 9. followers
// ============================================================
describe("followers API", () => {
  it("認証失敗 → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const res = await followersGET(createReq("GET", "http://localhost/api/admin/line/followers"));
    expect(res.status).toBe(401);
  });

  it("GET 正常系 → フォロワー統計を返す", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        status: "ready",
        followers: 500,
        targetedReaches: 400,
        blocks: 20,
      }),
      text: () => Promise.resolve(""),
    });
    vi.stubGlobal("fetch", mockFetch);

    const res = await followersGET(createReq("GET", "http://localhost/api/admin/line/followers"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.followers).toBe(500);
    expect(json.targetedReaches).toBe(400);
    expect(json.blocks).toBe(20);
  });

  it("GET LINE APIエラー → エラーステータスを返す", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      text: () => Promise.resolve("Forbidden"),
    });
    vi.stubGlobal("fetch", mockFetch);

    const res = await followersGET(createReq("GET", "http://localhost/api/admin/line/followers"));
    expect(res.status).toBe(403);
  });

  it("GET 統計未準備 → 503", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: "unready" }),
      text: () => Promise.resolve(""),
    });
    vi.stubGlobal("fetch", mockFetch);

    const res = await followersGET(createReq("GET", "http://localhost/api/admin/line/followers"));
    expect(res.status).toBe(503);
  });
});

// ============================================================
// 10. nps
// ============================================================
describe("nps API", () => {
  it("認証失敗 → 401 (GET)", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const res = await npsGET(createReq("GET", "http://localhost/api/admin/line/nps"));
    expect(res.status).toBe(401);
  });

  it("GET 正常系 → 調査一覧を返す", async () => {
    const chain = getOrCreateChain("nps_surveys");
    chain.then = vi.fn((resolve: any) => resolve({ data: [], error: null }));

    const res = await npsGET(createReq("GET", "http://localhost/api/admin/line/nps"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.surveys).toBeDefined();
  });

  it("POST 正常系 → 調査作成成功", async () => {
    const chain = getOrCreateChain("nps_surveys");
    chain.then = vi.fn((resolve: any) => resolve({
      data: { id: 1, title: "テスト調査" },
      error: null,
    }));

    const res = await npsPOST(
      createReq("POST", "http://localhost/api/admin/line/nps", {
        title: "テスト調査",
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.survey).toBeDefined();
  });

  it("DELETE id未指定 → 400", async () => {
    const res = await npsDELETE(
      createReq("DELETE", "http://localhost/api/admin/line/nps"),
    );
    expect(res.status).toBe(400);
  });

  it("DELETE 正常系 → 削除成功", async () => {
    const chain = getOrCreateChain("nps_surveys");
    chain.then = vi.fn((resolve: any) => resolve({ data: null, error: null }));

    const res = await npsDELETE(
      createReq("DELETE", "http://localhost/api/admin/line/nps?id=1"),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});
