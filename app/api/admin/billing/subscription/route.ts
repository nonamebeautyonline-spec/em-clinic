// app/api/admin/billing/subscription/route.ts
// サブスクリプション管理API: 情報取得・プラン変更・解約

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, serverError, unauthorized, notFound } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase";
import { getStripeClient } from "@/lib/stripe";
import { getPlanByKey, MESSAGE_PLANS } from "@/lib/plan-config";
import { parseBody } from "@/lib/validations/helpers";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// --- バリデーションスキーマ ---

/** プラン変更リクエスト */
const changePlanSchema = z.object({
  action: z.literal("change_plan"),
  newPlanKey: z
    .string()
    .min(1, "プランキーは必須です")
    .refine(
      (key) => MESSAGE_PLANS.some((p) => p.key === key),
      "無効なプランキーです",
    ),
});

/** 解約リクエスト */
const cancelSchema = z.object({
  action: z.literal("cancel"),
  cancelAtPeriodEnd: z.boolean().default(true),
  reason: z.string().max(500).optional(),
});

const postBodySchema = z.discriminatedUnion("action", [
  changePlanSchema,
  cancelSchema,
]);

// --- GET: サブスクリプション情報取得 ---

export async function GET(req: NextRequest) {
  const isAuth = await verifyAdminAuth(req);
  if (!isAuth) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  if (!tenantId) return badRequest("テナントが特定できません");

  try {
    // tenant_plans からサブスク情報を取得
    const { data: plan } = await supabaseAdmin
      .from("tenant_plans")
      .select(
        "plan_name, monthly_fee, setup_fee, started_at, next_billing_at, status, message_quota, overage_unit_price, stripe_subscription_id, stripe_customer_id",
      )
      .eq("tenant_id", tenantId)
      .single();

    if (!plan) {
      return notFound("プラン情報が見つかりません");
    }

    const planConfig = getPlanByKey(plan.plan_name);

    // Stripeサブスクリプション詳細を取得（設定済みの場合）
    let stripeSubscription: Record<string, unknown> | null = null;
    if (plan.stripe_subscription_id) {
      const stripe = await getStripeClient();
      if (stripe) {
        try {
          const sub = await stripe.subscriptions.retrieve(
            plan.stripe_subscription_id,
          );
          stripeSubscription = {
            id: sub.id,
            status: sub.status,
            currentPeriodStart: new Date(
              (sub as unknown as Record<string, number>).current_period_start *
                1000,
            ).toISOString(),
            currentPeriodEnd: new Date(
              (sub as unknown as Record<string, number>).current_period_end *
                1000,
            ).toISOString(),
            cancelAtPeriodEnd: sub.cancel_at_period_end,
            cancelAt: sub.cancel_at
              ? new Date(sub.cancel_at * 1000).toISOString()
              : null,
            canceledAt: sub.canceled_at
              ? new Date(sub.canceled_at * 1000).toISOString()
              : null,
          };
        } catch (err) {
          console.error(
            "[billing/subscription] Stripe取得エラー:",
            err,
          );
          // Stripeエラー時はローカル情報のみ返す
        }
      }
    }

    // 当月の使用量
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const { data: usage } = await supabaseAdmin
      .from("monthly_usage")
      .select("message_count, ai_reply_count, voice_input_count")
      .eq("tenant_id", tenantId)
      .eq("year_month", yearMonth)
      .single();

    // 利用可能なプラン一覧
    const availablePlans = MESSAGE_PLANS.map((p) => ({
      key: p.key,
      label: p.label,
      messageQuota: p.messageQuota,
      monthlyPrice: p.monthlyPrice,
      overageUnitPrice: p.overageUnitPrice,
      isCurrent: p.key === plan.plan_name,
    }));

    return NextResponse.json({
      ok: true,
      subscription: {
        planName: plan.plan_name,
        planLabel: planConfig?.label || plan.plan_name,
        monthlyFee: plan.monthly_fee || planConfig?.monthlyPrice || 0,
        messageQuota:
          plan.message_quota || planConfig?.messageQuota || 5000,
        overageUnitPrice:
          plan.overage_unit_price || planConfig?.overageUnitPrice || 1.0,
        startedAt: plan.started_at,
        nextBillingAt: plan.next_billing_at,
        status: plan.status,
        hasStripe: !!plan.stripe_subscription_id,
        stripe: stripeSubscription,
      },
      usage: {
        yearMonth,
        messageCount: usage?.message_count || 0,
        aiReplyCount: usage?.ai_reply_count || 0,
        voiceInputCount: usage?.voice_input_count || 0,
      },
      availablePlans,
    });
  } catch (err) {
    console.error("[billing/subscription] GET error:", err);
    return serverError("サブスクリプション情報の取得に失敗しました");
  }
}

