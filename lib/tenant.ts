// lib/tenant.ts — テナント解決ユーティリティ
// 既存の lib/products.ts、lib/settings.ts のパターンを共通化

/**
 * リクエストからテナントIDを解決する
 * 1. middleware.ts が JWT から抽出した x-tenant-id ヘッダー（管理画面）
 * 2. サブドメイン → middleware で slug 解決 → x-tenant-id ヘッダー
 * 3. フォールバック: null（シングルテナント互換）
 *
 * サーバーコンポーネントでは `await headers()` の結果を渡す:
 *   const h = await headers();
 *   const tenantId = resolveTenantId({ headers: h });
 */
export function resolveTenantId(request?: Request | { headers?: Headers }): string | null {
  if (!request?.headers) return null;

  const headerTenantId = request.headers.get("x-tenant-id");
  if (headerTenantId) return headerTenantId;

  return null;
}

/**
 * クエリにテナントフィルターを追加
 * - tenantId が非null: .eq("tenant_id", tenantId)
 * - tenantId が null: フィルターなし（シングルテナント互換）
 */
export function withTenant<T>(query: T, tenantId: string | null): T {
  if (tenantId) {
    return (query as any).eq("tenant_id", tenantId);
  }
  return query;
}

/**
 * INSERT用のテナントIDペイロード
 * スプレッド演算子で使う: { ...tenantPayload(tenantId), ...otherFields }
 */
export function tenantPayload(tenantId: string | null): { tenant_id: string | null } {
  return { tenant_id: tenantId || null };
}
