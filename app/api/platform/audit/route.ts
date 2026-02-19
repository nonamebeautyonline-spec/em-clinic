// app/api/platform/audit/route.ts
// プラットフォーム管理: テナント横断の監査ログ一覧API

import { NextRequest, NextResponse } from "next/server";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * GET: 監査ログ一覧（テナント横断）
 * クエリパラメータ:
 *   tenant_id - テナントIDでフィルター
 *   action    - アクション種別フィルター（前方一致）
 *   start     - 開始日時
 *   end       - 終了日時
 *   search    - アクション or resource_id で検索
 *   page      - ページ番号（1始まり）
 *   limit     - 1ページあたりの件数（デフォルト50、最大100）
 */
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
    const action = url.searchParams.get("action") || "";
    const start = url.searchParams.get("start") || "";
    const end = url.searchParams.get("end") || "";
    const search = url.searchParams.get("search") || "";
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(url.searchParams.get("limit") || "50", 10)),
    );
    const offset = (page - 1) * limit;

    // ベースクエリ: audit_logs LEFT JOIN tenants, admin_users
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
        tenants:tenant_id (id, name, slug),
        admin_users:admin_user_id (id, name, email)
      `,
        { count: "exact" },
      )
      .order("created_at", { ascending: false });

    // テナントIDフィルター
    if (tenantId) {
      query = query.eq("tenant_id", tenantId);
    }

    // アクション種別フィルター（前方一致）
    if (action) {
      query = query.ilike("action", `${action}%`);
    }

    // 日時範囲フィルター
    if (start) {
      query = query.gte("created_at", `${start}T00:00:00`);
    }
    if (end) {
      query = query.lte("created_at", `${end}T23:59:59`);
    }

    // 検索（アクション or resource_id）
    if (search) {
      query = query.or(
        `action.ilike.%${search}%,resource_id.ilike.%${search}%`,
      );
    }

    // ページネーション
    query = query.range(offset, offset + limit - 1);

    const { data: logs, error: logsErr, count } = await query;

    if (logsErr) {
      console.error("[platform/audit] GET error:", logsErr);
      return NextResponse.json(
        { ok: false, error: "監査ログの取得に失敗しました" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      logs: logs || [],
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (err) {
    console.error("[platform/audit] GET unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: "予期しないエラーが発生しました" },
      { status: 500 },
    );
  }
}
