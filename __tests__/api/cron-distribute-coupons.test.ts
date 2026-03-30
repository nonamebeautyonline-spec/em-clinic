// __tests__/api/cron-distribute-coupons.test.ts
// クーポン自動配布 Cron API のテスト
// 対象: app/api/cron/distribute-coupons/route.ts

import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { NextRequest } from "next/server";

// === Supabaseチェーンモック ===
type SupabaseChain = Record<string, Mock> & { then: Mock };

function createChain(defaultResolve = { data: null, error: null, count: 0 }): SupabaseChain {
  const chain = {} as SupabaseChain;
  ["insert","update","delete","select","eq","neq","gt","gte","lt","lte",
   "in","is","not","order","limit","range","single","maybeSingle","upsert",
   "ilike","or","count","csv","like","head"].forEach(m => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = vi.fn((resolve: (val: unknown) => unknown) => resolve(defaultResolve));
  return chain;
}

// テーブルごとにチェーンを管理
let tableChains: Record<string, SupabaseChain> = {};
let tableCallCounts: Record<string, number> = {};
let tableChainsList: Record<string, SupabaseChain[]> = {};

function setChainForTable(table: string, chain: SupabaseChain) {
  tableChains[table] = chain;
}

function setChainsForTable(table: string, chains: SupabaseChain[]) {
  tableChainsList[table] = chains;
  tableCallCounts[table] = 0;
}

function getChainForTable(table: string): SupabaseChain {
  // 複数チェーンが設定されている場合は順番に返す
  if (tableChainsList[table] && tableChainsList[table].length > 0) {
    const idx = tableCallCounts[table] || 0;
    tableCallCounts[table] = idx + 1;
    return tableChainsList[table][Math.min(idx, tableChainsList[table].length - 1)];
  }
  if (!tableChains[table]) tableChains[table] = createChain();
  return tableChains[table];
}

// === モック定義 ===
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: vi.fn((table: string) => getChainForTable(table)) },
}));

vi.mock("@/lib/tenant", () => ({
  withTenant: vi.fn((q: SupabaseChain) => q),
  strictWithTenant: vi.fn((q: SupabaseChain) => q),
  tenantPayload: vi.fn(() => ({ tenant_id: "test-tenant" })),
}));

const mockPushMessage = vi.fn().mockResolvedValue({ ok: true });
vi.mock("@/lib/line-push", () => ({
  pushMessage: (...args: unknown[]) => mockPushMessage(...args),
}));

const mockAcquireLock = vi.fn();
vi.mock("@/lib/distributed-lock", () => ({
  acquireLock: (...args: unknown[]) => mockAcquireLock(...args),
}));

vi.mock("@/lib/notifications/cron-failure", () => ({
  notifyCronFailure: vi.fn().mockResolvedValue(undefined),
}));

import { GET } from "@/app/api/cron/distribute-coupons/route";

