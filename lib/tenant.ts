// lib/tenant.ts — テナント解決ユーティリティ
// 既存の lib/products.ts、lib/settings.ts のパターンを共通化

/**
 * リクエストからテナントIDを解決する
 * 1. middleware.ts が JWT から抽出した x-tenant-id ヘッダー（管理画面）
 * 2. 将来: サブドメイン → tenant_id 解決
 * 3. フォールバック: null（シングルテナント互換）
 */
export function resolveTenantId(request?: Request | { headers?: Headers }): string | null {
  if (!request?.headers) return null;

  // middleware.ts が JWT の tenantId を x-tenant-id ヘッダーに設定済み
  const headerTenantId = request.headers.get("x-tenant-id");
  if (headerTenantId) return headerTenantId;

  // TODO: サブドメインからテナントIDを解決
  // const host = request.headers.get("host") || "";
  // const slug = host.split(".")[0];
  // return lookupTenantBySlug(slug);

  return null;
}

/**
 * クエリにテナントフィルターを追加
 * - tenantId が非null: .eq("tenant_id", tenantId)
 * - tenantId が null: .is("tenant_id", null)
 */
export function withTenant<T>(query: T, tenantId: string | null): T {
  if (tenantId) {
    return (query as any).eq("tenant_id", tenantId);
  }
  return (query as any).is("tenant_id", null);
}

/**
 * INSERT用のテナントIDペイロード
 * スプレッド演算子で使う: { ...tenantPayload(tenantId), ...otherFields }
 */
export function tenantPayload(tenantId: string | null): { tenant_id: string | null } {
  return { tenant_id: tenantId || null };
}
