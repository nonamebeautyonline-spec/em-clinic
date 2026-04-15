// lib/__tests__/ad-conversion.test.ts — 広告コンバージョンCAPIテスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Supabase チェーンモック ---
function createChain(defaultResolve = { data: null, error: null }) {
  const chain: Record<string, unknown> = {};
  ["select", "insert", "update", "delete", "eq", "neq", "is", "not",
   "or", "order", "limit", "single", "maybeSingle", "in", "gte"].forEach(m => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = vi.fn((resolve: (val: unknown) => unknown) => resolve(defaultResolve));
  return chain;
}

const mockFrom = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: (...args: unknown[]) => mockFrom(...args) },
}));

vi.mock("@/lib/tenant", () => ({
  strictWithTenant: vi.fn((q: unknown) => q),
  tenantPayload: vi.fn((tid: string) => ({ tenant_id: tid })),
}));

// fetchモック
const mockFetch = vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve("") });
vi.stubGlobal("fetch", mockFetch);

import { sendAdConversions } from "../ad-conversion";

describe("sendAdConversions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({ ok: true, text: () => Promise.resolve("") });
  });

  it("patientId がない場合はスキップ", async () => {
    await sendAdConversions("payment_completed", { tenantId: "t1" });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("tenantId がない場合はスキップ", async () => {
    await sendAdConversions("payment_completed", { patientId: "p1" });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("conversionEventName がない場合はスキップ", async () => {
    await sendAdConversions("payment_completed", { patientId: "p1", tenantId: "t1" });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("クリックIDが見つからない場合はスキップ（2回目のDB呼び出しもnull）", async () => {
    // 1回目: gclid検索 → null、2回目: fbclid/twclid/ttclid検索 → null
    mockFrom
      .mockReturnValueOnce(createChain({ data: null, error: null }))
      .mockReturnValueOnce(createChain({ data: null, error: null }));

    await sendAdConversions("payment_completed", {
      patientId: "p1",
      tenantId: "t1",
      conversionEventName: "Purchase",
    });

    // ad_platforms の取得まで行かない
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("アクティブなプラットフォームがない場合はスキップ", async () => {
    // 1回目: gclid検索 → 見つかる
    mockFrom
      .mockReturnValueOnce(createChain({
        data: { gclid: "gclid123", fbclid: null, twclid: null, ttclid: null, user_agent: "ua", ip_address: "1.2.3.4" },
        error: null,
      }))
      // 2回目: ad_platforms → 空
      .mockReturnValueOnce(createChain({ data: [], error: null }));

    await sendAdConversions("payment_completed", {
      patientId: "p1",
      tenantId: "t1",
      conversionEventName: "Purchase",
    });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("Meta CAPIにfbclid付きでCV送信する", async () => {
    const clickIds = {
      gclid: null,
      fbclid: "fb_click_123",
      twclid: null,
      ttclid: null,
      user_agent: "TestAgent",
      ip_address: "1.2.3.4",
    };
    const platforms = [{
      id: "platform-1",
      name: "meta",
      config: JSON.stringify({ pixel_id: "PX123", access_token: "token123" }),
    }];

    mockFrom
      .mockReturnValueOnce(createChain({ data: null, error: null })) // gclid検索 → null
      .mockReturnValueOnce(createChain({ data: clickIds, error: null })) // fbclid検索 → 見つかる
      .mockReturnValueOnce(createChain({ data: platforms, error: null })) // platforms
      .mockReturnValueOnce(createChain({ data: null, error: null })); // ログ

    await sendAdConversions("payment_completed", {
      patientId: "p1",
      tenantId: "t1",
      conversionEventName: "Purchase",
      conversionValue: 5000,
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("graph.facebook.com"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("Google AdsにgclidでCV送信する", async () => {
    const clickIds = {
      gclid: "gclid_abc",
      fbclid: null,
      twclid: null,
      ttclid: null,
      user_agent: "TestAgent",
      ip_address: "1.2.3.4",
    };
    const platforms = [{
      id: "platform-2",
      name: "google",
      config: JSON.stringify({ customer_id: "CID", conversion_action_id: "CAID", oauth_token: "tk", developer_token: "dt" }),
    }];

    mockFrom
      .mockReturnValueOnce(createChain({ data: clickIds, error: null })) // gclid検索 → 見つかる
      .mockReturnValueOnce(createChain({ data: platforms, error: null })) // platforms
      .mockReturnValueOnce(createChain({ data: null, error: null })); // ログ

    await sendAdConversions("payment_completed", {
      patientId: "p1",
      tenantId: "t1",
      conversionEventName: "Purchase",
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("googleads.googleapis.com"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("API失敗時はエラーをログに記録する", async () => {
    const clickIds = {
      gclid: null,
      fbclid: "fb_123",
      twclid: null,
      ttclid: null,
      user_agent: null,
      ip_address: null,
    };
    const platforms = [{
      id: "platform-1",
      name: "meta",
      config: JSON.stringify({ pixel_id: "PX123", access_token: "token123" }),
    }];

    mockFetch.mockResolvedValue({ ok: false, status: 500, text: () => Promise.resolve("Internal Error") });

    mockFrom
      .mockReturnValueOnce(createChain({ data: null, error: null })) // gclid検索 → null
      .mockReturnValueOnce(createChain({ data: clickIds, error: null })) // fbclid検索
      .mockReturnValueOnce(createChain({ data: platforms, error: null })) // platforms
      .mockReturnValueOnce(createChain({ data: null, error: null })); // エラーログ

    // エラーが投げられずに正常終了する（ログに記録される）
    await expect(sendAdConversions("payment_completed", {
      patientId: "p1",
      tenantId: "t1",
      conversionEventName: "Purchase",
    })).resolves.toBeUndefined();

    // ad_conversion_logs にinsertが呼ばれる（エラーログ）
    expect(mockFrom).toHaveBeenCalledWith("ad_conversion_logs");
  });
});
