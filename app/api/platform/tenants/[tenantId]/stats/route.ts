// app/api/platform/tenants/[tenantId]/stats/route.ts
// テナント個別統計API

import { NextRequest, NextResponse } from "next/server";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { supabaseAdmin } from "@/lib/supabase";

interface RouteContext {
  params: Promise<{ tenantId: string }>;
}

/**
 * GET: テナント個別の統計情報
 * - 患者数
 * - 予約数（今月）
 * - 今月売上
 * - LINE友だち数
 */
export async function GET(req: NextRequest, ctx: RouteContext) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin)
    return NextResponse.json(
      { ok: false, error: "権限がありません" },
      { status: 403 },
    );

  const { tenantId } = await ctx.params;

  try {
    // テナント存在確認
    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("id")
      .eq("id", tenantId)
      .is("deleted_at", null)
      .single();

    if (!tenant) {
      return NextResponse.json(
        { ok: false, error: "テナントが見つかりません" },
        { status: 404 },
      );
    }

    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

    // 並列で各統計を取得
    const [patientsResult, reservationsResult, revenueResult, lineFriendsResult] =
      await Promise.all([
        // 患者数
        supabaseAdmin
          .from("patients")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId),

        // 今月の予約数
        supabaseAdmin
          .from("reservations")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .gte("reserved_date", monthStart),

        // 今月の売上
        supabaseAdmin
          .from("orders")
          .select("amount")
          .eq("tenant_id", tenantId)
          .gte("paid_at", monthStart)
          .not("paid_at", "is", null),

        // LINE友だち数（line_idがnullでない患者数）
        supabaseAdmin
          .from("patients")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .not("line_id", "is", null),
      ]);

    const monthlyRevenue = (revenueResult.data || []).reduce(
      (sum, o) => sum + (o.amount || 0),
      0,
    );

    return NextResponse.json({
      ok: true,
      stats: {
        patientsCount: patientsResult.count || 0,
        reservationsCount: reservationsResult.count || 0,
        monthlyRevenue,
        lineFriendsCount: lineFriendsResult.count || 0,
      },
    });
  } catch (err) {
    console.error("[platform/tenants/[id]/stats] GET error:", err);
    return NextResponse.json(
      { ok: false, error: "統計情報の取得に失敗しました" },
      { status: 500 },
    );
  }
}
