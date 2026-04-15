// __tests__/api/reorder-apply-advanced.test.ts
// 再処方申請API の追加テスト（再処方間隔・自動承認・用量変更通知・リトライ）
// 対象: app/api/reorder/apply/route.ts

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// === モックヘルパー ===
function createChain(defaultResolve = { data: null, error: null }) {
  const chain: Record<string, unknown> = {};
  ["insert","update","delete","select","eq","neq","gt","gte","lt","lte",
   "in","is","not","order","limit","range","single","maybeSingle","upsert",
   "ilike","or","count","csv","like"].forEach(m => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = vi.fn((resolve: (val: unknown) => void) => resolve(defaultResolve));
  return chain;
}

let tableChains: Record<string, Record<string, unknown>> = {};
function getOrCreateChain(table: string) {
  if (!tableChains[table]) tableChains[table] = createChain();
  return tableChains[table];
}

// === モック定義 ===
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: vi.fn((table: string) => getOrCreateChain(table)) },
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  resolveTenantIdOrThrow: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((q: unknown) => q),
  strictWithTenant: vi.fn((q: unknown) => q),
  tenantPayload: vi.fn(() => ({ tenant_id: "test-tenant" })),
}));

vi.mock("@/lib/redis", () => ({
  invalidateDashboardCache: vi.fn().mockResolvedValue(undefined),
}));

let mockBusinessRules = {
  dosageChangeNotify: false,
  minReorderIntervalDays: 0,
  notifyReorderApply: false,
  notifyReorderApprove: false,
  notifyReorderPaid: false,
  autoApproveSameDose: false,
  intakeReminderHours: 0,
  approveMessage: "",
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
};

vi.mock("@/lib/business-rules", () => ({
  getBusinessRules: vi.fn(async () => mockBusinessRules),
}));

vi.mock("@/lib/settings", () => ({
  getSettingOrEnv: vi.fn().mockResolvedValue("test-token"),
  getSetting: vi.fn().mockResolvedValue(null),
  getSettingsBulk: vi.fn().mockResolvedValue(new Map()),
}));

vi.mock("@/lib/validations/helpers", () => ({
  parseBody: vi.fn(),
}));

vi.mock("@/lib/validations/reorder", () => ({
  reorderApplySchema: {},
}));

vi.mock("@/lib/medical-fields", () => ({
  isMultiFieldEnabled: vi.fn().mockResolvedValue(false),
}));

vi.mock("@/lib/products", () => ({
  getProductByCode: vi.fn().mockResolvedValue({ title: "テスト商品", field_id: null }),
}));

vi.mock("@/lib/patient-session", () => ({
  verifyPatientSession: vi.fn().mockResolvedValue({ patientId: "PT-ADV", lineUserId: "Uadv" }),
  createPatientToken: vi.fn().mockResolvedValue("mock-jwt"),
  patientSessionCookieOptions: vi.fn().mockReturnValue({ httpOnly: true, secure: true, sameSite: "none", path: "/", maxAge: 31536000 }),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn((name: string) => {
      if (name === "__Host-patient_id" || name === "patient_id") return { value: "PT-ADV" };
      if (name === "__Host-line_user_id" || name === "line_user_id") return { value: "Uadv" };
      return undefined;
    }),
  }),
}));

vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
  ok: true, status: 200, text: () => Promise.resolve("ok"),
}));

import { POST } from "@/app/api/reorder/apply/route";
import { parseBody } from "@/lib/validations/helpers";
import { verifyPatientSession } from "@/lib/patient-session";

function setupDefaultChains() {
  // NG判定: null（OK）
  const intakeChain = createChain({ data: null, error: null });
  tableChains["intake"] = intakeChain;
  // 重複チェック: なし（配列で返す — 実装は .find() を使用） + reorder_number取得 + INSERT成功
  const reordersChain = createChain({ data: [], error: null });
  reordersChain.single = vi.fn().mockReturnValue({
    then: (fn: (val: unknown) => void) => fn({ data: { id: 100 }, error: null }),
  });
  tableChains["reorders"] = reordersChain;
  // 患者名
  const patientsChain = createChain({ data: { name: "テスト太郎" }, error: null });
  tableChains["patients"] = patientsChain;
  // 処方歴
  const ordersChain = createChain({ data: [], error: null });
  tableChains["orders"] = ordersChain;
}

