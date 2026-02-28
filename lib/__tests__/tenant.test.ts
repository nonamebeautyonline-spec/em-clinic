// lib/__tests__/tenant.test.ts
// テナント解決ユーティリティのテスト
import { describe, it, expect } from "vitest";
import { resolveTenantId, withTenant, tenantPayload } from "@/lib/tenant";

// === resolveTenantId テスト ===
describe("resolveTenantId", () => {
  it("x-tenant-idヘッダーがあればテナントIDを返す", () => {
    const headers = new Headers({ "x-tenant-id": "tenant_abc" });
    const req = { headers } as Request;
    expect(resolveTenantId(req)).toBe("tenant_abc");
  });

  it("ヘッダーがなければnullを返す", () => {
    const headers = new Headers();
    const req = { headers } as Request;
    expect(resolveTenantId(req)).toBeNull();
  });

  it("requestがundefinedならnullを返す", () => {
    expect(resolveTenantId(undefined)).toBeNull();
  });

  it("request.headersがundefinedならnullを返す", () => {
    expect(resolveTenantId({} as Request)).toBeNull();
  });

  it("headersプロパティを持つオブジェクトでも動作", () => {
    const headers = new Headers({ "x-tenant-id": "tenant_xyz" });
    expect(resolveTenantId({ headers })).toBe("tenant_xyz");
  });
});

// === withTenant テスト ===
describe("withTenant", () => {
  it("tenantIdが非nullならeqが呼ばれる", () => {
    const mockQuery = {
      eq: (col: string, val: string) => ({ _filtered: true, col, val }),
    };
    const result = withTenant(mockQuery, "tenant_abc") as any;
    expect(result._filtered).toBe(true);
    expect(result.col).toBe("tenant_id");
    expect(result.val).toBe("tenant_abc");
  });

  it("tenantIdがnullならクエリをそのまま返す", () => {
    const mockQuery = { from: "test" };
    const result = withTenant(mockQuery, null);
    expect(result).toBe(mockQuery);
  });

  it("tenantIdが空文字ならクエリをそのまま返す", () => {
    const mockQuery = { from: "test" };
    const result = withTenant(mockQuery, "");
    expect(result).toBe(mockQuery);
  });
});

// === tenantPayload テスト ===
describe("tenantPayload", () => {
  it("tenantIdが非nullならtenant_idを含む", () => {
    expect(tenantPayload("tenant_abc")).toEqual({ tenant_id: "tenant_abc" });
  });

  it("tenantIdがnullならデフォルトテナントIDにフォールバック", () => {
    expect(tenantPayload(null)).toEqual({ tenant_id: "00000000-0000-0000-0000-000000000001" });
  });

  it("tenantIdが空文字ならデフォルトテナントIDにフォールバック", () => {
    expect(tenantPayload("")).toEqual({ tenant_id: "00000000-0000-0000-0000-000000000001" });
  });
});
