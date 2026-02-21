// app/api/platform/errors/route.ts
// プラットフォーム管理: エラーログダッシュボードAPI

import { NextRequest, NextResponse } from "next/server";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin)
    return NextResponse.json(
      { ok: false, error: "権限がありません" },
      { status: 403 },
    );

  try {
    const url = new URL(req.url);
    const tenantId = url.searchParams.get("tenant_id") || "";
    const days = Math.min(90, Math.max(1, parseInt(url.searchParams.get("days") || "7", 10)));
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "50", 10)));
    const offset = (page - 1) * limit;

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    // エラーログ一覧取得
    let query = supabaseAdmin
      .from("audit_logs")
      .select(
        `
        id,
        tenant_id,
        admin_user_id,
        admin_name,
        action,
        resource_type,
        resource_id,
        details,
        ip_address,
        user_agent,
        created_at,
        tenants:tenant_id (id, name, slug)
      `,
        { count: "exact" },
      )
      .or("action.ilike.%error%,action.ilike.%fail%")
      .gte("created_at", since)
      .order("created_at", { ascending: false });

    if (tenantId) {
      query = query.eq("tenant_id", tenantId);
    }

    query = query.range(offset, offset + limit - 1);

    const { data: errors, error: errorsErr, count } = await query;

    if (errorsErr) {
      console.error("[platform/errors] GET error:", errorsErr);
      return NextResponse.json(
        { ok: false, error: "エラーログの取得に失敗しました" },
        { status: 500 },
      );
    }

    // 日別集計（直近N日間）
    // Supabaseでは直接GROUP BYが難しいため、全件取得してJS側で集計
    const { data: allErrors } = await supabaseAdmin
      .from("audit_logs")
      .select("created_at, tenant_id")
      .or("action.ilike.%error%,action.ilike.%fail%")
      .gte("created_at", since)
      .order("created_at", { ascending: true });

    // 日別集計
    const dailyMap: Record<string, number> = {};
    const tenantErrorMap: Record<string, { tenantId: string; count: number }> = {};

    for (const log of allErrors || []) {
      const date = log.created_at.split("T")[0];
      dailyMap[date] = (dailyMap[date] || 0) + 1;

      if (log.tenant_id) {
        if (!tenantErrorMap[log.tenant_id]) {
          tenantErrorMap[log.tenant_id] = { tenantId: log.tenant_id, count: 0 };
        }
        tenantErrorMap[log.tenant_id].count += 1;
      }
    }

    // 日別集計を配列に変換（空の日も含める）
    const dailyCounts: { date: string; count: number }[] = [];
    const startDate = new Date(since);
    const endDate = new Date();
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];
      dailyCounts.push({ date: dateStr, count: dailyMap[dateStr] || 0 });
    }

    // テナント別エラー分布（テナント名を付与）
    const tenantIds = Object.keys(tenantErrorMap);
    let tenantDistribution: { tenantId: string; tenantName: string; count: number }[] = [];

    if (tenantIds.length > 0) {
      const { data: tenants } = await supabaseAdmin
        .from("tenants")
        .select("id, name")
        .in("id", tenantIds);

      const tenantNameMap: Record<string, string> = {};
      for (const t of tenants || []) {
        tenantNameMap[t.id] = t.name;
      }

      tenantDistribution = Object.values(tenantErrorMap)
        .map((t) => ({
          tenantId: t.tenantId,
          tenantName: tenantNameMap[t.tenantId] || "不明",
          count: t.count,
        }))
        .sort((a, b) => b.count - a.count);
    }

    return NextResponse.json({
      ok: true,
      errors: errors || [],
      dailyCounts,
      tenantDistribution,
      total: count || 0,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (err) {
    console.error("[platform/errors] GET unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: "予期しないエラーが発生しました" },
      { status: 500 },
    );
  }
}
