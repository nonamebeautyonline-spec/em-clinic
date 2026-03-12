// app/api/checkout/route.ts
"use server";

import { NextRequest, NextResponse } from "next/server";
import { badRequest, forbidden, serverError } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { getProductByCode } from "@/lib/products";
import { getPaymentProvider } from "@/lib/payment";
import { resolveTenantId, withTenant } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { checkoutSchema } from "@/lib/validations/checkout";
import { getSettingOrEnv } from "@/lib/settings";

type Mode = "current" | "first" | "reorder";

export async function POST(req: NextRequest) {
  try {
    const tenantId = resolveTenantId(req);
    const APP_BASE_URL = await getSettingOrEnv("general", "app_base_url", "APP_BASE_URL", tenantId ?? undefined);
    if (!APP_BASE_URL) {
      return serverError("サーバー設定エラーです。管理者にお問い合わせください。");
    }

    const parsed = await parseBody(req, checkoutSchema);
    if ("error" in parsed) return parsed.error;
    const { productCode, mode, patientId, reorderId } = parsed.data;

    // ★ NG患者は決済不可（statusがnullの再処方カルテを除外）
    if (patientId) {
      const { data: intakeRow } = await withTenant(
        supabaseAdmin
          .from("intake")
          .select("status")
          .eq("patient_id", patientId)
          .not("status", "is", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        tenantId
      );

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

    const redirectUrl = `${APP_BASE_URL}/mypage/purchase/complete?code=${product.code}`;

    // ★ 決済プロバイダー経由でチェックアウトリンク作成
    const provider = await getPaymentProvider(tenantId ?? undefined);
    const result = await provider.createCheckoutLink({
      productTitle: product.title,
      price: product.price,
      redirectUrl,
      metadata: {
        patientId: patientId ?? "UNKNOWN",
        productCode: product.code,
        mode: mode || "",
        reorderId: reorderId || "",
      },
      askForShippingAddress: true,
    });

    return NextResponse.json({ checkoutUrl: result.checkoutUrl });
  } catch (err) {
    console.error("Checkout API error:", err);
    return serverError("決済リンクの作成中にエラーが発生しました。時間をおいて再度お試しください。",);
  }
}
