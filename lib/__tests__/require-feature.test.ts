// lib/__tests__/require-feature.test.ts — 機能チェックテスト

const mockResolveTenantId = vi.fn();
const mockHasFeature = vi.fn();

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: (...args: any[]) => mockResolveTenantId(...args),
}));

vi.mock("@/lib/feature-flags", () => ({
  hasFeature: (...args: any[]) => mockHasFeature(...args),
}));

import { requireFeature } from "@/lib/require-feature";

beforeEach(() => {
  vi.clearAllMocks();
  mockResolveTenantId.mockReturnValue("tenant-1");
});

describe("requireFeature", () => {
  it("機能が有効 → null を返す", async () => {
    mockHasFeature.mockResolvedValue(true);

    const result = await requireFeature(new Request("http://localhost/api/test"), "ai_reply" as any);
    expect(result).toBeNull();
    expect(mockHasFeature).toHaveBeenCalledWith("tenant-1", "ai_reply");
  });

  it("機能が無効 → 403レスポンスを返す", async () => {
    mockHasFeature.mockResolvedValue(false);

    const result = await requireFeature(new Request("http://localhost/api/test"), "ai_reply" as any);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
    const body = await result!.json();
    expect(body.error).toContain("プラン");
  });

  it("tenantId を正しく解決して渡す", async () => {
    mockResolveTenantId.mockReturnValue("custom-tenant");
    mockHasFeature.mockResolvedValue(true);

    await requireFeature(new Request("http://localhost/api/test"), "ehr" as any);
    expect(mockHasFeature).toHaveBeenCalledWith("custom-tenant", "ehr");
  });

  it("tenantId が null の場合もエラーにならない", async () => {
    mockResolveTenantId.mockReturnValue(null);
    mockHasFeature.mockResolvedValue(true);

    const result = await requireFeature(new Request("http://localhost/api/test"), "ai_reply" as any);
    expect(result).toBeNull();
    expect(mockHasFeature).toHaveBeenCalledWith(null, "ai_reply");
  });
});
