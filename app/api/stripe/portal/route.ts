// app/api/stripe/portal/route.ts
// Stripe Customer Portal URL生成: テナント管理者が支払い方法変更・請求書確認をStripe側UIで操作

import { NextRequest, NextResponse } from "next/server";
import { badRequest, forbidden, serverError } from "@/lib/api-error";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { getStripeClient } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin) {
    return forbidden("権限がありません");
  }

  const stripe = await getStripeClient();
  if (!stripe) {
    return badRequest("Stripeが設定されていません");
  }

  const body = await req.json();
  const { tenantId } = body;

  if (!tenantId) {
    return badRequest("tenantIdは必須です");
  }

  try {
    // テナントのStripe Customer ID取得
    const { data: tenantPlan } = await supabaseAdmin
      .from("tenant_plans")
      .select("stripe_customer_id")
      .eq("tenant_id", tenantId)
      .single();

    if (!tenantPlan?.stripe_customer_id) {
      return badRequest("Stripe Customerが未作成です");
    }

    // Customer Portal Session作成
    const session = await stripe.billingPortal.sessions.create({
      customer: tenantPlan.stripe_customer_id,
      return_url: `${req.headers.get("origin") || ""}/platform/billing`,
    });

    return NextResponse.json({ ok: true, url: session.url });
  } catch (err) {
    console.error("[stripe/portal] error:", err);
    return serverError(err instanceof Error ? err.message : "Portal URL生成に失敗しました");
  }
}
