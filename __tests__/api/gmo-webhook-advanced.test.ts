// __tests__/api/gmo-webhook-advanced.test.ts
// GMO PG Webhook の高度なテスト: 署名検証・冪等性・テナント逆引き・通知
import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";
import { NextResponse } from "next/server";

// --- Supabase モック ---
function createMockChain(data: unknown = null, error: unknown = null) {
  const chain: Record<string, any> = {};
  const methods = [
    "from", "select", "insert", "update", "upsert", "delete",
    "eq", "neq", "in", "is", "not", "gt", "gte", "lt", "lte",
    "like", "ilike", "contains", "containedBy", "filter", "or",
    "order", "limit", "range", "single", "maybeSingle", "match",
    "textSearch", "csv", "rpc", "count", "head",
  ];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.then = (resolve: any) =>
    resolve({ data, error, count: Array.isArray(data) ? data.length : 0 });
  return chain;
}

let mockFromChains: Record<string, ReturnType<typeof createMockChain>> = {};

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => {
      if (!mockFromChains[table]) mockFromChains[table] = createMockChain();
      return mockFromChains[table];
    }),
  },
}));

// テナント解決
vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => null),
}));

vi.mock("@/lib/webhook-tenant-resolver", () => ({
  resolveWebhookTenant: vi.fn(),
}));

// 冪等性チェック
vi.mock("@/lib/idempotency", () => ({
  checkIdempotency: vi.fn(),
}));

// 設定取得
vi.mock("@/lib/settings", () => ({
  getSettingOrEnv: vi.fn(),
}));

// 業務ロジックハンドラ
vi.mock("@/lib/webhook-handlers/gmo", () => ({
  processGmoEvent: vi.fn().mockResolvedValue(undefined),
}));

// 失敗通知
vi.mock("@/lib/notifications/webhook-failure", () => ({
  notifyWebhookFailure: vi.fn().mockResolvedValue(undefined),
}));

import { POST, GET } from "@/app/api/gmo/webhook/route";
import { resolveTenantId } from "@/lib/tenant";
import { resolveWebhookTenant } from "@/lib/webhook-tenant-resolver";
import { checkIdempotency } from "@/lib/idempotency";
import { getSettingOrEnv } from "@/lib/settings";
import { processGmoEvent } from "@/lib/webhook-handlers/gmo";
import { notifyWebhookFailure } from "@/lib/notifications/webhook-failure";
import { supabaseAdmin } from "@/lib/supabase";

// --- ヘルパー ---
function buildParams(overrides: Record<string, string> = {}): URLSearchParams {
  const defaults: Record<string, string> = {
    ShopID: "shop_001",
    OrderID: "ord_001",
    Status: "CAPTURE",
    Amount: "13000",
    AccessID: "acc_001",
    ClientField1: "PID:patient_001;Product:MJL_2.5mg_1m",
    ClientField2: "マンジャロ 2.5mg 1ヶ月",
  };
  return new URLSearchParams({ ...defaults, ...overrides });
}

function createRequest(body?: string): Request {
  const content = body ?? buildParams().toString();
  return new Request("http://localhost:3000/api/gmo/webhook", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: content,
  });
}

/** 正しいCheckStringを生成する */
function generateCheckString(
  shopId: string,
  orderId: string,
  status: string,
  amount: string,
  accessId: string,
  shopPass: string,
): string {
  const raw = `${shopId}${orderId}${status}${amount}${accessId}${shopPass}`;
  return crypto.createHash("sha256").update(raw, "utf8").digest("hex");
}

function setupDefaultMocks(tenantId: string = "tenant_001") {
  vi.mocked(resolveTenantId).mockReturnValue(null);
  vi.mocked(resolveWebhookTenant).mockResolvedValue(tenantId);
  vi.mocked(getSettingOrEnv).mockResolvedValue("");
  vi.mocked(checkIdempotency).mockResolvedValue({
    duplicate: false,
    markCompleted: vi.fn().mockResolvedValue(undefined),
    markFailed: vi.fn().mockResolvedValue(undefined),
  });
  vi.mocked(processGmoEvent).mockResolvedValue(undefined);
}

