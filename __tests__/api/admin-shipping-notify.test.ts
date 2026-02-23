// __tests__/api/admin-shipping-notify.test.ts
// 発送通知一斉送信 API のテスト
// 対象: app/api/admin/shipping/notify-shipped/route.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- チェーンモック ---
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

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: vi.fn((table: string) => getOrCreateChain(table)) },
}));

vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((q: any) => q),
  tenantPayload: vi.fn(() => ({ tenant_id: "test-tenant" })),
}));

// shipping-flex モック
const mockBuildShippingFlex = vi.fn().mockResolvedValue({
  type: "flex",
  altText: "発送通知",
  contents: {},
});
const mockSendShippingNotification = vi.fn().mockResolvedValue({ ok: true });

vi.mock("@/lib/shipping-flex", () => ({
  buildShippingFlex: (...args: any[]) => mockBuildShippingFlex(...args),
  sendShippingNotification: (...args: any[]) => mockSendShippingNotification(...args),
}));

// settings モック
vi.mock("@/lib/settings", () => ({
  getSettingOrEnv: vi.fn().mockResolvedValue("test-line-token"),
}));

function createMockRequest(method: string, url: string, body?: any) {
  return {
    method,
    url,
    nextUrl: { searchParams: new URL(url).searchParams },
    cookies: { get: vi.fn(() => undefined) },
    headers: { get: vi.fn(() => null) },
    json: body ? vi.fn().mockResolvedValue(body) : vi.fn(),
  } as any;
}

import { GET, POST } from "@/app/api/admin/shipping/notify-shipped/route";
import { verifyAdminAuth } from "@/lib/admin-auth";

