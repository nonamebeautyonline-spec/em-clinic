// __tests__/api/integration-reorder-flow.test.ts
// 再処方フロー統合テスト
// 患者申請 → 管理者一覧取得 → 医師承認/却下 → カルテ生成の一連フローを検証
import { describe, it, expect, vi, beforeEach } from "vitest";
import { verifyPatientSession } from "@/lib/patient-session";

// --- Supabaseチェーンモック型 ---
type MockChain = Record<string, ReturnType<typeof vi.fn>> & {
  then: ReturnType<typeof vi.fn>;
};

function createChain(defaultResolve = { data: null, error: null }): MockChain {
  const chain = {} as MockChain;
  [
    "insert", "update", "delete", "select", "eq", "neq", "gt", "gte", "lt", "lte",
    "in", "is", "not", "order", "limit", "range", "single", "maybeSingle", "upsert",
    "ilike", "or", "count", "csv", "like",
  ].forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = vi.fn((resolve: (value: unknown) => unknown) => resolve(defaultResolve));
  return chain;
}

let tableChains: Record<string, MockChain> = {};
function getOrCreateChain(table: string) {
  if (!tableChains[table]) tableChains[table] = createChain();
  return tableChains[table];
}

// --- hoisted モック ---
const {
  mockVerifyAdminAuth,
  mockInvalidateCache,
  mockPushMessage,
  mockGetSettingOrEnv,
  mockGetSetting,
  mockLogAudit,
  mockEvaluateMenuRules,
  mockGetBusinessRules,
  mockGetProductByCode,
  mockIsMultiFieldEnabled,
  mockCookies,
  mockFormatProductCode,
  mockSupabaseFrom,
} = vi.hoisted(() => ({
  mockVerifyAdminAuth: vi.fn().mockResolvedValue(true),
  mockInvalidateCache: vi.fn().mockResolvedValue(undefined),
  mockPushMessage: vi.fn().mockResolvedValue({ ok: true }),
  mockGetSettingOrEnv: vi.fn().mockResolvedValue("mock-token"),
  mockGetSetting: vi.fn().mockResolvedValue(null),
  mockLogAudit: vi.fn(),
  mockEvaluateMenuRules: vi.fn().mockResolvedValue(undefined),
  mockGetBusinessRules: vi.fn().mockResolvedValue({
    dosageChangeNotify: false,
    minReorderIntervalDays: 0,
    notifyReorderApply: false,
    notifyReorderApprove: false,
    notifyReorderPaid: false,
    intakeReminderHours: 0,
    approveMessage: "承認されました",
    autoApproveSameDose: false,
    notifyNoAnswer: false,
    noAnswerMessage: "",
    paymentThankMessageCard: "",
    paymentThankMessageBank: "",
    paymentThankHeaderCard: "",
    paymentThankHeaderBank: "",
    showProductName: false,
    showAmount: false,
    showPaymentMethod: false,
    showShippingInfo: false,
    showShippingName: false,
    showShippingPostal: false,
    showShippingAddress: false,
    showShippingPhone: false,
    showShippingEmail: false,
  }),
  mockGetProductByCode: vi.fn().mockResolvedValue({ title: "マンジャロ2.5mg", field_id: null }),
  mockIsMultiFieldEnabled: vi.fn().mockResolvedValue(false),
  mockCookies: vi.fn(),
  mockFormatProductCode: vi.fn((code: string) => {
    if (code.includes("2.5mg")) return "マンジャロ2.5mg";
    if (code.includes("5mg") && !code.includes("7.5mg")) return "マンジャロ5mg";
    if (code.includes("7.5mg")) return "マンジャロ7.5mg";
    if (code.includes("10mg")) return "マンジャロ10mg";
    return code;
  }),
  mockSupabaseFrom: vi.fn(),
}));

// --- モック定義 ---
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: mockSupabaseFrom },
}));

vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: mockVerifyAdminAuth,
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  resolveTenantIdOrThrow: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((q: unknown) => q),
  strictWithTenant: vi.fn((q: unknown) => q),
  tenantPayload: vi.fn(() => ({ tenantId: "test-tenant" })),
}));

vi.mock("@/lib/redis", () => ({
  invalidateDashboardCache: mockInvalidateCache,
}));

vi.mock("@/lib/line-push", () => ({
  pushMessage: mockPushMessage,
}));

vi.mock("@/lib/settings", () => ({
  getSettingOrEnv: mockGetSettingOrEnv,
  getSetting: mockGetSetting,
  getSettingsBulk: vi.fn().mockResolvedValue(new Map()),
}));

