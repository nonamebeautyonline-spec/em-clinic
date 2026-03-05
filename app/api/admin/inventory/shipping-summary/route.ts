// app/api/admin/inventory/shipping-summary/route.ts
// のなめ発送用: 指定日の発送済み注文から用量別箱数を集計
import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveTenantId, withTenant } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) {
    return unauthorized();
  }

  const tenantId = resolveTenantId(req);
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");

  if (!date) {
    return badRequest("date パラメータが必要です");
  }

  try {
    // 指定日の 0:00〜翌日0:00（JST）でフィルター
    const dayStart = new Date(`${date}T00:00:00+09:00`);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const { data: orders, error } = await withTenant(
      supabaseAdmin
        .from("orders")
        .select("product_code")
        .gte("shipping_list_created_at", dayStart.toISOString())
        .lt("shipping_list_created_at", dayEnd.toISOString()),
      tenantId
    );

    if (error) {
      console.error("[shipping-summary] fetch error:", error.message);
      return serverError(error.message);
    }

    // product_code（例: MJL_5mg_2m）をパースして用量別箱数を集計
    // 1ヶ月=2箱(4本)、2ヶ月=4箱(8本)、3ヶ月=6箱(12本)
    const summary: Record<string, number> = {};

    for (const order of orders || []) {
      const match = order.product_code?.match(/MJL_([\d.]+mg)_(\d+)m/);
      if (!match) continue;
      const dosage = match[1];
      const months = parseInt(match[2]);
      const boxes = months * 2;
      summary[dosage] = (summary[dosage] || 0) + boxes;
    }

    return NextResponse.json({
      summary,
      orderCount: orders?.length ?? 0,
    });
  } catch (err) {
    console.error("[shipping-summary] error:", err);
    return serverError(err instanceof Error ? err.message : "Server error");
  }
}
