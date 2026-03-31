// app/api/admin/ec-subscriptions/route.ts — EC定期購入一覧・新規作成
import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized, badRequest } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveTenantIdOrThrow, strictWithTenant, tenantPayload } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);

  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status"); // active, paused, cancelled
    const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 20));
    const offset = (page - 1) * limit;

    // サブスク一覧取得（patients, products JOIN）
    let query = supabaseAdmin
      .from("ec_subscriptions")
      .select(
        "id, stripe_subscription_id, interval, status, next_billing_date, created_at, updated_at, patient_id, product_id, patients(id, name, name_kana), products(id, title, price)",
        { count: "exact" },
      )
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && ["active", "paused", "cancelled"].includes(status)) {
      query = query.eq("status", status);
    }

    const { data, count, error } = await query;
    if (error) throw error;

    // 統計情報も返す
    const { data: allSubs, error: statsError } = await supabaseAdmin
      .from("ec_subscriptions")
      .select("status, products(price)")
      .eq("tenant_id", tenantId);

    if (statsError) throw statsError;

    const activeCount = allSubs?.filter((s) => s.status === "active").length ?? 0;
    const pausedCount = allSubs?.filter((s) => s.status === "paused").length ?? 0;
    const cancelledCount = allSubs?.filter((s) => s.status === "cancelled").length ?? 0;

    // MRR概算（アクティブサブスクの商品価格合計）
    const mrr = allSubs
      ?.filter((s) => s.status === "active")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .reduce((sum, s) => sum + ((s.products as any)?.price ?? 0), 0) ?? 0;

    // 解約率（今月キャンセル / 全体）
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const { count: cancelledThisMonth } = await supabaseAdmin
      .from("ec_subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("status", "cancelled")
      .gte("updated_at", thisMonthStart);

    const churnRate = activeCount > 0
      ? Math.round(((cancelledThisMonth ?? 0) / (activeCount + (cancelledThisMonth ?? 0))) * 100)
      : 0;

    return NextResponse.json({
      ok: true,
      subscriptions: data,
      total: count ?? 0,
      page,
      limit,
      stats: {
        activeCount,
        pausedCount,
        cancelledCount,
        mrr,
        churnRate,
      },
    });
  } catch (err) {
    console.error("[ec-subscriptions] GET エラー:", err);
    return serverError("サブスクリプション一覧の取得に失敗しました");
  }
}

export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);

  try {
    const body = await req.json();
    const { patient_id, product_id, interval, stripe_subscription_id, next_billing_date } = body;

    if (!patient_id) return badRequest("patient_idは必須です");
    if (!product_id) return badRequest("product_idは必須です");

    const validIntervals = ["monthly", "bimonthly", "quarterly"];
    if (interval && !validIntervals.includes(interval)) {
      return badRequest("intervalはmonthly, bimonthly, quarterlyのいずれかです");
    }

    // 手動登録（Stripe外）
    const { data, error } = await supabaseAdmin
      .from("ec_subscriptions")
      .insert({
        ...tenantPayload(tenantId),
        patient_id: Number(patient_id),
        product_id,
        interval: interval || "monthly",
        stripe_subscription_id: stripe_subscription_id || null,
        next_billing_date: next_billing_date || null,
        status: "active",
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, subscription: data }, { status: 201 });
  } catch (err) {
    console.error("[ec-subscriptions] POST エラー:", err);
    return serverError("サブスクリプションの作成に失敗しました");
  }
}
