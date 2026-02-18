// app/api/admin/platform/billing/plans/route.ts
// テナント別プラン一覧取得API

import { NextRequest, NextResponse } from "next/server";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * GET: テナント別プラン一覧
 * クエリパラメータ:
 *   status - active|suspended|cancelled|all（デフォルト: all）
 *   search - テナント名検索
 *   page   - ページ番号（1始まり）
 *   limit  - 1ページあたりの件数
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
    const status = url.searchParams.get("status") || "all";
    const search = url.searchParams.get("search") || "";
    const page = Math.max(
      1,
      parseInt(url.searchParams.get("page") || "1", 10),
    );
    const limit = Math.min(
      100,
      Math.max(1, parseInt(url.searchParams.get("limit") || "25", 10)),
    );
    const offset = (page - 1) * limit;

    // tenant_plans LEFT JOIN tenants でプラン一覧を取得
    let query = supabaseAdmin
      .from("tenant_plans")
      .select(
        `
        id,
        tenant_id,
        plan_name,
        monthly_fee,
        setup_fee,
        started_at,
        next_billing_at,
        status,
        notes,
        created_at,
        updated_at,
        tenants!left (
          id,
          name,
          slug,
          is_active
        )
      `,
        { count: "exact" },
      );

    // ステータスフィルター
    if (status !== "all") {
      query = query.eq("status", status);
    }

    // テナント名検索（tenant_plans側ではテナント名検索が直接できないため、
    // テナントIDリストを先に取得してフィルター）
    if (search) {
      const { data: matchedTenants } = await supabaseAdmin
        .from("tenants")
        .select("id")
        .ilike("name", `%${search}%`)
        .is("deleted_at", null);

      if (matchedTenants && matchedTenants.length > 0) {
        const tenantIds = matchedTenants.map((t) => t.id);
        query = query.in("tenant_id", tenantIds);
      } else {
        // 該当テナントなし → 空結果を返す
        return NextResponse.json({
          ok: true,
          plans: [],
          pagination: { total: 0, page, limit, totalPages: 0 },
        });
      }
    }

    // 並び順: 作成日降順
    query = query.order("created_at", { ascending: false });

    // ページネーション
    query = query.range(offset, offset + limit - 1);

    const { data: plans, error: plansErr, count } = await query;

    if (plansErr) {
      console.error("[platform/billing/plans] GET error:", plansErr);
      return NextResponse.json(
        { ok: false, error: "プラン一覧の取得に失敗しました" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      plans: plans || [],
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (err) {
    console.error("[platform/billing/plans] GET unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: "予期しないエラーが発生しました" },
      { status: 500 },
    );
  }
}
