// lib/tenant.ts — テナント解決ユーティリティ
// 既存の lib/products.ts、lib/settings.ts のパターンを共通化

/** デフォルトテナントID（シングルテナント運用時） */
export const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

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
 * 厳格なテナントフィルター（tenantId必須）
 * マルチテナント必須のAPIで使用。tenantId が null の場合はエラーをスロー。
 */
export function strictWithTenant<T>(query: T, tenantId: string | null): T {
  if (!tenantId) {
    throw new Error("tenantId is required but was null");
  }
  return (query as any).eq("tenant_id", tenantId);
}

/**
 * INSERT用のテナントIDペイロード
 * スプレッド演算子で使う: { ...tenantPayload(tenantId), ...otherFields }
 * tenantId が null の場合はデフォルトテナントIDを使用（NULLデータの再発防止）
 */
export function tenantPayload(tenantId: string | null): { tenant_id: string } {
  return { tenant_id: tenantId || DEFAULT_TENANT_ID };
}