describe("GMO Webhook 高度テスト", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFromChains = {};
    setupDefaultMocks();
  });

  // === GET エンドポイント ===
  describe("GET /api/gmo/webhook", () => {
    it("ヘルスチェック用に200 okを返す", async () => {
      const res = await GET();
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toBe("ok");
    });
  });

  // === 署名検証 (verifyGmoSignature) ===
  describe("署名検証", () => {
    it("正しいCheckStringで署名検証が通り正常処理される", async () => {
      const shopPass = "test_shop_pass";
      vi.mocked(getSettingOrEnv).mockResolvedValue(shopPass);

      const checkString = generateCheckString(
        "shop_001", "ord_001", "CAPTURE", "13000", "acc_001", shopPass,
      );
      const params = buildParams({ CheckString: checkString });

      const req = createRequest(params.toString());
      const res = await POST(req);

      expect(res.status).toBe(200);
      expect(processGmoEvent).toHaveBeenCalled();
    });

    it("不正なCheckStringで401を返す", async () => {
      const shopPass = "test_shop_pass";
      vi.mocked(getSettingOrEnv).mockResolvedValue(shopPass);

      const params = buildParams({ CheckString: "invalid_hash_value" });
      const req = createRequest(params.toString());
      const res = await POST(req);

      expect(res.status).toBe(401);
      expect(processGmoEvent).not.toHaveBeenCalled();
    });

    it("ShopPass未設定時は署名検証をスキップして処理続行", async () => {
      vi.mocked(getSettingOrEnv).mockResolvedValue("");

      const req = createRequest();
      const res = await POST(req);

      expect(res.status).toBe(200);
      expect(processGmoEvent).toHaveBeenCalled();
    });

    it("CheckStringが空でもShopPassがある場合は検証スキップして処理続行", async () => {
      vi.mocked(getSettingOrEnv).mockResolvedValue("some_pass");
      // CheckString パラメータなし
      const params = buildParams();
      const req = createRequest(params.toString());
      const res = await POST(req);

      expect(res.status).toBe(200);
      expect(processGmoEvent).toHaveBeenCalled();
    });
  });

  // === テナント逆引き ===
  describe("テナント逆引き", () => {
    it("ヘッダーのテナントIDが優先される", async () => {
      vi.mocked(resolveTenantId).mockReturnValue("header_tenant");

      const req = createRequest();
      const res = await POST(req);

      expect(res.status).toBe(200);
      // resolveWebhookTenantは呼ばれない（ヘッダーでテナントが解決済み）
      expect(processGmoEvent).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: "header_tenant" }),
      );
    });

    it("ヘッダーなし・ShopIDからテナント逆引き成功", async () => {
      vi.mocked(resolveTenantId).mockReturnValue(null);
      vi.mocked(resolveWebhookTenant).mockResolvedValue("resolved_tenant");

      const req = createRequest();
      const res = await POST(req);

      expect(res.status).toBe(200);
      expect(resolveWebhookTenant).toHaveBeenCalledWith("gmo", "shop_id", "shop_001");
      expect(processGmoEvent).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: "resolved_tenant" }),
      );
    });

    it("テナント逆引き失敗時はwebhook_eventsに記録して200を返す", async () => {
      vi.mocked(resolveTenantId).mockReturnValue(null);
      vi.mocked(resolveWebhookTenant).mockResolvedValue(null);

      const webhookEventsChain = createMockChain(null, null);
      mockFromChains["webhook_events"] = webhookEventsChain;

      const req = createRequest();
      const res = await POST(req);

      expect(res.status).toBe(200);
      expect(processGmoEvent).not.toHaveBeenCalled();
      expect(supabaseAdmin.from).toHaveBeenCalledWith("webhook_events");
      expect(webhookEventsChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          event_source: "gmo",
          status: "failed",
        }),
      );
    });

    it("テナント逆引き失敗かつDB記録もエラーでも200を返す（例外握りつぶし）", async () => {
      vi.mocked(resolveTenantId).mockReturnValue(null);
      vi.mocked(resolveWebhookTenant).mockResolvedValue(null);

      const failChain = createMockChain(null, null);
      failChain.insert = vi.fn().mockRejectedValue(new Error("DB error"));
      mockFromChains["webhook_events"] = failChain;

      const req = createRequest();
      const res = await POST(req);

      expect(res.status).toBe(200);
      expect(processGmoEvent).not.toHaveBeenCalled();
    });

    it("ShopIDが空のときresolveWebhookTenantは呼ばれない", async () => {
      vi.mocked(resolveTenantId).mockReturnValue(null);
      const params = buildParams({ ShopID: "" });

      // ShopIDが空だとresolveWebhookTenantは呼ばれず、tenantId=nullのまま
      const webhookEventsChain = createMockChain(null, null);
      mockFromChains["webhook_events"] = webhookEventsChain;

      const req = createRequest(params.toString());
      const res = await POST(req);

      expect(res.status).toBe(200);
      expect(resolveWebhookTenant).not.toHaveBeenCalled();
    });
  });

  // === 冪等性チェック ===
  describe("冪等性チェック", () => {
    it("重複イベントはスキップされprocessGmoEventは呼ばれない", async () => {
      vi.mocked(checkIdempotency).mockResolvedValue({
        duplicate: true,
        markCompleted: vi.fn(),
        markFailed: vi.fn(),
      });

      const req = createRequest();
      const res = await POST(req);

      expect(res.status).toBe(200);
      expect(processGmoEvent).not.toHaveBeenCalled();
    });

    it("冪等性キーはAccessID_Statusで構成される", async () => {
      const params = buildParams({ AccessID: "acc_xyz", Status: "SALES" });
      const req = createRequest(params.toString());
      await POST(req);

      expect(checkIdempotency).toHaveBeenCalledWith(
        "gmo",
        "acc_xyz_SALES",
        expect.any(String),
        expect.objectContaining({ orderId: "ord_001", status: "SALES" }),
      );
    });

    it("AccessIDが空ならOrderIDが冪等キーに使われる", async () => {
      const params = buildParams({ AccessID: "", OrderID: "ord_fallback" });
      const req = createRequest(params.toString());
      await POST(req);

      expect(checkIdempotency).toHaveBeenCalledWith(
        "gmo",
        "ord_fallback_CAPTURE",
        expect.any(String),
        expect.any(Object),
      );
    });

    it("正常処理後にmarkCompletedが呼ばれる", async () => {
      const markCompleted = vi.fn().mockResolvedValue(undefined);
      vi.mocked(checkIdempotency).mockResolvedValue({
        duplicate: false,
        markCompleted,
        markFailed: vi.fn(),
      });

      const req = createRequest();
      await POST(req);

      expect(markCompleted).toHaveBeenCalled();
    });
  });

  // === processGmoEvent ハンドラ呼び出し ===
  describe("processGmoEvent ハンドラ呼び出し", () => {
    it("全パラメータが正しくハンドラに渡される", async () => {
      const params = buildParams({
        Status: "CAPTURE",
        OrderID: "ord_100",
        Amount: "25000",
        AccessID: "acc_100",
        ClientField1: "PID:p_100;Product:MJL_5mg_1m;Mode:reorder;Reorder:55;Coupon:cpn_1;Campaign:camp_1",
        ClientField2: "マンジャロ 5mg 1ヶ月",
      });

      const req = createRequest(params.toString());
      await POST(req);

      expect(processGmoEvent).toHaveBeenCalledWith({
        status: "CAPTURE",
        orderId: "ord_100",
        amount: "25000",
        accessId: "acc_100",
        patientId: "p_100",
        productCode: "MJL_5mg_1m",
        productName: "マンジャロ 5mg 1ヶ月",
        reorderId: "55",
        couponId: "cpn_1",
        campaignId: "camp_1",
        tenantId: "tenant_001",
      });
    });

    it("ClientFieldが空でも空文字でハンドラに渡される", async () => {
      const params = buildParams({ ClientField1: "", ClientField2: "" });
      const req = createRequest(params.toString());
      await POST(req);

      expect(processGmoEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          patientId: "",
          productCode: "",
          productName: "",
          reorderId: "",
        }),
      );
    });
  });

  // === エラー処理・通知 ===
  describe("エラー処理と失敗通知", () => {
    it("processGmoEventが例外を投げてもmarkFailedが呼ばれて200を返す", async () => {
      const markFailed = vi.fn().mockResolvedValue(undefined);
      vi.mocked(checkIdempotency).mockResolvedValue({
        duplicate: false,
        markCompleted: vi.fn(),
        markFailed,
      });
      vi.mocked(processGmoEvent).mockRejectedValue(new Error("DB接続エラー"));

      const req = createRequest();
      const res = await POST(req);

      expect(res.status).toBe(200);
      expect(markFailed).toHaveBeenCalledWith("DB接続エラー");
    });

    it("エラー時にnotifyWebhookFailureが呼ばれる", async () => {
      vi.mocked(processGmoEvent).mockRejectedValue(new Error("処理失敗"));

      const req = createRequest();
      await POST(req);

      expect(notifyWebhookFailure).toHaveBeenCalledWith(
        "gmo",
        "unknown",
        expect.any(Error),
        "tenant_001",
      );
    });

    it("非Errorオブジェクトの例外でもmarkFailedに'unknown error'が渡される", async () => {
      const markFailed = vi.fn().mockResolvedValue(undefined);
      vi.mocked(checkIdempotency).mockResolvedValue({
        duplicate: false,
        markCompleted: vi.fn(),
        markFailed,
      });
      vi.mocked(processGmoEvent).mockRejectedValue("文字列エラー");

      const req = createRequest();
      await POST(req);

      expect(markFailed).toHaveBeenCalledWith("unknown error");
    });

    it("冪等チェック前の例外でもidem?.markFailedが安全に呼ばれる（nullチェック）", async () => {
      // resolveTenantIdが例外を投げるケース（idem未初期化）
      vi.mocked(resolveTenantId).mockImplementation(() => {
        throw new Error("tenant resolution crash");
      });

      const req = createRequest();
      const res = await POST(req);

      expect(res.status).toBe(200);
      // markFailed は idem が null なので呼ばれない（crash しない）
      expect(notifyWebhookFailure).toHaveBeenCalled();
    });
  });

  // === parseClientField 拡張テスト ===
  describe("parseClientField 拡張: CouponとCampaign", () => {
    it("CouponとCampaignキーが正しくマッピングされる", async () => {
      const params = buildParams({
        ClientField1: "PID:p1;Coupon:coupon_abc;Campaign:camp_xyz",
      });
      const req = createRequest(params.toString());
      await POST(req);

      expect(processGmoEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          couponId: "coupon_abc",
          campaignId: "camp_xyz",
        }),
      );
    });

    it("セミコロンが連続しても空要素はスキップされる", async () => {
      const params = buildParams({
        ClientField1: "PID:p1;;Product:code1;;;",
      });
      const req = createRequest(params.toString());
      await POST(req);

      expect(processGmoEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          patientId: "p1",
          productCode: "code1",
        }),
      );
    });
  });
});
