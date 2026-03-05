// app/api/stripe/portal/route.ts
// Stripe Customer Portal URL生成: テナント管理者が支払い方法変更・請求書確認をStripe側UIで操作

import { NextRequest, NextResponse } from "next/server";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { getStripeClient } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase";

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
    // テナントのStripe Customer ID取得
    const { data: tenantPlan } = await supabaseAdmin
      .from("tenant_plans")
      .select("stripe_customer_id")
      .eq("tenant_id", tenantId)
      .single();

    if (!tenantPlan?.stripe_customer_id) {
      return NextResponse.json(
        { ok: false, error: "Stripe Customerが未作成です" },
        { status: 400 },
      );
    }

    // Customer Portal Session作成
    const session = await stripe.billingPortal.sessions.create({
      customer: tenantPlan.stripe_customer_id,
      return_url: `${req.headers.get("origin") || ""}/platform/billing`,
    });

    return NextResponse.json({ ok: true, url: session.url });
  } catch (err) {
    console.error("[stripe/portal] error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Portal URL生成に失敗しました" },
      { status: 500 },
    );
  }
}
