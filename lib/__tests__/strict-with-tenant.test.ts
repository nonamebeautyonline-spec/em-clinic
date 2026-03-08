// lib/__tests__/strict-with-tenant.test.ts
// strictWithTenant のユニットテスト
import { describe, it, expect } from "vitest";
import { strictWithTenant } from "@/lib/tenant";

describe("strictWithTenant", () => {
  function createMockQuery() {
    const calls: { method: string; args: unknown[] }[] = [];
    const proxy: Record<string, (...args: unknown[]) => unknown> = new Proxy(
      {} as Record<string, (...args: unknown[]) => unknown>,
      {
        get(_, prop) {
          return (...args: unknown[]) => {
            calls.push({ method: String(prop), args });
            return proxy;
          };
        },
      },
    );
    return { proxy, calls };
  }

  it("tenantIdが非nullのとき .eq('tenant_id', tenantId) を適用する", () => {
    const { proxy, calls } = createMockQuery();
    strictWithTenant(proxy, "tenant-abc-123");
    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe("eq");
    expect(calls[0].args).toEqual(["tenant_id", "tenant-abc-123"]);
  });

  it("tenantIdがnullのときエラーをスローする", () => {
    const { proxy } = createMockQuery();
    expect(() => strictWithTenant(proxy, null)).toThrow(
      "tenantId is required but was null",
    );
  });

  it("tenantIdが空文字のときエラーをスローする", () => {
    const { proxy } = createMockQuery();
    // strictWithTenant は !tenantId で判定するので空文字もエラー
    expect(() => strictWithTenant(proxy, "")).toThrow(
      "tenantId is required but was null",
    );
  });

  it("戻り値はeq適用後のクエリオブジェクトである", () => {
    const { proxy } = createMockQuery();
    const result = strictWithTenant(proxy, "tenant-xyz");
    // Proxyなので同じオブジェクトが返る
    expect(result).toBe(proxy);
  });
});
