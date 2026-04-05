// lib/purchase/first-purchase.ts — 初回購入CP判定

import { supabaseAdmin } from "@/lib/supabase";
import { strictWithTenant } from "@/lib/tenant";

/**
 * マンジャロの初回購入かどうかを判定
 * - ordersテーブルで当該患者のinjectionカテゴリ注文を確認
 * - リベルサス等のoral注文のみ → マンジャロ初回なのでtrue
 * - マンジャロ注文あり → false
 *
 * 初回CPルール: 通常便として発送だが予約便価格を適用
 */
export async function isFirstManjaro(
  patientId: string,
  tenantId: string
): Promise<boolean> {
  // ordersテーブルからマンジャロ（injection）の決済済み注文を検索
  // order_items（カートモード）またはproduct_code（単一モード）を確認
  const { count, error } = await strictWithTenant(
    supabaseAdmin
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("patient_id", patientId)
      .in("payment_status", ["paid", "COMPLETED"])
      .or("product_code.like.MJL_%,order_items.cs.[{\"code\":\"MJL_\"}]"),
    tenantId
  );

  if (error) {
    console.error("[first-purchase] query error:", error.message);
    // エラー時は安全側（初回ではない）に倒す
    return false;
  }

  return (count ?? 0) === 0;
}

/**
 * フロントエンド用: products APIレスポンスに初回CPフラグを付与
 */
export async function checkFirstPurchaseForPatient(
  patientId: string,
  tenantId: string
): Promise<{ isFirstManjaro: boolean }> {
  const first = await isFirstManjaro(patientId, tenantId);
  return { isFirstManjaro: first };
}