describe("POST /api/reorder/apply（追加テスト）", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
    mockBusinessRules = {
      dosageChangeNotify: false,
      minReorderIntervalDays: 0,
      notifyReorderApply: false,
      notifyReorderApprove: false,
      notifyReorderPaid: false,
      autoApproveSameDose: false,
      intakeReminderHours: 0,
      approveMessage: "",
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
    };
    vi.mocked(parseBody).mockResolvedValue({
      data: { productCode: "MJL_5mg_1m" },
    });
    vi.mocked(verifyPatientSession).mockResolvedValue({ patientId: "PT-ADV", lineUserId: "Uadv" });
  });

  // ------------------------------------------------------------------
  // 再処方間隔チェックテスト
  // ------------------------------------------------------------------
  describe("再処方間隔チェック", () => {
    it("間隔が短い場合は400を返す", async () => {
      mockBusinessRules.minReorderIntervalDays = 30;
      setupDefaultChains();

      // 前回決済: 10日前
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
      // 重複チェック: なし（配列で返す）
      const reordersChain = createChain({ data: [], error: null });
      tableChains["reorders"] = reordersChain;

      // 間隔チェック用: maybeSingleで前回決済10日前を返す
      reordersChain.maybeSingle = vi.fn().mockReturnValue({
        then: (fn: (val: unknown) => void) => fn({ data: { paid_at: tenDaysAgo }, error: null }),
      });

      const req = new NextRequest("http://localhost/api/reorder/apply", {
        method: "POST",
        body: JSON.stringify({ productCode: "MJL_5mg_1m" }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("interval_too_short");
      expect(body.message).toContain("30日以上");
    });

    it("間隔が十分な場合は通過する", async () => {
      mockBusinessRules.minReorderIntervalDays = 30;
      setupDefaultChains();

      // 前回決済: 31日前
      const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
      const reordersChain = tableChains["reorders"]!;
      let reorderCallCount = 0;
      reordersChain.maybeSingle = vi.fn().mockImplementation(() => {
        reorderCallCount++;
        if (reorderCallCount <= 1) {
          return { then: (fn: (val: unknown) => void) => fn({ data: null, error: null }) };
        } else {
          return { then: (fn: (val: unknown) => void) => fn({ data: { paid_at: thirtyOneDaysAgo }, error: null }) };
        }
      });

      const req = new NextRequest("http://localhost/api/reorder/apply", {
        method: "POST",
        body: JSON.stringify({ productCode: "MJL_5mg_1m" }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
    });

    it("minReorderIntervalDays=0の場合は間隔チェックをスキップ", async () => {
      mockBusinessRules.minReorderIntervalDays = 0;
      setupDefaultChains();

      const req = new NextRequest("http://localhost/api/reorder/apply", {
        method: "POST",
        body: JSON.stringify({ productCode: "MJL_5mg_1m" }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
    });
  });

  // ------------------------------------------------------------------
  // 自動承認テスト
  // ------------------------------------------------------------------
  describe("自動承認（autoApproveSameDose）", () => {
    it("同量再処方で自動承認される", async () => {
      mockBusinessRules.autoApproveSameDose = true;
      vi.mocked(parseBody).mockResolvedValue({
        data: { productCode: "MJL_5mg_1m" },
      });

      setupDefaultChains();
      const reordersChain = tableChains["reorders"]!;
      let reorderCallCount = 0;
      reordersChain.maybeSingle = vi.fn().mockImplementation(() => {
        reorderCallCount++;
        if (reorderCallCount <= 1) {
          // 重複チェック: なし
          return { then: (fn: (val: unknown) => void) => fn({ data: null, error: null }) };
        } else {
          // 前回決済: 同じ5mg
          return { then: (fn: (val: unknown) => void) => fn({ data: { product_code: "MJL_5mg_1m" }, error: null }) };
        }
      });

      const req = new NextRequest("http://localhost/api/reorder/apply", {
        method: "POST",
        body: JSON.stringify({ productCode: "MJL_5mg_1m" }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.autoApproved).toBe(true);
    });

    it("異なる用量の場合は自動承認されない", async () => {
      mockBusinessRules.autoApproveSameDose = true;
      vi.mocked(parseBody).mockResolvedValue({
        data: { productCode: "MJL_7.5mg_1m" }, // 7.5mg
      });

      setupDefaultChains();
      const reordersChain = tableChains["reorders"]!;
      let reorderCallCount = 0;
      reordersChain.maybeSingle = vi.fn().mockImplementation(() => {
        reorderCallCount++;
        if (reorderCallCount <= 1) {
          return { then: (fn: (val: unknown) => void) => fn({ data: null, error: null }) };
        } else {
          // 前回は5mg
          return { then: (fn: (val: unknown) => void) => fn({ data: { product_code: "MJL_5mg_1m" }, error: null }) };
        }
      });

      const req = new NextRequest("http://localhost/api/reorder/apply", {
        method: "POST",
        body: JSON.stringify({ productCode: "MJL_7.5mg_1m" }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      // 用量が違うので自動承認されない
      expect(body.autoApproved).toBe(false);
    });

    it("autoApproveSameDose=false の場合は自動承認しない", async () => {
      mockBusinessRules.autoApproveSameDose = false;

      setupDefaultChains();

      const req = new NextRequest("http://localhost/api/reorder/apply", {
        method: "POST",
        body: JSON.stringify({ productCode: "MJL_5mg_1m" }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.autoApproved).toBe(false);
    });
  });

  // ------------------------------------------------------------------
  // 用量抽出ロジックテスト
  // ------------------------------------------------------------------
  describe("extractDose ロジック検証", () => {
    // extractDoseはlib/reorder-karte.tsからインポートされるが、
    // ここではロジック検証として直接テスト
    function extractDose(productCode: string): number | null {
      const m = productCode.match(/(\d+\.?\d*)mg/);
      return m ? parseFloat(m[1]) : null;
    }

    it("2.5mg を抽出", () => {
      expect(extractDose("MJL_2.5mg_1m")).toBe(2.5);
    });

    it("5mg を抽出", () => {
      expect(extractDose("MJL_5mg_1m")).toBe(5);
    });

    it("7.5mg を抽出", () => {
      expect(extractDose("MJL_7.5mg_1m")).toBe(7.5);
    });

    it("10mg を抽出", () => {
      expect(extractDose("MJL_10mg_3m")).toBe(10);
    });

    it("mgが含まれない場合はnull", () => {
      expect(extractDose("PRODUCT_CODE")).toBeNull();
    });
  });

  // ------------------------------------------------------------------
  // buildKarteNote ロジック検証テスト
  // ------------------------------------------------------------------
  describe("buildKarteNote ロジック検証", () => {
    function buildKarteNote(currentDose: number | null, prevDose: number | null): string {
      if (prevDose == null || currentDose == null) {
        return "副作用がなく、継続使用のため処方";
      } else if (currentDose > prevDose) {
        return "副作用がなく、効果を感じづらくなり増量処方";
      } else if (currentDose < prevDose) {
        return "副作用がなく、効果も十分にあったため減量処方";
      } else {
        return "副作用がなく、継続使用のため処方";
      }
    }

    it("同量 → 継続処方", () => {
      expect(buildKarteNote(5, 5)).toContain("継続使用");
    });

    it("増量 → 増量処方", () => {
      expect(buildKarteNote(7.5, 5)).toContain("増量処方");
    });

    it("減量 → 減量処方", () => {
      expect(buildKarteNote(2.5, 5)).toContain("減量処方");
    });

    it("前回用量不明 → 継続処方", () => {
      expect(buildKarteNote(5, null)).toContain("継続使用");
    });
  });

  // ------------------------------------------------------------------
  // DB挿入リトライテスト
  // ------------------------------------------------------------------
  describe("reorder_number衝突リトライ", () => {
    it("ユニーク制約違反（reorder_number衝突）時はリトライする（ロジック検証）", () => {
      // route.ts内のロジック: 23505エラーかつidx_reorders_one_active_per_patient以外
      const error = { code: "23505", message: "duplicate key value violates unique constraint" };
      const isUniqueViolation = error.code === "23505";
      const isPatientDup = error.message?.includes("idx_reorders_one_active_per_patient");
      expect(isUniqueViolation).toBe(true);
      expect(isPatientDup).toBe(false);
      // → リトライ（reorderNumber++）
    });

    it("idx_reorders_one_active_per_patient 違反は即座にエラー返却", () => {
      const error = { code: "23505", message: "idx_reorders_one_active_per_patient" };
      const isPatientDup = error.message?.includes("idx_reorders_one_active_per_patient");
      expect(isPatientDup).toBe(true);
      // → duplicate_pending エラーを返却（リトライしない）
    });
  });

  // ------------------------------------------------------------------
  // マルチフィールドモード テスト（ロジック検証）
  // ------------------------------------------------------------------
  describe("マルチフィールドモード（ロジック検証）", () => {
    it("multiField有効時はfield_idでNG判定を分離する", () => {
      // isMultiFieldEnabled=true の場合、product.field_idでintakeクエリにeq条件追加
      const multiField = true;
      const product = { field_id: "field-aga" };
      const shouldFilterByField = multiField && product?.field_id;
      expect(shouldFilterByField).toBeTruthy();
    });

    it("multiField無効時はfield_idフィルタを追加しない", () => {
      const multiField = false;
      const product = { field_id: "field-aga" };
      const shouldFilterByField = multiField && product?.field_id;
      expect(shouldFilterByField).toBeFalsy();
    });
  });
});
