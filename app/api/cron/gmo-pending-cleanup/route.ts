// app/api/cron/gmo-pending-cleanup/route.ts
// 期限切れのGMO pending ordersを削除（毎時実行）
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { notifyCronFailure } from "@/lib/notifications/cron-failure";
import { withTenant } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Vercel Cron認証
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 全テナントのIDを取得
    const { data: tenants } = await supabaseAdmin
      .from("tenants")
      .select("id");

    let totalDeleted = 0;
    const tenantIds = (tenants || []).map((t) => t.id);

    for (const tenantId of tenantIds) {
      const { data, error } = await withTenant(
        supabaseAdmin
          .from("gmo_pending_orders")
          .delete()
          .lt("expires_at", new Date().toISOString())
          .select("order_id"),
        tenantId,
      );

      if (error) {
        console.error(`[gmo-pending-cleanup] tenant=${tenantId} error:`, error);
        continue;
      }

      const count = data?.length || 0;
      if (count > 0) {
        console.log(`[gmo-pending-cleanup] tenant=${tenantId} deleted ${count} expired pending orders`);
        totalDeleted += count;
      }
    }

    return NextResponse.json({ ok: true, deleted: totalDeleted });
  } catch (e) {
    console.error("[gmo-pending-cleanup] exception:", e);
    notifyCronFailure("gmo-pending-cleanup", e).catch(() => {});
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
