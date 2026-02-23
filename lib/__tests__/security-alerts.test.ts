// lib/__tests__/security-alerts.test.ts — セキュリティアラートテスト

const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockIs = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      insert: (...args: any[]) => mockInsert(...args),
      select: (...args: any[]) => {
        mockSelect(...args);
        return {
          is: (...isArgs: any[]) => {
            mockIs(...isArgs);
            return mockIs._resolveValue;
          },
        };
      },
    })),
  },
}));

import { createAlert, getUnacknowledgedCount } from "@/lib/security-alerts";

beforeEach(() => {
  vi.clearAllMocks();
  mockInsert.mockResolvedValue({ error: null });
  // デフォルトの解決値
  (mockIs as any)._resolveValue = Promise.resolve({ count: 0 });
});

describe("createAlert", () => {
  it("全パラメータ指定でinsertされる", async () => {
    await createAlert({
      tenantId: "tenant-1",
      alertType: "brute_force",
      severity: "high",
      title: "ブルートフォース検出",
      description: "5分間で10回の失敗",
      metadata: { ip: "1.2.3.4" },
    });

    expect(mockInsert).toHaveBeenCalledWith({
      tenant_id: "tenant-1",
      alert_type: "brute_force",
      severity: "high",
      title: "ブルートフォース検出",
      description: "5分間で10回の失敗",
      metadata: { ip: "1.2.3.4" },
    });
  });

  it("optionalパラメータ省略時はnull", async () => {
    await createAlert({
      alertType: "login_failure",
      severity: "low",
      title: "ログイン失敗",
    });

    expect(mockInsert).toHaveBeenCalledWith({
      tenant_id: null,
      alert_type: "login_failure",
      severity: "low",
      title: "ログイン失敗",
      description: null,
      metadata: null,
    });
  });

  it("tenantId=null → tenant_id: null", async () => {
    await createAlert({
      tenantId: null,
      alertType: "suspicious",
      severity: "medium",
      title: "不審なアクセス",
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ tenant_id: null }),
    );
  });
});

describe("getUnacknowledgedCount", () => {
  it("正常にカウントを返す", async () => {
    (mockIs as any)._resolveValue = Promise.resolve({ count: 3 });

    const count = await getUnacknowledgedCount();
    expect(count).toBe(3);
    expect(mockSelect).toHaveBeenCalledWith("id", { count: "exact", head: true });
    expect(mockIs).toHaveBeenCalledWith("acknowledged_at", null);
  });

  it("count が null の場合は 0 を返す", async () => {
    (mockIs as any)._resolveValue = Promise.resolve({ count: null });

    const count = await getUnacknowledgedCount();
    expect(count).toBe(0);
  });

  it("count が 0 の場合は 0 を返す", async () => {
    (mockIs as any)._resolveValue = Promise.resolve({ count: 0 });

    const count = await getUnacknowledgedCount();
    expect(count).toBe(0);
  });
});
