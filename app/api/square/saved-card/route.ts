// app/api/square/saved-card/route.ts — 保存済みカード情報取得
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getActiveSquareAccount } from "@/lib/square-account-server";
import { resolveTenantId, withTenant } from "@/lib/tenant";
import { getCardDetails } from "@/lib/payment/square-inline";

export async function GET(req: NextRequest) {
  const tenantId = resolveTenantId(req);
  const tid = tenantId ?? undefined;

  const patientId =
    req.cookies.get("__Host-patient_id")?.value ||
    req.cookies.get("patient_id")?.value ||
    "";

  if (!patientId) {
    return NextResponse.json({ hasCard: false });
  }

  // patients テーブルから square_card_id を取得
  const { data: patient } = await withTenant(
    supabaseAdmin
      .from("patients")
      .select("square_customer_id, square_card_id")
      .eq("patient_id", patientId),
    tenantId,
  ).maybeSingle();

  if (!patient?.square_card_id) {
    return NextResponse.json({ hasCard: false });
  }

  // Square Cards API でカード詳細を取得（有効性確認）
  const sqConfig = await getActiveSquareAccount(tid);
  const accessToken = sqConfig?.accessToken;
  const baseUrl = sqConfig?.baseUrl || "https://connect.squareup.com";

  if (!accessToken) {
    return NextResponse.json({ hasCard: false });
  }

  try {
    const { ok, card } = await getCardDetails(baseUrl, accessToken, patient.square_card_id);

    if (!ok || !card || !card.enabled) {
      // カードが無効 → DB からも削除
      await withTenant(
        supabaseAdmin
          .from("patients")
          .update({ square_card_id: null })
          .eq("patient_id", patientId),
        tenantId,
      );
      return NextResponse.json({ hasCard: false });
    }

    return NextResponse.json({
      hasCard: true,
      cardId: card.id,
      brand: card.card_brand,
      last4: card.last_4,
      expMonth: card.exp_month,
      expYear: card.exp_year,
    });
  } catch (e) {
    console.error("[saved-card] error:", e);
    return NextResponse.json({ hasCard: false });
  }
}
