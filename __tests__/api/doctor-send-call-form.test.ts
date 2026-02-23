// __tests__/api/doctor-send-call-form.test.ts
// LINE通話フォーム送信 API (app/api/doctor/send-call-form/route.ts) のテスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- チェーンビルダー ---
function createChain(defaultResolve = { data: null, error: null }) {
  const chain: any = {};
  ["insert","update","delete","select","eq","neq","gt","gte","lt","lte",
   "in","is","not","order","limit","range","single","maybeSingle","upsert",
   "ilike","or","count","csv"].forEach(m => {
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

const {
  mockVerifyAdminAuth, mockPushMessage, mockBuildCallFormFlex, mockGetSettingOrEnv,
} = vi.hoisted(() => ({
  mockVerifyAdminAuth: vi.fn().mockResolvedValue(true),
  mockPushMessage: vi.fn().mockResolvedValue({ ok: true }),
  mockBuildCallFormFlex: vi.fn().mockResolvedValue({ type: "flex", altText: "通話フォーム", contents: { type: "bubble" } }),
  mockGetSettingOrEnv: vi.fn().mockResolvedValue("https://line.me/call/test"),
}));

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: vi.fn((table: string) => getOrCreateChain(table)) },
}));

vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: mockVerifyAdminAuth,
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((q: any) => q),
  tenantPayload: vi.fn(() => ({ tenantId: "test-tenant" })),
}));

vi.mock("@/lib/line-push", () => ({
  pushMessage: mockPushMessage,
}));

vi.mock("@/lib/call-form-flex", () => ({
  buildCallFormFlex: mockBuildCallFormFlex,
}));

vi.mock("@/lib/settings", () => ({
  getSettingOrEnv: mockGetSettingOrEnv,
}));

// --- ヘルパー ---
function createMockRequest(body: any) {
  return new Request("http://localhost/api/doctor/send-call-form", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as any;
}

import { POST } from "@/app/api/doctor/send-call-form/route";

describe("POST /api/doctor/send-call-form", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
    mockVerifyAdminAuth.mockResolvedValue(true);
    mockPushMessage.mockResolvedValue({ ok: true });
    mockGetSettingOrEnv.mockResolvedValue("https://line.me/call/test");
    mockBuildCallFormFlex.mockResolvedValue({
      type: "flex", altText: "通話フォーム", contents: { type: "bubble" },
    });
  });

  // -------------------------------------------
  // 認証テスト
  // -------------------------------------------
  it("認証失敗時は 401 を返す", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const req = createMockRequest({ patientId: "P001" });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  // -------------------------------------------
  // バリデーションテスト
  // -------------------------------------------
  it("patientId がない場合は 400 を返す", async () => {
    const req = createMockRequest({});
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("patientId が空文字の場合は 400 を返す", async () => {
    const req = createMockRequest({ patientId: "" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("不正なJSON の場合は 400 を返す", async () => {
    const req = new Request("http://localhost/api/doctor/send-call-form", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "INVALID_JSON",
    }) as any;
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  // -------------------------------------------
  // LINEコールURL未設定
  // -------------------------------------------
  it("LINEコールURLが未設定の場合は 400 を返す", async () => {
    mockGetSettingOrEnv.mockResolvedValue(null);
    const req = createMockRequest({ patientId: "P001" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("LINEコールURL");
  });

  // -------------------------------------------
  // 患者のLINE UIDが見つからない場合
  // -------------------------------------------
  it("LINE UIDが見つからない場合は 400 を返す", async () => {
    // patients テーブルから取得 → line_id なし
    // withTenant の後に .maybeSingle() が呼ばれる
    // withTenant は q をそのまま返し、その後 .maybeSingle() が呼ばれる
    const patientsChain = createChain({ data: null, error: null });
    tableChains["patients"] = patientsChain;

    const req = createMockRequest({ patientId: "P001" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("LINE UID");
  });

  it("患者の line_id が null の場合も 400 を返す", async () => {
    const patientsChain = createChain({ data: { line_id: null, name: "テスト" }, error: null });
    tableChains["patients"] = patientsChain;

    const req = createMockRequest({ patientId: "P001" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  // -------------------------------------------
  // LINE送信失敗
  // -------------------------------------------
  it("LINE送信に失敗した場合は 500 を返す", async () => {
    const patientsChain = createChain({ data: { line_id: "U_LINE_001", name: "テスト太郎" }, error: null });
    tableChains["patients"] = patientsChain;

    mockPushMessage.mockResolvedValue({ ok: false, status: 400 });

    const req = createMockRequest({ patientId: "P001" });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toContain("LINE送信");
  });

  // -------------------------------------------
  // 正常系テスト
  // -------------------------------------------
  it("正常にFlexメッセージを送信して 200 を返す", async () => {
    const patientsChain = createChain({ data: { line_id: "U_LINE_001", name: "テスト太郎" }, error: null });
    tableChains["patients"] = patientsChain;
    // message_log のinsertも成功
    tableChains["message_log"] = createChain();

    const req = createMockRequest({ patientId: "P001" });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("正常時に pushMessage が正しい引数で呼ばれる", async () => {
    const patientsChain = createChain({ data: { line_id: "U_LINE_001", name: "テスト太郎" }, error: null });
    tableChains["patients"] = patientsChain;
    tableChains["message_log"] = createChain();

    const req = createMockRequest({ patientId: "P001" });
    await POST(req);

    expect(mockPushMessage).toHaveBeenCalledWith(
      "U_LINE_001",
      expect.arrayContaining([expect.objectContaining({ type: "flex" })]),
      "test-tenant"
    );
  });

  it("正常時に buildCallFormFlex が呼ばれる", async () => {
    const patientsChain = createChain({ data: { line_id: "U_LINE_001", name: "テスト太郎" }, error: null });
    tableChains["patients"] = patientsChain;
    tableChains["message_log"] = createChain();

    const req = createMockRequest({ patientId: "P001" });
    await POST(req);

    expect(mockBuildCallFormFlex).toHaveBeenCalledWith("https://line.me/call/test", "test-tenant");
  });

  // -------------------------------------------
  // reserveId あり → call_status 更新
  // -------------------------------------------
  it("reserveId がある場合は intake の call_status を更新する", async () => {
    const patientsChain = createChain({ data: { line_id: "U_LINE_001", name: "テスト太郎" }, error: null });
    tableChains["patients"] = patientsChain;
    tableChains["message_log"] = createChain();

    const intakeChain = createChain();
    tableChains["intake"] = intakeChain;

    const req = createMockRequest({ patientId: "P001", reserveId: "R001" });
    const res = await POST(req);
    expect(res.status).toBe(200);

    // intake の update が call_status: "call_form_sent" で呼ばれたか確認
    expect(intakeChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ call_status: "call_form_sent" })
    );
  });

  it("reserveId がない場合は intake を更新しない", async () => {
    const patientsChain = createChain({ data: { line_id: "U_LINE_001", name: "テスト太郎" }, error: null });
    tableChains["patients"] = patientsChain;
    tableChains["message_log"] = createChain();
    tableChains["intake"] = createChain();

    const req = createMockRequest({ patientId: "P001" });
    const res = await POST(req);
    expect(res.status).toBe(200);

    // intake の update は呼ばれない
    expect(tableChains["intake"].update).not.toHaveBeenCalled();
  });
});
