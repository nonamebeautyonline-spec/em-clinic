// app/api/admin/webhook-events/route.ts — Webhook失敗一覧API
import { NextRequest, NextResponse } from "next/server";
import { unauthorized, serverError } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow, strictWithTenant } from "@/lib/tenant";

export const dynamic = "force-dynamic";

/** Webhookイベント一覧取得（フィルタ: status, event_source, 日付範囲） */
export async function GET(req: NextRequest) {
  try {
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) return unauthorized();

    const tenantId = resolveTenantIdOrThrow(req);
    const { searchParams } = new URL(req.url);

    const status = searchParams.get("status"); // 'failed', 'completed', 'processing'
    const source = searchParams.get("source"); // 'square', 'gmo', 'stripe'
    const from = searchParams.get("from"); // ISO日付
    const to = searchParams.get("to"); // ISO日付
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);

    let query = strictWithTenant(
      supabaseAdmin
        .from("webhook_events")
        .select("id, tenant_id, event_source, event_id, status, error_message, retry_count, last_retried_at, created_at, completed_at", { count: "exact" }),
      tenantId,
    );

    if (status) query = query.eq("status", status);
    if (source) query = query.eq("event_source", source);
    if (from) query = query.gte("created_at", from);
    if (to) query = query.lte("created_at", to);

    const offset = (page - 1) * limit;
    query = query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) return serverError(error.message);

    // 統計情報も返す
    const { data: stats } = await strictWithTenant(
      supabaseAdmin
        .from("webhook_events")
        .select("status"),
      tenantId,
    );

    const summary = {
      total: stats?.length || 0,
      failed: stats?.filter((s: { status: string }) => s.status === "failed").length || 0,
      completed: stats?.filter((s: { status: string }) => s.status === "completed").length || 0,
      processing: stats?.filter((s: { status: string }) => s.status === "processing").length || 0,
    };

    return NextResponse.json({
      events: data || [],
      total: count || 0,
      page,
      limit,
      summary,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return serverError(msg);
  }
}
