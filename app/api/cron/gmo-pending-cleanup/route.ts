// app/api/cron/gmo-pending-cleanup/route.ts
// 期限切れのGMO pending ordersを削除（毎時実行）
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Vercel Cron認証
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("gmo_pending_orders")
      .delete()
      .lt("expires_at", new Date().toISOString())
      .select("order_id");

    const count = data?.length || 0;
    if (error) {
      console.error("[gmo-pending-cleanup] error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (count > 0) {
      console.log(`[gmo-pending-cleanup] deleted ${count} expired pending orders`);
    }

    return NextResponse.json({ ok: true, deleted: count });
  } catch (e) {
    console.error("[gmo-pending-cleanup] exception:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
