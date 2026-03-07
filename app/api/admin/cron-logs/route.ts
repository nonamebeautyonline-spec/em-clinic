// app/api/admin/cron-logs/route.ts — Cron実行履歴一覧API
import { NextRequest, NextResponse } from "next/server";
import { unauthorized, serverError } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant } from "@/lib/tenant";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/cron-logs
 * クエリパラメータ:
 *   cron_name: Cron名でフィルタ（任意）
 *   status: ステータスでフィルタ（任意: running/success/failed）
 *   limit: 取得件数（デフォルト50、最大200）
 *   offset: オフセット（デフォルト0）
 */
export async function GET(req: NextRequest) {
  const isAuthed = await verifyAdminAuth(req);
  if (!isAuthed) return unauthorized();

  const tenantId = resolveTenantId(req);

  try {
    const url = new URL(req.url);
    const cronName = url.searchParams.get("cron_name");
    const status = url.searchParams.get("status");
    const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 200);
    const offset = Number(url.searchParams.get("offset")) || 0;

    let query = supabaseAdmin
      .from("cron_execution_logs")
      .select("*", { count: "exact" })
      .order("started_at", { ascending: false })
      .range(offset, offset + limit - 1);

    query = withTenant(query, tenantId);

    if (cronName) {
      query = query.eq("cron_name", cronName);
    }
    if (status && ["running", "success", "failed"].includes(status)) {
      query = query.eq("status", status);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("[cron-logs] DB error:", error.message);
      return serverError(error.message);
    }

    return NextResponse.json({
      ok: true,
      logs: data ?? [],
      total: count ?? 0,
      limit,
      offset,
    });
  } catch (e) {
    console.error("[cron-logs] error:", e);
    return serverError((e as Error).message);
  }
}
