// __tests__/api/doctor-callstatus.test.ts
// 通話ステータス更新 API (app/api/doctor/callstatus/route.ts) のテスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- チェーンビルダー ---
function createChain(defaultResolve = { data: null, error: null }) {
  const chain: Record<string, unknown> = {};
  ["insert","update","delete","select","eq","neq","gt","gte","lt","lte",
   "in","is","not","order","limit","range","single","maybeSingle","upsert",
   "ilike","or","count","csv"].forEach(m => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = vi.fn((resolve: (value: unknown) => unknown) => resolve(defaultResolve));
  return chain;
}

let tableChains: Record<string, ReturnType<typeof createChain>> = {};
function getOrCreateChain(table: string) {
  if (!tableChains[table]) tableChains[table] = createChain();
  return tableChains[table];
}

const { mockVerifyDoctorAuth, mockGetBusinessRules, mockPushMessage } = vi.hoisted(() => ({
  mockVerifyDoctorAuth: vi.fn().mockResolvedValue(true),
  mockGetBusinessRules: vi.fn().mockResolvedValue({ notifyNoAnswer: false }),
  mockPushMessage: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: vi.fn((table: string) => getOrCreateChain(table)) },
}));

vi.mock("@/lib/admin-auth", () => ({
  verifyDoctorAuth: mockVerifyDoctorAuth,
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  resolveTenantIdOrThrow: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((q: unknown) => q),
  strictWithTenant: vi.fn((q: unknown) => q),
  tenantPayload: vi.fn(() => ({ tenantId: "test-tenant" })),
}));

vi.mock("@/lib/business-rules", () => ({
  getBusinessRules: mockGetBusinessRules,
  DEFAULT_NO_ANSWER_MESSAGE: "不通テストメッセージ",
}));

vi.mock("@/lib/line-push", () => ({
  pushMessage: mockPushMessage,
}));

// --- ヘルパー ---
function createMockRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/doctor/callstatus", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

import { POST } from "@/app/api/doctor/callstatus/route";

