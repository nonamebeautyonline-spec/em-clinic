// app/api/stripe/checkout/route.ts
// Stripe Checkout Session作成: テナントのサブスクリプション開始用

import { NextRequest, NextResponse } from "next/server";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { getStripeClient } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase";
import { getPlanByKey } from "@/lib/plan-config";

export async function POST(req: NextRequest) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin) {
    return NextResponse.json({ ok: false, error: "権限がありません" }, { status: 403 });
  }

  const stripe = await getStripeClient();
  if (!stripe) {
    return NextResponse.json({ ok: false, error: "Stripeが設定されていません" }, { status: 400 });
  }

  const body = await req.json();
  const { tenantId } = body;

  if (!tenantId) {
    return NextResponse.json({ ok: false, error: "tenantIdは必須です" }, { status: 400 });
  }

  try {
    // テナント情報取得
    const { data: tenantPlan } = await supabaseAdmin
      .from("tenant_plans")
      .select("*, tenants(name, slug)")
      .eq("tenant_id", tenantId)
      .single();

    if (!tenantPlan) {
      return NextResponse.json({ ok: false, error: "テナントが見つかりません" }, { status: 404 });
    }

    // Stripe Customerの確認または作成
    let customerId = tenantPlan.stripe_customer_id;
    if (!customerId) {
      const tenantName = (tenantPlan.tenants as Record<string, string>)?.name || "Unknown";
      const customer = await stripe.customers.create({
        name: tenantName,
        metadata: { tenant_id: tenantId },
      });
      customerId = customer.id;

      await supabaseAdmin
        .from("tenant_plans")
        .update({ stripe_customer_id: customerId })
        .eq("tenant_id", tenantId);
    }

    // プラン情報からPrice IDを取得
    const planConfig = getPlanByKey(tenantPlan.plan_name);
    const origin = req.headers.get("origin") || "";

    if (planConfig?.stripePriceId) {
      // Stripe Price IDが設定済みの場合
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        line_items: [{ price: planConfig.stripePriceId, quantity: 1 }],
        success_url: `${origin}/platform/billing?checkout=success&tenant=${tenantId}`,
        cancel_url: `${origin}/platform/billing?checkout=cancel&tenant=${tenantId}`,
        metadata: { tenant_id: tenantId },
        subscription_data: {
          metadata: { tenant_id: tenantId },
        },
      });
      return NextResponse.json({ ok: true, url: session.url });
    }

    // Price IDが未設定の場合はprice_dataで動的作成
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{
        price_data: {
          currency: "jpy",
          product_data: {
            name: `L-ope ${planConfig?.label || tenantPlan.plan_name} Plan`,
          },
          unit_amount: tenantPlan.monthly_fee || planConfig?.monthlyPrice || 50000,
          recurring: { interval: "month" },
        },
        quantity: 1,
      }],
      success_url: `${origin}/platform/billing?checkout=success&tenant=${tenantId}`,
      cancel_url: `${origin}/platform/billing?checkout=cancel&tenant=${tenantId}`,
      metadata: { tenant_id: tenantId },
      subscription_data: {
        metadata: { tenant_id: tenantId },
      },
    });

    return NextResponse.json({ ok: true, url: session.url });
  } catch (err) {
    console.error("[stripe/checkout] error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Checkout Session作成に失敗しました" },
      { status: 500 },
    );
  }
}