// --- POST: プラン変更 / 解約 ---

export async function POST(req: NextRequest) {
  const isAuth = await verifyAdminAuth(req);
  if (!isAuth) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  if (!tenantId) return badRequest("テナントが特定できません");

  // レート制限（プラン変更/解約は1分に5回まで）
  const ip = getClientIp(req);
  const rl = await checkRateLimit(
    `billing:subscription:${tenantId}:${ip}`,
    5,
    60,
  );
  if (rl.limited) {
    return NextResponse.json(
      {
        ok: false,
        error: "TOO_MANY_REQUESTS",
        message: "リクエストが多すぎます。しばらくしてからお試しください",
      },
      { status: 429 },
    );
  }

  const parsed = await parseBody(req, postBodySchema);
  if (parsed.error) return parsed.error;

  const { data } = parsed;

  try {
    if (data.action === "change_plan") {
      return await handleChangePlan(tenantId, data.newPlanKey);
    } else {
      return await handleCancel(
        tenantId,
        data.cancelAtPeriodEnd,
        data.reason,
      );
    }
  } catch (err) {
    console.error("[billing/subscription] POST error:", err);
    return serverError("操作に失敗しました");
  }
}

// --- DELETE: 即時解約 ---

export async function DELETE(req: NextRequest) {
  const isAuth = await verifyAdminAuth(req);
  if (!isAuth) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  if (!tenantId) return badRequest("テナントが特定できません");

  // レート制限
  const ip = getClientIp(req);
  const rl = await checkRateLimit(
    `billing:subscription:delete:${tenantId}:${ip}`,
    3,
    60,
  );
  if (rl.limited) {
    return NextResponse.json(
      {
        ok: false,
        error: "TOO_MANY_REQUESTS",
        message: "リクエストが多すぎます",
      },
      { status: 429 },
    );
  }

  try {
    return await handleCancel(tenantId, false, undefined);
  } catch (err) {
    console.error("[billing/subscription] DELETE error:", err);
    return serverError("解約に失敗しました");
  }
}

// --- 内部処理 ---