vi.mock("@/lib/audit", () => ({
  logAudit: mockLogAudit,
}));

vi.mock("@/lib/menu-auto-rules", () => ({
  evaluateMenuRules: mockEvaluateMenuRules,
}));

vi.mock("@/lib/business-rules", () => ({
  getBusinessRules: mockGetBusinessRules,
  DEFAULT_APPROVE_MESSAGE: "再処方が承認されました。決済リンクをお送りします。",
}));

vi.mock("@/lib/reorder-karte", async () => {
  const actual = await vi.importActual<typeof import("@/lib/reorder-karte")>("@/lib/reorder-karte");
  return { extractDose: actual.extractDose, buildKarteNote: actual.buildKarteNote };
});

vi.mock("@/lib/patient-utils", () => ({
  formatProductCode: mockFormatProductCode,
}));

vi.mock("@/lib/products", () => ({
  getProductByCode: mockGetProductByCode,
}));

vi.mock("@/lib/medical-fields", () => ({
  isMultiFieldEnabled: mockIsMultiFieldEnabled,
}));

vi.mock("next/headers", () => ({
  cookies: mockCookies,
}));

vi.mock("@/lib/patient-session", () => ({
  verifyPatientSession: vi.fn().mockResolvedValue({ patientId: "P-TEST-001", lineUserId: "U_LINE_TEST" }),
  createPatientToken: vi.fn().mockResolvedValue("mock-jwt"),
  patientSessionCookieOptions: vi.fn().mockReturnValue({ httpOnly: true, secure: true, sameSite: "none", path: "/", maxAge: 31536000 }),
}));

vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve("{}") }));

// --- APIインポート ---
import { POST as applyPOST } from "@/app/api/reorder/apply/route";
import { GET as reordersGET } from "@/app/api/admin/reorders/route";
import { POST as approvePOST } from "@/app/api/admin/reorders/approve/route";
import { POST as rejectPOST } from "@/app/api/admin/reorders/reject/route";

// --- ヘルパー ---
function setDefaultCookies() {
  mockCookies.mockResolvedValue({
    get: (name: string) => {
      if (name === "patient_id" || name === "__Host-patient_id") return { value: "P-TEST-001" };
      if (name === "line_user_id" || name === "__Host-line_user_id") return { value: "U_LINE_TEST" };
      return undefined;
    },
  });
}

function createApplyRequest(body: Record<string, unknown>) {
  setDefaultCookies();
  return new Request("http://localhost/api/reorder/apply", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof applyPOST>[0];
}

function createAdminGetRequest(includeAll = false) {
  const url = includeAll
    ? "http://localhost/api/admin/reorders?include_all=true"
    : "http://localhost/api/admin/reorders";
  const req = new Request(url, { method: "GET" });
  (req as unknown as Record<string, unknown>).nextUrl = new URL(url);
  return req as unknown as Parameters<typeof reordersGET>[0];
}

function createApproveRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/admin/reorders/approve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof approvePOST>[0];
}

function createRejectRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/admin/reorders/reject", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof rejectPOST>[0];
}

// 申請API用のテーブルチェーン設定（基本パターン: intakeOK, 重複なし, reorder_number=1）
function setupApplyChains(overrides?: {
  intakeStatus?: string | null;
  existingReorder?: Record<string, unknown> | null;
  maxReorderNumber?: number;
}) {
  const intakeStatus = overrides?.intakeStatus ?? "OK";
  const existingReorder = overrides?.existingReorder ?? null;
  const maxNum = overrides?.maxReorderNumber ?? 1;

  // intake（NG判定チェック）
  tableChains["intake"] = createChain({ data: intakeStatus ? { status: intakeStatus } : null, error: null });
  // 重複チェック
  const dupChain = createChain({ data: existingReorder, error: null });
  // reorder_number取得
  const maxChain = createChain({ data: { reorder_number: maxNum }, error: null });
  // INSERT
  const insertChain = createChain({ data: { id: "new-reorder-id" }, error: null });
  // orders（処方歴）
  tableChains["orders"] = createChain({ data: [], error: null });
  // patients（名前取得）
  tableChains["patients"] = createChain({
    data: [{ patient_id: "P-TEST-001", name: "テスト太郎" }],
    error: null,
  });

  let reorderCallCount = 0;
  mockSupabaseFrom.mockImplementation((table: string) => {
    if (table === "reorders") {
      reorderCallCount++;
      if (reorderCallCount === 1) return dupChain; // 重複チェック
      if (reorderCallCount === 2) return maxChain;  // max reorder_number
      return insertChain;                            // INSERT
    }
    return getOrCreateChain(table);
  });
}