describe("POST /api/doctor/callstatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
    mockVerifyDoctorAuth.mockResolvedValue(true);
    mockGetBusinessRules.mockResolvedValue({ notifyNoAnswer: false });
    mockPushMessage.mockResolvedValue({ ok: true });
  });

  // -------------------------------------------
  // 認証テスト
  // -------------------------------------------
  it("認証失敗時は 401 を返す", async () => {
    mockVerifyDoctorAuth.mockResolvedValue(false);
    const req = createMockRequest({ reserveId: "R001", callStatus: "calling" });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("UNAUTHORIZED");
  });

  // -------------------------------------------
  // バリデーションテスト
  // -------------------------------------------
  it("reserveId がない場合は 400 を返す", async () => {
    const req = createMockRequest({ callStatus: "calling" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("reserveId が空文字の場合は 400 を返す", async () => {
    const req = createMockRequest({ reserveId: "", callStatus: "calling" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("不正なJSON の場合は 400 を返す", async () => {
    const req = new Request("http://localhost/api/doctor/callstatus", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "INVALID_JSON",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  // -------------------------------------------
  // DB更新エラー
  // -------------------------------------------
  it("DB更新エラー時は 500 を返す", async () => {
    tableChains["intake"] = createChain({ data: null, error: { message: "DB error" } });

    const req = createMockRequest({ reserveId: "R001", callStatus: "calling" });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("DB_ERROR");
  });

  // -------------------------------------------
  // 正常系テスト
  // -------------------------------------------
  it("正常に call_status を更新して 200 を返す", async () => {
    tableChains["intake"] = createChain({ data: null, error: null });

    const req = createMockRequest({ reserveId: "R001", callStatus: "calling" });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.updated_at).toBeDefined();
  });

  it("callStatus が空でもデフォルト値で更新できる", async () => {
    tableChains["intake"] = createChain({ data: null, error: null });

    const req = createMockRequest({ reserveId: "R001" });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("intake の update が正しい引数で呼ばれる", async () => {
    const intakeChain = createChain({ data: null, error: null });
    tableChains["intake"] = intakeChain;

    const req = createMockRequest({ reserveId: "R001", callStatus: "completed" });
    await POST(req);

    // update が call_status と call_status_updated_at で呼ばれる
    expect(intakeChain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        call_status: "completed",
        call_status_updated_at: expect.any(String),
      })
    );
    // eq が reserve_id で呼ばれる
    expect(intakeChain.eq).toHaveBeenCalledWith("reserve_id", "R001");
  });

  it("reserveId の前後の空白が trim される", async () => {
    const intakeChain = createChain({ data: null, error: null });
    tableChains["intake"] = intakeChain;

    const req = createMockRequest({ reserveId: "  R001  ", callStatus: "calling" });
    await POST(req);

    expect(intakeChain.eq).toHaveBeenCalledWith("reserve_id", "R001");
  });

  it("callStatus の前後の空白が trim される", async () => {
    const intakeChain = createChain({ data: null, error: null });
    tableChains["intake"] = intakeChain;

    const req = createMockRequest({ reserveId: "R001", callStatus: "  calling  " });
    await POST(req);

    expect(intakeChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ call_status: "calling" })
    );
  });

  // -------------------------------------------
  // intake_XXX 形式の reserveId テスト
  // -------------------------------------------
  it("intake_ 形式の reserveId で id ベースの更新になる", async () => {
    const intakeChain = createChain({ data: null, error: null });
    tableChains["intake"] = intakeChain;

    const req = createMockRequest({ reserveId: "intake_12345", callStatus: "calling" });
    const res = await POST(req);
    expect(res.status).toBe(200);

    // eq が "id" で呼ばれる（reserve_id ではなく）
    expect(intakeChain.eq).toHaveBeenCalledWith("id", "12345");
  });

  // -------------------------------------------
  // no_answer 自動通知テスト
  // -------------------------------------------
  it("callStatus=no_answer で notifyNoAnswer=true の場合、LINE通知が送信される", async () => {
    mockGetBusinessRules.mockResolvedValue({
      notifyNoAnswer: true,
      noAnswerMessage: "カスタム不通メッセージ",
    });

    const { supabaseAdmin } = await import("@/lib/supabase");
    let fromCallCount = 0;
    vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
      fromCallCount++;
      if (fromCallCount === 1) {
        // 最初の intake update（call_status 更新）
        return createChain({ data: null, error: null });
      }
      if (table === "intake") {
        // intake からの patient_id 取得 / no_answer_sent 更新
        const chain = createChain({ data: [{ patient_id: "P001" }], error: null });
        // .then のモック: 配列 → 最初の要素を取得するロジックに対応
        chain.then = vi.fn((resolve: (val: unknown) => unknown) =>
          resolve({ data: [{ patient_id: "P001" }], error: null })
        );
        return chain;
      }
      if (table === "patients") {
        const chain = createChain({ data: [{ line_id: "U_LINE_001" }], error: null });
        chain.then = vi.fn((resolve: (val: unknown) => unknown) =>
          resolve({ data: [{ line_id: "U_LINE_001" }], error: null })
        );
        return chain;
      }
      if (table === "message_log") {
        return createChain({ data: null, error: null });
      }
      if (table === "mark_definitions") {
        return createChain({ data: { value: "futsu" }, error: null });
      }
      if (table === "patient_marks") {
        return createChain({ data: null, error: null });
      }
      return getOrCreateChain(table);
    });

    const req = createMockRequest({ reserveId: "R001", callStatus: "no_answer" });
    const res = await POST(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.notifySent).toBe(true);
    expect(mockPushMessage).toHaveBeenCalledWith(
      "U_LINE_001",
      [{ type: "text", text: "カスタム不通メッセージ" }],
      "test-tenant"
    );
  });

  it("callStatus=no_answer で notifyNoAnswer=false の場合、LINE通知は送信されない", async () => {
    mockGetBusinessRules.mockResolvedValue({ notifyNoAnswer: false });

    tableChains["intake"] = createChain({ data: null, error: null });

    const req = createMockRequest({ reserveId: "R001", callStatus: "no_answer" });
    const res = await POST(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.notifySent).toBe(false);
    expect(mockPushMessage).not.toHaveBeenCalled();
  });

  it("callStatus が no_answer 以外の場合は通知処理をスキップする", async () => {
    tableChains["intake"] = createChain({ data: null, error: null });

    const req = createMockRequest({ reserveId: "R001", callStatus: "completed" });
    const res = await POST(req);
    const json = await res.json();
    expect(json.notifySent).toBe(false);
    expect(mockGetBusinessRules).not.toHaveBeenCalled();
  });

  it("no_answer通知でLINE送信失敗時は notifySent=false", async () => {
    mockGetBusinessRules.mockResolvedValue({ notifyNoAnswer: true });
    mockPushMessage.mockResolvedValue({ ok: false });

    const { supabaseAdmin } = await import("@/lib/supabase");
    let fromCallCount = 0;
    vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
      fromCallCount++;
      if (fromCallCount === 1) {
        return createChain({ data: null, error: null });
      }
      if (table === "intake") {
        const chain = createChain({ data: [{ patient_id: "P001" }], error: null });
        chain.then = vi.fn((resolve: (val: unknown) => unknown) =>
          resolve({ data: [{ patient_id: "P001" }], error: null })
        );
        return chain;
      }
      if (table === "patients") {
        const chain = createChain({ data: [{ line_id: "U_LINE_001" }], error: null });
        chain.then = vi.fn((resolve: (val: unknown) => unknown) =>
          resolve({ data: [{ line_id: "U_LINE_001" }], error: null })
        );
        return chain;
      }
      if (table === "message_log") {
        return createChain({ data: null, error: null });
      }
      return getOrCreateChain(table);
    });

    const req = createMockRequest({ reserveId: "R001", callStatus: "no_answer" });
    const res = await POST(req);
    const json = await res.json();
    expect(json.notifySent).toBe(false);
  });
});
