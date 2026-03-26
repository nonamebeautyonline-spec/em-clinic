// app/api/checkout/route.ts
"use server";

import { NextRequest, NextResponse } from "next/server";
import { badRequest, forbidden, serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyPatientSession } from "@/lib/patient-session";
import { getProductByCode } from "@/lib/products";
import { getPaymentProvider } from "@/lib/payment";
import { resolveTenantId, withTenant } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { checkoutSchema } from "@/lib/validations/checkout";
import { getSettingOrEnv } from "@/lib/settings";
import { isMultiFieldEnabled } from "@/lib/medical-fields";
import { calculateFinalPrice } from "@/lib/pricing";

type Mode = "current" | "first" | "reorder";

export async function POST(req: NextRequest) {
  try {
    const tenantId = resolveTenantId(req);
    const APP_BASE_URL = await getSettingOrEnv("general", "app_base_url", "APP_BASE_URL", tenantId ?? undefined);
    if (!APP_BASE_URL) {
      return serverError("サーバー設定エラーです。管理者にお問い合わせください。");
    }

    // JWT患者セッション必須
    const session = await verifyPatientSession(req);
    if (!session) return unauthorized();
    const patientId = session.patientId;

    const parsed = await parseBody(req, checkoutSchema);
    if ("error" in parsed) return parsed.error;
    const { productCode, mode, reorderId, couponCode } = parsed.data;

    // ★ NG患者は決済不可（statusがnullの再処方カルテを除外）
    // マルチ分野モード: 商品の分野で NG 判定を分離
    if (patientId) {
      let ngQuery = withTenant(
        supabaseAdmin
          .from("intake")
          .select("status")
          .eq("patient_id", patientId)
          .not("status", "is", null)
          .order("created_at", { ascending: false })
          .limit(1),
        tenantId
      );

      // マルチ分野モード: 商品の field_id で NG 判定を分離
      const multiField = tenantId ? await isMultiFieldEnabled(tenantId) : false;
      if (multiField) {
        const productForField = await getProductByCode(productCode, tenantId ?? undefined);
        if (productForField?.field_id) {
          ngQuery = ngQuery.eq("field_id", productForField.field_id);
        }
      }

      const { data: intakeRow } = await ngQuery.maybeSingle();

      if (intakeRow?.status === "NG") {
        console.log(`[checkout] NG患者の決済をブロック: patient_id=${patientId}`);
        return forbidden("処方不可と判定されているため、決済できません。再度診察予約をお取りください。");
      }
    }

    // ★ DB から商品取得（フォールバック付き）
    const product = await getProductByCode(productCode, tenantId ?? undefined);
    if (!product) {
      return badRequest("無効な商品コードです");
    }

    const validModes: Mode[] = ["current", "first", "reorder"];
    if (mode && !validModes.includes(mode)) {
      return badRequest("無効なモードです");
    }

    // ★ クーポン検証（利用上限+対象者チェック含む）
    let couponId: number | undefined;
    if (couponCode && tenantId) {
      const { data: coupon } = await withTenant(
        supabaseAdmin.from("coupons").select("*").eq("code", couponCode.trim().toUpperCase()).eq("is_active", true).single(),
        tenantId,
      );
      if (coupon) {
        // 利用上限チェック
        if (coupon.max_uses) {
          const { count } = await withTenant(
            supabaseAdmin.from("coupon_issues")
              .select("*", { count: "exact", head: true })
              .eq("coupon_id", coupon.id)
              .eq("status", "used"),
            tenantId,
          );
          if ((count || 0) >= coupon.max_uses) {
            return badRequest("このクーポンは利用上限に達しています");
          }
        }
        // 患者別利用上限チェック
        if (patientId && coupon.max_uses_per_patient) {
          const { count } = await withTenant(
            supabaseAdmin.from("coupon_issues")
              .select("*", { count: "exact", head: true })
              .eq("coupon_id", coupon.id)
              .eq("patient_id", patientId)
              .eq("status", "used"),
            tenantId,
          );
          if ((count || 0) >= coupon.max_uses_per_patient) {
            return badRequest("このクーポンは既にご利用済みです");
          }
        }
        // 対象患者チェック
        if (coupon.audience_type === "specific") {
          if (!patientId || !(coupon.audience_patient_ids || []).includes(patientId)) {
            return badRequest("このクーポンはご利用対象外です");
          }
        } else if (coupon.audience_type === "condition" && coupon.audience_rules) {
          if (!patientId) {
            return badRequest("このクーポンはご利用対象外です");
          }
          const { evaluateAudienceCondition } = await import("@/lib/campaign-audience");
          const matched = await evaluateAudienceCondition(patientId, coupon.audience_rules, tenantId);
          if (!matched) {
            return badRequest("このクーポンはご利用対象外です");
          }
        }
        couponId = coupon.id;
      }
    }

    // ★ 価格計算（個別割引 > キャンペーン > 商品割引 > 通常価格 + クーポン）
    const pricing = await calculateFinalPrice({
      product: { id: product.id, price: product.price, discount_price: product.discount_price ?? null, discount_until: product.discount_until ?? null, category: product.category },
      patientId: patientId ?? undefined,
      couponId,
      tenantId: tenantId ?? "",
    });

    const finalPrice = pricing.finalPrice;
    const priceLabel = finalPrice !== product.price
      ? `${product.title}（${pricing.appliedDiscount.type !== "none" ? pricing.appliedDiscount.name : ""}${pricing.coupon?.applied ? ` + クーポン${pricing.coupon.code}` : ""}）`
      : product.title;

    const redirectUrl = `${APP_BASE_URL}/mypage/purchase/complete?code=${product.code}`;

    // ★ 決済プロバイダー経由でチェックアウトリンク作成
    const provider = await getPaymentProvider(tenantId ?? undefined);
    const result = await provider.createCheckoutLink({
      productTitle: priceLabel,
      price: finalPrice,
      redirectUrl,
      metadata: {
        patientId: patientId ?? "UNKNOWN",
        productCode: product.code,
        mode: mode || "",
        reorderId: reorderId || "",
        couponId: couponId ? String(couponId) : "",
        campaignId: pricing.appliedDiscount.id || "",
        originalPrice: String(product.price),
        finalPrice: String(finalPrice),
      },
      askForShippingAddress: true,
    });

    return NextResponse.json({ checkoutUrl: result.checkoutUrl });
  } catch (err) {
    console.error("[checkout] error:", err instanceof Error ? err.message : err);
    return serverError("決済リンクの作成中にエラーが発生しました。時間をおいて再度お試しください。");
  }
}
