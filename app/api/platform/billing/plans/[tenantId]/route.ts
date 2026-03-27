// app/api/platform/billing/plans/[tenantId]/route.ts
// テナント別プラン更新API

import { NextRequest, NextResponse } from "next/server";
import { forbidden, notFound, serverError } from "@/lib/api-error";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { logAudit } from "@/lib/audit";
import { parseBody } from "@/lib/validations/helpers";
import { updatePlanSchema } from "@/lib/validations/platform-billing";
import { getPlanByKey } from "@/lib/plan-config";
import { getStripeClient } from "@/lib/stripe";

/**
 * PUT: プラン変更（upsert）
 * tenant_id で ON CONFLICT → プラン情報を更新
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin)
    return forbidden("権限がありません");

  const { tenantId } = await params;

  // バリデーション
  const parsed = await parseBody(req, updatePlanSchema);
  if (parsed.error) return parsed.error;

  const data = parsed.data;

  try {
    // テナントの存在確認
    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("id, name")
      .eq("id", tenantId)
      .is("deleted_at", null)
      .maybeSingle();

    if (!tenant) {
      return notFound("テナントが見つかりません");
    }

    // プラン定義からクォータ・超過単価を自動取得
    const planConfig = getPlanByKey(data.planName);
    const messageQuota = data.messageQuota ?? planConfig?.messageQuota ?? 5000;
    const overageUnitPrice = data.overageUnitPrice ?? planConfig?.overageUnitPrice ?? 1.0;

    // 既存プラン取得（Stripe連携判定用）
    const { data: currentPlan } = await supabaseAdmin
      .from("tenant_plans")
      .select("plan_name, monthly_fee, stripe_subscription_id, stripe_customer_id")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    // Stripeサブスクリプション更新（設定済みの場合）
    if (
      currentPlan?.stripe_subscription_id &&
      currentPlan?.stripe_customer_id &&
      (currentPlan.plan_name !== data.planName || currentPlan.monthly_fee !== data.monthlyFee)
    ) {
      const stripe = await getStripeClient();
      if (stripe) {
        try {
          const subscription = await stripe.subscriptions.retrieve(
            currentPlan.stripe_subscription_id,
          );
          const itemId = (
            subscription as unknown as { items: { data: { id: string; price: { product: string } }[] } }
          ).items.data[0];

          if (itemId) {
            const updateParams: Record<string, unknown> = {
              proration_behavior: "create_prorations" as const,
            };

            if (planConfig?.stripePriceId) {
              updateParams.items = [{ id: itemId.id, price: planConfig.stripePriceId }];
            } else {
              updateParams.items = [{
                id: itemId.id,
                price_data: {
                  currency: "jpy",
                  product: itemId.price?.product ?? "",
                  unit_amount: data.monthlyFee,
                  recurring: { interval: "month" },
                },
              }];
            }

            await stripe.subscriptions.update(
              currentPlan.stripe_subscription_id,
              updateParams as Parameters<typeof stripe.subscriptions.update>[1],
            );
          }
        } catch (err) {
          console.error("[platform/billing/plans] Stripe更新エラー:", err);
          // StripeエラーでもローカルDBは更新する（手動で同期可能）
        }
      }
    }

    // tenant_plans の upsert（tenant_id が UNIQUE なので ON CONFLICT で更新）
    const { data: plan, error: planErr } = await supabaseAdmin
      .from("tenant_plans")
      .upsert(
        {
          tenant_id: tenantId,
          plan_name: data.planName,
          monthly_fee: data.monthlyFee,
          setup_fee: data.setupFee ?? 0,
          message_quota: messageQuota,
          overage_unit_price: overageUnitPrice,
          notes: data.notes ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "tenant_id" },
      )
      .select()
      .single();

    if (planErr) {
      console.error("[platform/billing/plans] PUT error:", planErr);
      return serverError("プランの更新に失敗しました");
    }

    // 監査ログ（fire-and-forget）
    logAudit(req, "update_plan", "tenant_plan", tenantId, {
      tenantName: tenant.name,
      planName: data.planName,
      monthlyFee: data.monthlyFee,
      setupFee: data.setupFee,
      messageQuota,
      overageUnitPrice,
      previousPlan: currentPlan?.plan_name,
    });

    return NextResponse.json({
      ok: true,
      plan,
    });
  } catch (err) {
    console.error("[platform/billing/plans] PUT unexpected error:", err);
    return serverError("予期しないエラーが発生しました");
  }
}
