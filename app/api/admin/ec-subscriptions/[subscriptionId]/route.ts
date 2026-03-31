// app/api/admin/ec-subscriptions/[subscriptionId]/route.ts — サブスク詳細・ステータス変更
import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized, badRequest, notFound } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveTenantIdOrThrow } from "@/lib/tenant";
import { getStripeClient } from "@/lib/stripe";

type RouteParams = { params: Promise<{ subscriptionId: string }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const { subscriptionId } = await params;

  try {
    // DBから取得
    const { data: sub, error } = await supabaseAdmin
      .from("ec_subscriptions")
      .select("*, patients(id, name, name_kana, tel, email), products(id, title, price, code)")
      .eq("id", subscriptionId)
      .eq("tenant_id", tenantId)
      .single();

    if (error || !sub) return notFound("サブスクリプションが見つかりません");

    // Stripe連携ありの場合、最新状態を取得
    let stripeData = null;
    if (sub.stripe_subscription_id) {
      const stripe = await getStripeClient();
      if (stripe) {
        try {
          const stripeSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
          // Stripe APIバージョンによりプロパティが異なるため安全にアクセス
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const subAny = stripeSub as any;
          stripeData = {
            status: stripeSub.status,
            current_period_start: subAny.current_period_start ?? null,
            current_period_end: subAny.current_period_end ?? null,
            cancel_at_period_end: subAny.cancel_at_period_end ?? null,
            canceled_at: subAny.canceled_at ?? null,
          };

          // DBのステータスをStripeと同期
          const mappedStatus = mapStripeStatus(stripeSub.status);
          if (mappedStatus !== sub.status) {
            await supabaseAdmin
              .from("ec_subscriptions")
              .update({
                status: mappedStatus,
                updated_at: new Date().toISOString(),
              })
              .eq("id", subscriptionId);
            sub.status = mappedStatus;
          }
        } catch (stripeErr) {
          console.error("[ec-subscriptions] Stripe取得エラー:", stripeErr);
        }
      }
    }

    return NextResponse.json({
      ok: true,
      subscription: sub,
      stripe: stripeData,
    });
  } catch (err) {
    console.error("[ec-subscriptions] GET詳細エラー:", err);
    return serverError("サブスクリプション詳細の取得に失敗しました");
  }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const { subscriptionId } = await params;

  try {
    const body = await req.json();
    const { action } = body; // "pause" | "resume" | "cancel"

    if (!action || !["pause", "resume", "cancel"].includes(action)) {
      return badRequest("actionはpause, resume, cancelのいずれかです");
    }

    // DB上のサブスクを取得
    const { data: sub, error: fetchError } = await supabaseAdmin
      .from("ec_subscriptions")
      .select("id, stripe_subscription_id, status")
      .eq("id", subscriptionId)
      .eq("tenant_id", tenantId)
      .single();

    if (fetchError || !sub) return notFound("サブスクリプションが見つかりません");

    // Stripe連携ありの場合はStripe APIを操作
    if (sub.stripe_subscription_id) {
      const stripe = await getStripeClient();
      if (stripe) {
        try {
          if (action === "pause") {
            await stripe.subscriptions.update(sub.stripe_subscription_id, {
              pause_collection: { behavior: "void" },
            });
          } else if (action === "resume") {
            await stripe.subscriptions.update(sub.stripe_subscription_id, {
              pause_collection: "",
            } as Parameters<typeof stripe.subscriptions.update>[1]);
          } else if (action === "cancel") {
            await stripe.subscriptions.cancel(sub.stripe_subscription_id);
          }
        } catch (stripeErr) {
          console.error("[ec-subscriptions] Stripeアクション エラー:", stripeErr);
          return serverError("Stripe操作に失敗しました");
        }
      }
    }

    // DBステータス更新
    const newStatus = action === "pause" ? "paused" : action === "resume" ? "active" : "cancelled";
    const { data: updated, error: updateError } = await supabaseAdmin
      .from("ec_subscriptions")
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", subscriptionId)
      .eq("tenant_id", tenantId)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({ ok: true, subscription: updated });
  } catch (err) {
    console.error("[ec-subscriptions] PUTエラー:", err);
    return serverError("サブスクリプションの更新に失敗しました");
  }
}

/** StripeのステータスをDBステータスにマッピング */
function mapStripeStatus(stripeStatus: string): string {
  switch (stripeStatus) {
    case "active":
    case "trialing":
      return "active";
    case "paused":
      return "paused";
    case "canceled":
    case "unpaid":
    case "incomplete_expired":
      return "cancelled";
    default:
      return "active";
  }
}
