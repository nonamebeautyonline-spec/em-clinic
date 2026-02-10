// app/api/checkout/route.ts
"use server";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getProductByCode } from "@/lib/products";
import { getPaymentProvider } from "@/lib/payment";

type Mode = "current" | "first" | "reorder";

const APP_BASE_URL = process.env.APP_BASE_URL;

export async function POST(req: NextRequest) {
  try {
    if (!APP_BASE_URL) {
      return NextResponse.json(
        { error: "Server configuration error. Missing APP_BASE_URL." },
        { status: 500 }
      );
    }

    const body = (await req.json()) as {
      productCode?: string;
      mode?: Mode;
      patientId?: string;
      reorderId?: string | null;
    };

    const { productCode, mode, patientId, reorderId } = body;

    if (!productCode) {
      return NextResponse.json(
        { error: "productCode is required." },
        { status: 400 }
      );
    }

    // ★ NG患者は決済不可（statusがnullの再処方カルテを除外）
    if (patientId) {
      const { data: intakeRow } = await supabaseAdmin
        .from("intake")
        .select("status")
        .eq("patient_id", patientId)
        .not("status", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (intakeRow?.status === "NG") {
        console.log(`[checkout] NG患者の決済をブロック: patient_id=${patientId}`);
        return NextResponse.json(
          { error: "処方不可と判定されているため、決済できません。再度診察予約をお取りください。" },
          { status: 403 }
        );
      }
    }

    // ★ DB から商品取得（フォールバック付き）
    const product = await getProductByCode(productCode);
    if (!product) {
      return NextResponse.json(
        { error: "Invalid productCode." },
        { status: 400 }
      );
    }

    const validModes: Mode[] = ["current", "first", "reorder"];
    if (mode && !validModes.includes(mode)) {
      return NextResponse.json(
        { error: "Invalid mode. Use current | first | reorder." },
        { status: 400 }
      );
    }

    const redirectUrl = `${APP_BASE_URL}/mypage/purchase/complete?code=${product.code}`;

    // ★ 決済プロバイダー経由でチェックアウトリンク作成
    const provider = await getPaymentProvider();
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
  } catch (err: any) {
    console.error("Checkout API error:", err);
    return NextResponse.json(
      {
        error:
          "決済リンクの作成中にエラーが発生しました。時間をおいて再度お試しください。",
      },
      { status: 500 }
    );
  }
}
