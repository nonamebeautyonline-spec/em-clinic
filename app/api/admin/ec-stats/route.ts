// app/api/admin/ec-stats/route.ts — EC統計サマリー（カゴ落ち・回収率・サブスク）
import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveTenantIdOrThrow } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);

  try {
    // カゴ落ち統計
    const { data: carts, error: cartsError } = await supabaseAdmin
      .from("abandoned_carts")
      .select("id, recovered_at")
      .eq("tenant_id", tenantId);

    if (cartsError) throw cartsError;

    const totalCarts = carts?.length ?? 0;
    const abandonedCount = carts?.filter((c) => !c.recovered_at).length ?? 0;
    const recoveredCount = carts?.filter((c) => c.recovered_at).length ?? 0;
    const recoveryRate = totalCarts > 0 ? Math.round((recoveredCount / totalCarts) * 100) : 0;

    // アクティブサブスク数
    const { count: subscriptionCount, error: subError } = await supabaseAdmin
      .from("ec_subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("status", "active");

    if (subError) throw subError;

    return NextResponse.json({
      ok: true,
      stats: {
        abandonedCount,
        recoveryRate,
        subscriptionCount: subscriptionCount ?? 0,
      },
    });
  } catch (err) {
    console.error("ec-stats GET error:", err);
    return serverError("統計の取得に失敗しました");
  }
}