/** プラン変更処理 */
async function handleChangePlan(
  tenantId: string,
  newPlanKey: string,
): Promise<NextResponse> {
  const newPlan = getPlanByKey(newPlanKey);
  if (!newPlan) {
    return badRequest("無効なプランです");
  }

  // 現在のプラン情報を取得
  const { data: currentPlan } = await supabaseAdmin
    .from("tenant_plans")
    .select(
      "plan_name, stripe_subscription_id, stripe_customer_id, status",
    )
    .eq("tenant_id", tenantId)
    .single();

  if (!currentPlan) {
    return notFound("プラン情報が見つかりません");
  }

  if (currentPlan.plan_name === newPlanKey) {
    return badRequest("現在と同じプランです");
  }

  // Stripeサブスクリプションがある場合はStripe側も更新
  if (
    currentPlan.stripe_subscription_id &&
    currentPlan.stripe_customer_id
  ) {
    const stripe = await getStripeClient();
    if (stripe) {
      try {
        const subscription = await stripe.subscriptions.retrieve(
          currentPlan.stripe_subscription_id,
        );

        // サブスクリプションのアイテムを取得
        const itemId = (
          subscription as unknown as { items: { data: { id: string }[] } }
        ).items.data[0]?.id;

        if (itemId) {
          // Price IDが設定されている場合はそれを使う
          if (newPlan.stripePriceId) {
            await stripe.subscriptions.update(
              currentPlan.stripe_subscription_id,
              {
                items: [{ id: itemId, price: newPlan.stripePriceId }],
                proration_behavior: "create_prorations",
              },
            );
          } else {
            // Price IDが未設定の場合は動的にPrice作成
            await stripe.subscriptions.update(
              currentPlan.stripe_subscription_id,
              {
                items: [
                  {
                    id: itemId,
                    price_data: {
                      currency: "jpy",
                      product:
                        (
                          subscription as unknown as {
                            items: {
                              data: {
                                price: { product: string };
                              }[];
                            };
                          }
                        ).items.data[0]?.price?.product ?? "",
                      unit_amount: newPlan.monthlyPrice,
                      recurring: { interval: "month" },
                    },
                  },
                ],
                proration_behavior: "create_prorations",
              },
            );
          }
        }
      } catch (err) {
        console.error(
          "[billing/subscription] Stripeプラン変更エラー:",
          err,
        );
        return serverError("Stripeでのプラン変更に失敗しました");
      }
    }
  }

  // ローカルDBを更新
  await supabaseAdmin
    .from("tenant_plans")
    .update({
      plan_name: newPlanKey,
      monthly_fee: newPlan.monthlyPrice,
      message_quota: newPlan.messageQuota,
      overage_unit_price: newPlan.overageUnitPrice,
      updated_at: new Date().toISOString(),
    })
    .eq("tenant_id", tenantId);

  return NextResponse.json({
    ok: true,
    message: `プランを「${newPlan.label}」に変更しました`,
    newPlan: {
      key: newPlan.key,
      label: newPlan.label,
      monthlyPrice: newPlan.monthlyPrice,
      messageQuota: newPlan.messageQuota,
    },
  });
}

/** 解約処理 */
async function handleCancel(
  tenantId: string,
  cancelAtPeriodEnd: boolean,
  reason?: string,
): Promise<NextResponse> {
  // 現在のプラン情報を取得
  const { data: currentPlan } = await supabaseAdmin
    .from("tenant_plans")
    .select("stripe_subscription_id, status")
    .eq("tenant_id", tenantId)
    .single();

  if (!currentPlan) {
    return notFound("プラン情報が見つかりません");
  }

  if (currentPlan.status === "cancelled") {
    return badRequest("既に解約済みです");
  }

  // Stripeサブスクリプションがある場合
  if (currentPlan.stripe_subscription_id) {
    const stripe = await getStripeClient();
    if (stripe) {
      try {
        if (cancelAtPeriodEnd) {
          // 期末解約: 現在の請求期間の終了時に解約
          await stripe.subscriptions.update(
            currentPlan.stripe_subscription_id,
            {
              cancel_at_period_end: true,
              metadata: {
                cancel_reason: reason || "",
              },
            },
          );
        } else {
          // 即時解約
          await stripe.subscriptions.cancel(
            currentPlan.stripe_subscription_id,
          );
        }
      } catch (err) {
        console.error("[billing/subscription] Stripe解約エラー:", err);
        return serverError("Stripeでの解約に失敗しました");
      }
    }
  }

  // ローカルDBを更新
  const newStatus = cancelAtPeriodEnd ? "cancelling" : "cancelled";
  await supabaseAdmin
    .from("tenant_plans")
    .update({
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("tenant_id", tenantId);

  const message = cancelAtPeriodEnd
    ? "解約予約しました。現在の請求期間終了後に解約されます"
    : "即時解約しました";

  return NextResponse.json({ ok: true, message, status: newStatus });
}
