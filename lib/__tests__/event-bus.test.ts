// lib/__tests__/event-bus.test.ts — イベントバスのユニットテスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// supabaseAdmin のモック
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: () => ({
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  },
}));
vi.mock("@/lib/tenant", () => ({
  tenantPayload: (tid: string) => ({ tenant_id: tid }),
}));

// モック後にインポート
const { fireEvent, registerSubscriber } = await import("@/lib/event-bus");

describe("event-bus", () => {
  it("サブスクライバーが呼び出されること", async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    registerSubscriber(handler);

    await fireEvent("tag_added", {
      tenantId: "test-tenant",
      patientId: "P001",
      eventData: { tagId: 1 },
    });

    // デフォルトのlogEventサブスクライバー + 登録したhandler
    expect(handler).toHaveBeenCalledWith("tag_added", {
      tenantId: "test-tenant",
      patientId: "P001",
      eventData: { tagId: 1 },
    });
  });

  it("サブスクライバーの失敗が他に影響しないこと", async () => {
    const failingHandler = vi.fn().mockRejectedValue(new Error("テストエラー"));
    const successHandler = vi.fn().mockResolvedValue(undefined);

    registerSubscriber(failingHandler);
    registerSubscriber(successHandler);

    // エラーを投げずに完了すること
    await expect(
      fireEvent("follow", { tenantId: "test-tenant", patientId: "P001" }),
    ).resolves.toBeUndefined();

    expect(failingHandler).toHaveBeenCalled();
    expect(successHandler).toHaveBeenCalled();
  });
});
