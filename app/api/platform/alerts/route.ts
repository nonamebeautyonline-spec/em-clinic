// app/api/platform/alerts/route.ts
// プラットフォーム管理: セキュリティアラート一覧API

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
    const severity = url.searchParams.get("severity") || "";
    const acknowledged = url.searchParams.get("acknowledged") || "all";
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "50", 10)));
    const offset = (page - 1) * limit;

    // ベースクエリ
    let query = supabaseAdmin
      .from("security_alerts")
      .select(
        `
        id,
        tenant_id,
        alert_type,
        severity,
        title,
        description,
        metadata,
        acknowledged_at,
        acknowledged_by,
        created_at,
        tenants:tenant_id (id, name, slug)
      `,
        { count: "exact" },
      )
      .order("created_at", { ascending: false });

    // 深刻度フィルター
    if (severity) {
      query = query.eq("severity", severity);
    }

    // 確認状態フィルター
    if (acknowledged === "true") {
      query = query.not("acknowledged_at", "is", null);
    } else if (acknowledged === "false") {
      query = query.is("acknowledged_at", null);
    }

    query = query.range(offset, offset + limit - 1);

    const { data: alerts, error: alertsErr, count } = await query;

    if (alertsErr) {
      console.error("[platform/alerts] GET error:", alertsErr);
      return NextResponse.json(
        { ok: false, error: "アラートの取得に失敗しました" },
        { status: 500 },
      );
    }

    // 未確認アラート件数
    const { count: unacknowledgedCount } = await supabaseAdmin
      .from("security_alerts")
      .select("id", { count: "exact", head: true })
      .is("acknowledged_at", null);

    return NextResponse.json({
      ok: true,
      alerts: alerts || [],
      unacknowledgedCount: unacknowledgedCount || 0,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (err) {
    console.error("[platform/alerts] GET unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: "予期しないエラーが発生しました" },
      { status: 500 },
    );
  }
}
