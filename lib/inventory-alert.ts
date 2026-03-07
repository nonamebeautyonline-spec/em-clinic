// lib/inventory-alert.ts — 在庫アラート（閾値通知）ロジック
import { supabaseAdmin } from "@/lib/supabase";
import { withTenant, tenantPayload } from "@/lib/tenant";

export interface InventoryAlert {
  id: string;
  tenant_id: string;
  product_id: string;
  current_stock: number;
  threshold: number;
  resolved_at: string | null;
  created_at: string;
  // JOIN で取得
  product_title?: string;
  product_code?: string;
}

/**
 * 在庫アラートをチェックし、必要に応じて作成・解消する
 * - stock_alert_enabled=true かつ stock_quantity <= threshold の商品を検出
 * - 未解消アラートが既にあればスキップ（重複防止）
 * - 閾値超過が回復した場合は resolved_at を設定
 */
export async function checkInventoryAlerts(tenantId: string | null): Promise<{
  created: number;
  resolved: number;
}> {
  let result = { created: 0, resolved: 0 };

  // 1. アラート有効な商品を取得
  let productQuery = supabaseAdmin
    .from("products")
    .select("id, title, code, stock_quantity, stock_alert_threshold, stock_alert_enabled")
    .eq("stock_alert_enabled", true)
    .eq("is_active", true)
    .not("stock_alert_threshold", "is", null);
  productQuery = withTenant(productQuery, tenantId);
  const { data: products, error: pErr } = await productQuery;

  if (pErr || !products) {
    console.error("[inventory-alert] 商品取得エラー:", pErr?.message);
    return result;
  }

  // 2. 未解消アラートを取得
  let alertQuery = supabaseAdmin
    .from("inventory_alerts")
    .select("id, product_id, current_stock, threshold")
    .is("resolved_at", null);
  alertQuery = withTenant(alertQuery, tenantId);
  const { data: existingAlerts } = await alertQuery;

  const alertMap = new Map<string, { id: string; current_stock: number }>();
  for (const a of existingAlerts ?? []) {
    alertMap.set(a.product_id, { id: a.id, current_stock: a.current_stock });
  }

  // 3. 各商品をチェック
  for (const product of products) {
    const stock = product.stock_quantity;
    const threshold = product.stock_alert_threshold;

    // stock_quantity が null（無制限）の場合はアラート不要
    if (stock == null || threshold == null) continue;

    const existing = alertMap.get(product.id);

    if (stock <= threshold) {
      // 閾値以下: アラートが未登録なら作成
      if (!existing) {
        const { error: insertErr } = await supabaseAdmin
          .from("inventory_alerts")
          .insert({
            ...tenantPayload(tenantId),
            product_id: product.id,
            current_stock: stock,
            threshold,
          });
        if (insertErr) {
          console.error("[inventory-alert] アラート作成エラー:", insertErr.message);
        } else {
          result.created++;
        }
      } else if (existing.current_stock !== stock) {
        // 在庫数が変わった場合は更新
        await supabaseAdmin
          .from("inventory_alerts")
          .update({ current_stock: stock })
          .eq("id", existing.id);
      }
    } else {
      // 閾値超過回復: 未解消アラートがあれば解消
      if (existing) {
        const { error: resolveErr } = await supabaseAdmin
          .from("inventory_alerts")
          .update({ resolved_at: new Date().toISOString() })
          .eq("id", existing.id);
        if (resolveErr) {
          console.error("[inventory-alert] アラート解消エラー:", resolveErr.message);
        } else {
          result.resolved++;
        }
      }
    }
  }

  return result;
}

/**
 * 未解消アラート一覧を取得（商品情報付き）
 */
export async function getUnresolvedAlerts(tenantId: string | null): Promise<InventoryAlert[]> {
  let query = supabaseAdmin
    .from("inventory_alerts")
    .select("id, tenant_id, product_id, current_stock, threshold, resolved_at, created_at, products(title, code)")
    .is("resolved_at", null)
    .order("created_at", { ascending: false });
  query = withTenant(query, tenantId);

  const { data, error } = await query;
  if (error || !data) {
    console.error("[inventory-alert] アラート一覧取得エラー:", error?.message);
    return [];
  }

  return data.map((row: Record<string, unknown>) => {
    const products = row.products as { title: string; code: string } | null;
    return {
      id: row.id as string,
      tenant_id: row.tenant_id as string,
      product_id: row.product_id as string,
      current_stock: row.current_stock as number,
      threshold: row.threshold as number,
      resolved_at: row.resolved_at as string | null,
      created_at: row.created_at as string,
      product_title: products?.title,
      product_code: products?.code,
    };
  });
}

/**
 * 未解消アラート件数を取得（バッジ用）
 */
export async function getUnresolvedAlertCount(tenantId: string | null): Promise<number> {
  let query = supabaseAdmin
    .from("inventory_alerts")
    .select("*", { count: "exact", head: true })
    .is("resolved_at", null);
  query = withTenant(query, tenantId);

  const { count, error } = await query;
  if (error) {
    console.error("[inventory-alert] アラート件数取得エラー:", error.message);
    return 0;
  }

  return count ?? 0;
}