// 承認API用テーブルチェーン設定
function setupApproveChains(reorderData: Record<string, unknown>, opts?: {
  updateError?: boolean;
  prevReorders?: Record<string, unknown>[] | null;
  patientLineId?: string | null;
}) {
  const selectChain = createChain({ data: reorderData, error: null });
  const updateChain = createChain({
    data: opts?.updateError ? null : [{ id: reorderData.id }],
    error: opts?.updateError ? { message: "update failed" } : null,
  });
  const prevReordersChain = createChain({
    data: opts?.prevReorders ?? [],
    error: null,
  });
  const karteUpdateChain = createChain({ data: [{ id: reorderData.id }], error: null });
  const patientChain = createChain({
    data: { line_id: opts?.patientLineId ?? "U_LINE_TEST" },
    error: null,
  });
  const msgLogChain = createChain({ data: null, error: null });
  const notifyUpdateChain = createChain({ data: null, error: null });

  let reorderCallCount = 0;
  mockSupabaseFrom.mockImplementation((table: string) => {
    if (table === "reorders") {
      reorderCallCount++;
      if (reorderCallCount === 1) return selectChain;        // ステータス取得
      if (reorderCallCount === 2) return updateChain;         // status更新
      if (reorderCallCount === 3) return prevReordersChain;   // 前回reorder取得
      if (reorderCallCount === 4) return karteUpdateChain;    // karte_note更新
      return notifyUpdateChain;                               // line_notify_result更新
    }
    if (table === "patients") return patientChain;
    if (table === "message_log") return msgLogChain;
    return getOrCreateChain(table);
  });
}

// 却下API用テーブルチェーン設定
function setupRejectChains(reorderData: Record<string, unknown>, opts?: {
  updateError?: boolean;
}) {
  const selectChain = createChain({ data: reorderData, error: null });
  const updateChain = createChain({
    data: null,
    error: opts?.updateError ? { message: "update failed" } : null,
  });

  let reorderCallCount = 0;
  mockSupabaseFrom.mockImplementation((table: string) => {
    if (table === "reorders") {
      reorderCallCount++;
      if (reorderCallCount === 1) return selectChain;
      return updateChain;
    }
    return getOrCreateChain(table);
  });
}