// === テスト本体 ===
describe("GET /api/cron/distribute-coupons", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
    tableChainsList = {};
    tableCallCounts = {};
    mockAcquireLock.mockResolvedValue({ acquired: true, release: vi.fn() });
  });

  // ------------------------------------------------------------------
  // 認証テスト
  // ------------------------------------------------------------------
  describe("Cron認証", () => {
    it("CRON_SECRET不一致の場合は401を返す", async () => {
      process.env.CRON_SECRET = "valid-secret";
      const req = new NextRequest("http://localhost/api/cron/distribute-coupons", {
        headers: { authorization: "Bearer wrong-secret" },
      });
      const res = await GET(req);
      expect(res.status).toBe(401);
      delete process.env.CRON_SECRET;
    });

    it("CRON_SECRET未設定の場合は認証スキップ", async () => {
      delete process.env.CRON_SECRET;
      // ルールなし → 正常終了
      setChainForTable("coupon_distribution_rules", createChain({ data: [], error: null, count: 0 }));

      const req = new NextRequest("http://localhost/api/cron/distribute-coupons");
      const res = await GET(req);
      expect(res.status).toBe(200);
    });
  });

  // ------------------------------------------------------------------
  // 排他制御テスト
  // ------------------------------------------------------------------
  describe("排他制御", () => {
    it("ロック取得失敗時はスキップレスポンスを返す", async () => {
      mockAcquireLock.mockResolvedValue({ acquired: false, release: vi.fn() });

      const req = new NextRequest("http://localhost/api/cron/distribute-coupons");
      const res = await GET(req);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.skipped).toBe("別のプロセスが実行中");
    });
  });

  // ------------------------------------------------------------------
  // ルールなしテスト
  // ------------------------------------------------------------------
  describe("ルールなし", () => {
    it("アクティブなルールがない場合は processed=0 で終了", async () => {
      setChainForTable("coupon_distribution_rules", createChain({ data: [], error: null, count: 0 }));

      const req = new NextRequest("http://localhost/api/cron/distribute-coupons");
      const res = await GET(req);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.processed).toBe(0);
    });

    it("ルール取得エラーの場合は500を返す", async () => {
      setChainForTable("coupon_distribution_rules", createChain({ data: null, error: { message: "DB error" }, count: 0 }));

      const req = new NextRequest("http://localhost/api/cron/distribute-coupons");
      const res = await GET(req);
      expect(res.status).toBe(500);
    });
  });

  // ------------------------------------------------------------------
  // クーポン無効テスト
  // ------------------------------------------------------------------
  describe("クーポン有効性チェック", () => {
    it("クーポンが無効の場合はスキップされる", async () => {
      const rule = {
        id: "rule-1",
        tenant_id: "test-tenant",
        coupon_id: 1,
        name: "テストルール",
        trigger_type: "birthday",
        trigger_config: {},
        is_active: true,
      };
      setChainForTable("coupon_distribution_rules", createChain({ data: [rule], error: null, count: 1 }));
      // クーポンが無効
      setChainForTable("coupons", createChain({ data: { id: 1, name: "テスト", code: "TEST", is_active: false }, error: null, count: 0 }));

      const req = new NextRequest("http://localhost/api/cron/distribute-coupons");
      const res = await GET(req);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.distributed).toBe(0);
    });
  });

  // ------------------------------------------------------------------
  // 誕生日トリガーテスト
  // ------------------------------------------------------------------
  describe("birthday トリガー", () => {
    it("今日が誕生日の患者にクーポンを配布する", async () => {
      const rule = {
        id: "rule-bd",
        tenant_id: "test-tenant",
        coupon_id: 1,
        name: "誕生日クーポン",
        trigger_type: "birthday",
        trigger_config: {},
        is_active: true,
      };
      const coupon = {
        id: 1, name: "誕生日割", code: "BDAY100",
        discount_type: "fixed", discount_value: 1000,
        valid_until: null, is_active: true,
      };

      setChainForTable("coupon_distribution_rules", createChain({ data: [rule], error: null, count: 1 }));
      setChainForTable("coupons", createChain({ data: coupon, error: null, count: 0 }));
      // 誕生日の患者
      setChainForTable("patients", createChain({ data: [{ patient_id: "PT-BD1", line_id: "Ubd1" }], error: null, count: 1 }));
      // 配布済みログなし
      setChainForTable("coupon_distribution_logs", createChain({ data: [], error: null, count: 0 }));
      // 配布INSERT成功
      setChainForTable("coupon_issues", createChain({ data: null, error: null, count: 0 }));
      setChainForTable("message_log", createChain({ data: null, error: null, count: 0 }));

      const req = new NextRequest("http://localhost/api/cron/distribute-coupons");
      const res = await GET(req);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.distributed).toBe(1);
    });
  });

  // ------------------------------------------------------------------
  // 重複防止テスト
  // ------------------------------------------------------------------
  describe("重複配布防止", () => {
    it("既に配布済みの患者はスキップされる", async () => {
      const rule = {
        id: "rule-dup",
        tenant_id: "test-tenant",
        coupon_id: 2,
        name: "重複テスト",
        trigger_type: "birthday",
        trigger_config: {},
        is_active: true,
      };
      const coupon = {
        id: 2, name: "割引", code: "DUP",
        discount_type: "percent", discount_value: 10,
        valid_until: null, is_active: true,
      };

      setChainForTable("coupon_distribution_rules", createChain({ data: [rule], error: null, count: 1 }));
      setChainForTable("coupons", createChain({ data: coupon, error: null, count: 0 }));
      // 対象患者2名
      setChainForTable("patients", createChain({
        data: [
          { patient_id: "PT-A", line_id: "Ua" },
          { patient_id: "PT-B", line_id: "Ub" },
        ],
        error: null, count: 2,
      }));
      // PT-Aは既に配布済み
      setChainForTable("coupon_distribution_logs", createChain({
        data: [{ patient_id: "PT-A" }],
        error: null, count: 1,
      }));
      setChainForTable("coupon_issues", createChain({ data: null, error: null, count: 0 }));
      setChainForTable("message_log", createChain({ data: null, error: null, count: 0 }));

      const req = new NextRequest("http://localhost/api/cron/distribute-coupons");
      const res = await GET(req);
      const body = await res.json();
      expect(body.ok).toBe(true);
      // PT-Bのみ配布 = 1件、PT-Aはスキップ = 1件
      expect(body.distributed).toBe(1);
      expect(body.skipped).toBe(1);
    });
  });

  // ------------------------------------------------------------------
  // LINE通知テスト
  // ------------------------------------------------------------------
  describe("LINE通知", () => {
    it("line_idがある患者にはLINE通知が送信される", async () => {
      const rule = {
        id: "rule-line",
        tenant_id: "test-tenant",
        coupon_id: 3,
        name: "LINE通知テスト",
        trigger_type: "birthday",
        trigger_config: {},
        is_active: true,
      };
      const coupon = {
        id: 3, name: "テスト割引", code: "LINE100",
        discount_type: "fixed", discount_value: 500,
        valid_until: "2026-12-31T00:00:00Z", is_active: true,
      };

      setChainForTable("coupon_distribution_rules", createChain({ data: [rule], error: null, count: 1 }));
      setChainForTable("coupons", createChain({ data: coupon, error: null, count: 0 }));
      setChainForTable("patients", createChain({ data: [{ patient_id: "PT-L1", line_id: "Ul1" }], error: null, count: 1 }));
      setChainForTable("coupon_distribution_logs", createChain({ data: [], error: null, count: 0 }));
      setChainForTable("coupon_issues", createChain({ data: null, error: null, count: 0 }));
      setChainForTable("message_log", createChain({ data: null, error: null, count: 0 }));

      const req = new NextRequest("http://localhost/api/cron/distribute-coupons");
      await GET(req);

      // pushMessageが呼ばれ、クーポンコードが含まれる
      expect(mockPushMessage).toHaveBeenCalled();
      const callArgs = mockPushMessage.mock.calls[0];
      expect(callArgs[0]).toBe("Ul1");
      const msgText = callArgs[1][0].text;
      expect(msgText).toContain("LINE100");
      expect(msgText).toContain("¥500OFF");
    });

    it("line_idがない患者にはLINE通知を送信しない", async () => {
      const rule = {
        id: "rule-noline",
        tenant_id: "test-tenant",
        coupon_id: 4,
        name: "LINE無しテスト",
        trigger_type: "birthday",
        trigger_config: {},
        is_active: true,
      };
      const coupon = {
        id: 4, name: "テスト", code: "NOLINE",
        discount_type: "percent", discount_value: 20,
        valid_until: null, is_active: true,
      };

      setChainForTable("coupon_distribution_rules", createChain({ data: [rule], error: null, count: 1 }));
      setChainForTable("coupons", createChain({ data: coupon, error: null, count: 0 }));
      // line_idがnull
      setChainForTable("patients", createChain({ data: [{ patient_id: "PT-NL", line_id: null }], error: null, count: 1 }));
      setChainForTable("coupon_distribution_logs", createChain({ data: [], error: null, count: 0 }));
      setChainForTable("coupon_issues", createChain({ data: null, error: null, count: 0 }));

      const req = new NextRequest("http://localhost/api/cron/distribute-coupons");
      await GET(req);

      // pushMessageは呼ばれない
      expect(mockPushMessage).not.toHaveBeenCalled();
    });
  });

  // ------------------------------------------------------------------
  // 割引表示テスト（ロジック検証）
  // ------------------------------------------------------------------
  describe("割引テキスト生成（ロジック検証）", () => {
    it("fixed の場合は ¥{value}OFF 形式", () => {
      const discount_type = "fixed";
      const discount_value = 1000;
      const text = discount_type === "percent"
        ? `${discount_value}%OFF`
        : `¥${discount_value.toLocaleString()}OFF`;
      expect(text).toBe("¥1,000OFF");
    });

    it("percent の場合は {value}%OFF 形式", () => {
      const discount_type = "percent";
      const discount_value = 15;
      const text = discount_type === "percent"
        ? `${discount_value}%OFF`
        : `¥${discount_value.toLocaleString()}OFF`;
      expect(text).toBe("15%OFF");
    });
  });

  // ------------------------------------------------------------------
  // 対象患者がいないケース
  // ------------------------------------------------------------------
  describe("対象患者なし", () => {
    it("対象患者がいない場合は配布をスキップ", async () => {
      const rule = {
        id: "rule-empty",
        tenant_id: "test-tenant",
        coupon_id: 5,
        name: "対象なし",
        trigger_type: "birthday",
        trigger_config: {},
        is_active: true,
      };
      const coupon = {
        id: 5, name: "テスト", code: "EMPTY",
        discount_type: "fixed", discount_value: 100,
        valid_until: null, is_active: true,
      };

      setChainForTable("coupon_distribution_rules", createChain({ data: [rule], error: null, count: 1 }));
      setChainForTable("coupons", createChain({ data: coupon, error: null, count: 0 }));
      // 誕生日の患者なし
      setChainForTable("patients", createChain({ data: [], error: null, count: 0 }));

      const req = new NextRequest("http://localhost/api/cron/distribute-coupons");
      const res = await GET(req);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.distributed).toBe(0);
    });
  });

  // ------------------------------------------------------------------
  // ロック解放テスト
  // ------------------------------------------------------------------
  describe("ロック解放", () => {
    it("正常終了時にロックが解放される", async () => {
      const releaseMock = vi.fn();
      mockAcquireLock.mockResolvedValue({ acquired: true, release: releaseMock });
      setChainForTable("coupon_distribution_rules", createChain({ data: [], error: null, count: 0 }));

      const req = new NextRequest("http://localhost/api/cron/distribute-coupons");
      await GET(req);

      expect(releaseMock).toHaveBeenCalled();
    });

    it("エラー発生時もロックが解放される", async () => {
      const releaseMock = vi.fn();
      mockAcquireLock.mockResolvedValue({ acquired: true, release: releaseMock });
      // ルール取得でエラー
      setChainForTable("coupon_distribution_rules", createChain({ data: null, error: { message: "error" }, count: 0 }));

      const req = new NextRequest("http://localhost/api/cron/distribute-coupons");
      await GET(req);

      expect(releaseMock).toHaveBeenCalled();
    });
  });
});