describe("発送通知API (notify-shipped/route.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
    (verifyAdminAuth as any).mockResolvedValue(true);
    vi.stubGlobal("fetch", vi.fn());
  });

  // ========================================
  // GET: プレビュー
  // ========================================
  describe("GET: 送信対象プレビュー", () => {
    it("認証失敗 → 401", async () => {
      (verifyAdminAuth as any).mockResolvedValue(false);
      const req = createMockRequest("GET", "http://localhost/api/admin/shipping/notify-shipped");
      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it("発送対象がない → 空リスト", async () => {
      // orders: 空
      tableChains["orders"] = createChain({ data: [], error: null });
      const req = createMockRequest("GET", "http://localhost/api/admin/shipping/notify-shipped");
      const res = await GET(req);
      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.patients).toEqual([]);
      expect(json.summary.total).toBe(0);
    });

    it("発送対象あり → 患者一覧を返す", async () => {
      // orders: 本日発送分
      tableChains["orders"] = createChain({
        data: [
          { patient_id: "p1", tracking_number: "TN001", carrier: "yamato" },
          { patient_id: "p2", tracking_number: "TN002", carrier: "sagawa" },
        ],
        error: null,
      });
      // patients: line_id あり / なし
      tableChains["patients"] = createChain({
        data: [
          { patient_id: "p1", name: "田中太郎", line_id: "U001" },
          { patient_id: "p2", name: "山田花子", line_id: null },
        ],
        error: null,
      });

      const req = createMockRequest("GET", "http://localhost/api/admin/shipping/notify-shipped");
      const res = await GET(req);
      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.patients).toHaveLength(2);
      expect(json.summary.total).toBe(2);
      expect(json.summary.sendable).toBe(1);
      expect(json.summary.no_uid).toBe(1);
    });

    it("ordersクエリエラー → 500", async () => {
      tableChains["orders"] = createChain({ data: null, error: { message: "DB error" } });
      const req = createMockRequest("GET", "http://localhost/api/admin/shipping/notify-shipped");
      const res = await GET(req);
      expect(res.status).toBe(500);
    });
  });

  // ========================================
  // POST: 一斉送信
  // ========================================
  describe("POST: 一斉送信", () => {
    it("認証失敗 → 401", async () => {
      (verifyAdminAuth as any).mockResolvedValue(false);
      const req = createMockRequest("POST", "http://localhost/api/admin/shipping/notify-shipped");
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it("対象なし → sent=0", async () => {
      tableChains["orders"] = createChain({ data: [], error: null });
      // mark_definitions, rich_menus も空で
      tableChains["mark_definitions"] = createChain({ data: null, error: null });
      tableChains["rich_menus"] = createChain({ data: null, error: null });

      const req = createMockRequest("POST", "http://localhost/api/admin/shipping/notify-shipped");
      const res = await POST(req);
      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.sent).toBe(0);
    });

    it("LINE UID ありの患者 → 通知送信成功", async () => {
      tableChains["orders"] = createChain({
        data: [{ patient_id: "p1", tracking_number: "TN001", carrier: "yamato" }],
        error: null,
      });
      tableChains["patients"] = createChain({
        data: [{ patient_id: "p1", name: "田中太郎", line_id: "U001" }],
        error: null,
      });
      // mark_definitions: 処方ずみマーク
      tableChains["mark_definitions"] = createChain({ data: { value: "rx_done" }, error: null });
      // patient_marks: 未設定
      tableChains["patient_marks"] = createChain({ data: null, error: null });
      // rich_menus: 処方後メニュー
      tableChains["rich_menus"] = createChain({ data: { line_rich_menu_id: "rm-123" }, error: null });

      // LINE API モック（現在のリッチメニュー取得 → 別メニュー → 切替）
      (fetch as any)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ richMenuId: "rm-other" }) })
        .mockResolvedValueOnce({ ok: true });

      const req = createMockRequest("POST", "http://localhost/api/admin/shipping/notify-shipped");
      const res = await POST(req);
      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.sent).toBe(1);
      expect(json.no_uid).toBe(0);
      expect(mockSendShippingNotification).toHaveBeenCalledTimes(1);
    });

    it("LINE UID なしの患者 → no_uid カウント", async () => {
      tableChains["orders"] = createChain({
        data: [{ patient_id: "p1", tracking_number: "TN001", carrier: "yamato" }],
        error: null,
      });
      tableChains["patients"] = createChain({
        data: [{ patient_id: "p1", name: "田中太郎", line_id: null }],
        error: null,
      });
      tableChains["mark_definitions"] = createChain({ data: null, error: null });
      tableChains["rich_menus"] = createChain({ data: null, error: null });

      const req = createMockRequest("POST", "http://localhost/api/admin/shipping/notify-shipped");
      const res = await POST(req);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.no_uid).toBe(1);
      expect(json.sent).toBe(0);
    });

    it("通知送信失敗 → failed カウント", async () => {
      tableChains["orders"] = createChain({
        data: [{ patient_id: "p1", tracking_number: "TN001", carrier: "yamato" }],
        error: null,
      });
      tableChains["patients"] = createChain({
        data: [{ patient_id: "p1", name: "田中太郎", line_id: "U001" }],
        error: null,
      });
      tableChains["mark_definitions"] = createChain({ data: null, error: null });
      tableChains["rich_menus"] = createChain({ data: null, error: null });

      // 送信失敗
      mockSendShippingNotification.mockResolvedValueOnce({ ok: false });

      const req = createMockRequest("POST", "http://localhost/api/admin/shipping/notify-shipped");
      const res = await POST(req);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.failed).toBe(1);
      expect(json.sent).toBe(0);
    });

    it("リッチメニュー既に同じ → 切替スキップ", async () => {
      tableChains["orders"] = createChain({
        data: [{ patient_id: "p1", tracking_number: "TN001", carrier: "yamato" }],
        error: null,
      });
      tableChains["patients"] = createChain({
        data: [{ patient_id: "p1", name: "田中太郎", line_id: "U001" }],
        error: null,
      });
      tableChains["mark_definitions"] = createChain({ data: null, error: null });
      tableChains["rich_menus"] = createChain({ data: { line_rich_menu_id: "rm-123" }, error: null });

      // 現在のリッチメニューが同じ
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ richMenuId: "rm-123" }),
      });

      const req = createMockRequest("POST", "http://localhost/api/admin/shipping/notify-shipped");
      const res = await POST(req);
      const json = await res.json();
      expect(json.menu_switched).toBe(0);
      // 切替リクエストは呼ばれない（GET1回のみ）
      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });
});