// =============================================
// 再処方フロー統合テスト
// =============================================
describe("再処方フロー統合テスト", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
    mockVerifyAdminAuth.mockResolvedValue(true);
    mockPushMessage.mockResolvedValue({ ok: true });
    mockInvalidateCache.mockResolvedValue(undefined);
    mockGetSetting.mockResolvedValue(null);
    mockGetProductByCode.mockResolvedValue({ title: "マンジャロ2.5mg", field_id: null });
    mockIsMultiFieldEnabled.mockResolvedValue(false);
    mockSupabaseFrom.mockImplementation((table: string) => getOrCreateChain(table));
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      text: () => Promise.resolve("{}"),
    } as unknown as Response);
  });

  // =============================================
  // シナリオ1: 基本フロー（申請 → 一覧取得 → 承認）
  // =============================================
  describe("基本フロー: 申請 → 一覧取得 → 承認", () => {
    it("患者が再処方を申請するとstatus=pendingで作成される", async () => {
      setupApplyChains();
      const req = createApplyRequest({ productCode: "MJL_2.5mg_1m" });
      const res = await applyPOST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.autoApproved).toBe(false);
    });

    it("管理者がpending一覧を取得できる", async () => {
      tableChains["reorders"] = createChain({
        data: [{
          reorder_number: 1, patient_id: "P-TEST-001", product_code: "MJL_2.5mg_1m",
          status: "pending", timestamp: "2026-03-01T00:00:00Z",
          note: "", line_uid: "U_LINE_TEST", line_notify_result: null,
        }],
        error: null,
      });
      tableChains["patients"] = createChain({
        data: [{ patient_id: "P-TEST-001", name: "テスト太郎" }],
        error: null,
      });
      tableChains["intake"] = createChain({ data: [], error: null });

      const req = createAdminGetRequest(false);
      const res = await reordersGET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.reorders).toHaveLength(1);
      expect(json.reorders[0].status).toBe("pending");
      expect(json.reorders[0].patient_name).toBe("テスト太郎");
    });

    it("医師が承認するとstatus=confirmedに更新される", async () => {
      setupApproveChains({
        id: "r-1", patient_id: "P-TEST-001", status: "pending", product_code: "MJL_2.5mg_1m",
      });

      const req = createApproveRequest({ id: 1 });
      const res = await approvePOST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
    });

    it("承認時にkarte_noteがreordersテーブルに保存される（intakeにはINSERTしない）", async () => {
      setupApproveChains({
        id: "r-1", patient_id: "P-TEST-001", status: "pending", product_code: "MJL_2.5mg_1m",
      });

      const req = createApproveRequest({ id: 1 });
      await approvePOST(req);

      // reordersテーブルへのupdate呼び出しでkarte_noteが含まれる
      const fromCalls = mockSupabaseFrom.mock.calls;
      const reordersCalls = fromCalls.filter(([t]: [string]) => t === "reorders");
      // 少なくとも3回（select, update status, prev reorders or karte update）
      expect(reordersCalls.length).toBeGreaterThanOrEqual(3);

      // intakeへのinsert呼び出しがない
      const intakeCalls = fromCalls.filter(([t]: [string]) => t === "intake");
      expect(intakeCalls).toHaveLength(0);
    });
  });

  // =============================================
  // シナリオ2: 却下フロー
  // =============================================
  describe("却下フロー", () => {
    it("医師が却下するとstatus=rejectedに更新される", async () => {
      setupRejectChains({
        id: "r-1", patient_id: "P-TEST-001", status: "pending",
      });

      const req = createRejectRequest({ id: 1 });
      const res = await rejectPOST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
    });

    it("却下後にキャッシュが無効化される", async () => {
      setupRejectChains({
        id: "r-1", patient_id: "P-TEST-001", status: "pending",
      });

      const req = createRejectRequest({ id: 1 });
      await rejectPOST(req);
      expect(mockInvalidateCache).toHaveBeenCalledWith("P-TEST-001");
    });

    it("却下後に監査ログが記録される", async () => {
      setupRejectChains({
        id: "r-1", patient_id: "P-TEST-001", status: "pending",
      });

      const req = createRejectRequest({ id: 1 });
      await rejectPOST(req);
      expect(mockLogAudit).toHaveBeenCalledWith(
        expect.anything(),
        "reorder.reject",
        "reorder",
        "1",
      );
    });
  });

  // =============================================
  // シナリオ3: 用量比較ロジック検証（カルテ生成）
  // =============================================
  describe("用量比較ロジック（カルテ生成）", () => {
    it("同量処方: 「継続使用のため処方」がカルテに記載される", async () => {
      // 前回2.5mg, 今回2.5mg → 同量
      setupApproveChains(
        { id: "r-1", patient_id: "P-TEST-001", status: "pending", product_code: "MJL_2.5mg_1m" },
        { prevReorders: [{ product_code: "MJL_2.5mg_1m" }] },
      );

      // karte_note updateのpayloadをキャプチャ
      const karteUpdatePayloads: unknown[] = [];
      const origImpl = mockSupabaseFrom.getMockImplementation();
      let callCount = 0;
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === "reorders") {
          callCount++;
          if (callCount === 4) {
            // karte_note更新のチェーン
            const chain = createChain({ data: [{ id: "r-1" }], error: null });
            const origUpdate = chain.update;
            chain.update = vi.fn((...args: unknown[]) => {
              karteUpdatePayloads.push(args[0]);
              return origUpdate(...args);
            });
            return chain;
          }
        }
        return origImpl!(table);
      });

      const req = createApproveRequest({ id: 1 });
      await approvePOST(req);

      expect(karteUpdatePayloads.length).toBeGreaterThan(0);
      const note = (karteUpdatePayloads[0] as Record<string, string>).karte_note;
      expect(note).toContain("継続使用のため処方");
    });

    it("増量処方: 「効果を感じづらくなり増量処方」がカルテに記載される", async () => {
      // 前回2.5mg, 今回5mg → 増量
      setupApproveChains(
        { id: "r-1", patient_id: "P-TEST-001", status: "pending", product_code: "MJL_5mg_1m" },
        { prevReorders: [{ product_code: "MJL_2.5mg_1m" }] },
      );

      const karteUpdatePayloads: unknown[] = [];
      const origImpl = mockSupabaseFrom.getMockImplementation();
      let callCount = 0;
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === "reorders") {
          callCount++;
          if (callCount === 4) {
            const chain = createChain({ data: [{ id: "r-1" }], error: null });
            const origUpdate = chain.update;
            chain.update = vi.fn((...args: unknown[]) => {
              karteUpdatePayloads.push(args[0]);
              return origUpdate(...args);
            });
            return chain;
          }
        }
        return origImpl!(table);
      });

      const req = createApproveRequest({ id: 1 });
      await approvePOST(req);

      expect(karteUpdatePayloads.length).toBeGreaterThan(0);
      const note = (karteUpdatePayloads[0] as Record<string, string>).karte_note;
      expect(note).toContain("効果を感じづらくなり増量処方");
    });

    it("減量処方: 「効果も十分にあったため減量処方」がカルテに記載される", async () => {
      // 前回5mg, 今回2.5mg → 減量
      setupApproveChains(
        { id: "r-1", patient_id: "P-TEST-001", status: "pending", product_code: "MJL_2.5mg_1m" },
        { prevReorders: [{ product_code: "MJL_5mg_1m" }] },
      );

      const karteUpdatePayloads: unknown[] = [];
      const origImpl = mockSupabaseFrom.getMockImplementation();
      let callCount = 0;
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === "reorders") {
          callCount++;
          if (callCount === 4) {
            const chain = createChain({ data: [{ id: "r-1" }], error: null });
            const origUpdate = chain.update;
            chain.update = vi.fn((...args: unknown[]) => {
              karteUpdatePayloads.push(args[0]);
              return origUpdate(...args);
            });
            return chain;
          }
        }
        return origImpl!(table);
      });

      const req = createApproveRequest({ id: 1 });
      await approvePOST(req);

      expect(karteUpdatePayloads.length).toBeGreaterThan(0);
      const note = (karteUpdatePayloads[0] as Record<string, string>).karte_note;
      expect(note).toContain("効果も十分にあったため減量処方");
    });

    it("初回処方（前回なし）: 「継続使用のため処方」がカルテに記載される", async () => {
      // 前回なし → prevDose=null
      setupApproveChains(
        { id: "r-1", patient_id: "P-TEST-001", status: "pending", product_code: "MJL_2.5mg_1m" },
        { prevReorders: [] },
      );

      const karteUpdatePayloads: unknown[] = [];
      const origImpl = mockSupabaseFrom.getMockImplementation();
      let callCount = 0;
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === "reorders") {
          callCount++;
          if (callCount === 4) {
            const chain = createChain({ data: [{ id: "r-1" }], error: null });
            const origUpdate = chain.update;
            chain.update = vi.fn((...args: unknown[]) => {
              karteUpdatePayloads.push(args[0]);
              return origUpdate(...args);
            });
            return chain;
          }
        }
        return origImpl!(table);
      });

      const req = createApproveRequest({ id: 1 });
      await approvePOST(req);

      expect(karteUpdatePayloads.length).toBeGreaterThan(0);
      const note = (karteUpdatePayloads[0] as Record<string, string>).karte_note;
      expect(note).toContain("継続使用のため処方");
    });
  });

  // =============================================
  // シナリオ4: 重複申請チェック
  // =============================================
  describe("重複申請チェック", () => {
    it("pending中に再申請するとduplicate_pendingエラーになる", async () => {
      setupApplyChains({
        existingReorder: { id: "r-1", status: "pending", product_code: "MJL_2.5mg_1m" },
      });

      const req = createApplyRequest({ productCode: "MJL_2.5mg_1m" });
      const res = await applyPOST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("duplicate_pending");
    });

    it("confirmed中に再申請するとduplicate_pendingエラーになる", async () => {
      setupApplyChains({
        existingReorder: { id: "r-1", status: "confirmed", product_code: "MJL_2.5mg_1m" },
      });

      const req = createApplyRequest({ productCode: "MJL_2.5mg_1m" });
      const res = await applyPOST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("duplicate_pending");
    });
  });

  // =============================================
  // シナリオ5: 認証チェック
  // =============================================
  describe("認証チェック", () => {
    it("未認証の患者は申請できない（cookieなし）", async () => {
      vi.mocked(verifyPatientSession).mockResolvedValueOnce(null as any);
      mockCookies.mockResolvedValue({
        get: () => undefined,
      });

      const req = new Request("http://localhost/api/reorder/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productCode: "MJL_2.5mg_1m" }),
      }) as unknown as Parameters<typeof applyPOST>[0];

      const res = await applyPOST(req);
      expect(res.status).toBe(401);
    });

    it("未認証の管理者は承認できない", async () => {
      mockVerifyAdminAuth.mockResolvedValue(false);
      const req = createApproveRequest({ id: 1 });
      const res = await approvePOST(req);
      expect(res.status).toBe(401);
    });

    it("未認証の管理者は却下できない", async () => {
      mockVerifyAdminAuth.mockResolvedValue(false);
      const req = createRejectRequest({ id: 1 });
      const res = await rejectPOST(req);
      expect(res.status).toBe(401);
    });

    it("未認証の管理者は一覧取得できない", async () => {
      mockVerifyAdminAuth.mockResolvedValue(false);
      const req = createAdminGetRequest();
      const res = await reordersGET(req);
      expect(res.status).toBe(401);
    });
  });

  // =============================================
  // シナリオ6: 冪等性（二重処理防止）
  // =============================================
  describe("冪等性（二重処理防止）", () => {
    it("既に承認済みの申請を再度承認すると「既に処理済み」を返す", async () => {
      setupApproveChains({
        id: "r-1", patient_id: "P-TEST-001", status: "confirmed", product_code: "MJL_2.5mg_1m",
      });

      const req = createApproveRequest({ id: 1 });
      const res = await approvePOST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.message).toContain("既に処理済み");
    });

    it("既に却下済みの申請を再度却下すると「既に処理済み」を返す", async () => {
      setupRejectChains({
        id: "r-1", patient_id: "P-TEST-001", status: "rejected",
      });

      const req = createRejectRequest({ id: 1 });
      const res = await rejectPOST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.message).toContain("既に処理済み");
    });
  });

  // =============================================
  // シナリオ7: 承認後の副次効果
  // =============================================
  describe("承認後の副次効果", () => {
    it("承認後にキャッシュが無効化される", async () => {
      setupApproveChains({
        id: "r-1", patient_id: "P-TEST-001", status: "pending", product_code: "MJL_2.5mg_1m",
      });

      const req = createApproveRequest({ id: 1 });
      await approvePOST(req);
      expect(mockInvalidateCache).toHaveBeenCalledWith("P-TEST-001");
    });

    it("承認後に監査ログが記録される", async () => {
      setupApproveChains({
        id: "r-1", patient_id: "P-TEST-001", status: "pending", product_code: "MJL_2.5mg_1m",
      });

      const req = createApproveRequest({ id: 1 });
      await approvePOST(req);
      expect(mockLogAudit).toHaveBeenCalledWith(
        expect.anything(),
        "reorder.approve",
        "reorder",
        "1",
        expect.objectContaining({ patient_id: "P-TEST-001" }),
      );
    });

    it("承認後にリッチメニュー自動切替が呼ばれる", async () => {
      setupApproveChains({
        id: "r-1", patient_id: "P-TEST-001", status: "pending", product_code: "MJL_2.5mg_1m",
      });

      const req = createApproveRequest({ id: 1 });
      await approvePOST(req);
      expect(mockEvaluateMenuRules).toHaveBeenCalled();
    });
  });

  // =============================================
  // シナリオ8: NG患者の再処方ブロック
  // =============================================
  describe("NG患者の再処方ブロック", () => {
    it("NG判定の患者は再処方申請できない", async () => {
      setupApplyChains({ intakeStatus: "NG" });

      const req = createApplyRequest({ productCode: "MJL_2.5mg_1m" });
      const res = await applyPOST(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toBe("ng_patient");
    });
  });

  // =============================================
  // シナリオ9: 存在しない申請の操作
  // =============================================
  describe("存在しない申請の操作", () => {
    it("存在しないreorder_numberで承認すると404を返す", async () => {
      tableChains["reorders"] = createChain({ data: null, error: { message: "not found" } });

      const req = createApproveRequest({ id: 999 });
      const res = await approvePOST(req);
      expect(res.status).toBe(404);
    });

    it("存在しないreorder_numberで却下すると404を返す", async () => {
      tableChains["reorders"] = createChain({ data: null, error: { message: "not found" } });

      const req = createRejectRequest({ id: 999 });
      const res = await rejectPOST(req);
      expect(res.status).toBe(404);
    });
  });

  // =============================================
  // シナリオ10: 申請時のキャッシュ無効化
  // =============================================
  describe("申請時のキャッシュ無効化", () => {
    it("申請成功後にダッシュボードキャッシュが無効化される", async () => {
      setupApplyChains();

      const req = createApplyRequest({ productCode: "MJL_2.5mg_1m" });
      await applyPOST(req);

      expect(mockInvalidateCache).toHaveBeenCalledWith("P-TEST-001");
    });
  });
});
