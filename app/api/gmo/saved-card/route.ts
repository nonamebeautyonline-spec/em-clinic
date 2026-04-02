// app/api/gmo/saved-card/route.ts — GMO保存済みカード情報取得
import { NextRequest, NextResponse } from "next/server";
import { resolveTenantId } from "@/lib/tenant";
import { verifyPatientSession } from "@/lib/patient-session";
import { getGmoSavedCard } from "@/lib/payment/gmo-inline";

export async function GET(req: NextRequest) {
  const tenantId = resolveTenantId(req);

  const session = await verifyPatientSession(req);
  if (!session) {
    return NextResponse.json({ hasCard: false });
  }

  try {
    const card = await getGmoSavedCard(session.patientId, tenantId);
    if (!card.hasCard) {
      return NextResponse.json({ hasCard: false });
    }

    return NextResponse.json({
      hasCard: true,
      cardId: card.cardSeq, // confirm/page.tsxのsavedCard.cardIdと互換
      brand: card.brand,
      last4: card.last4,
    });
  } catch (e) {
    console.error("[gmo/saved-card] error:", e);
    return NextResponse.json({ hasCard: false });
  }
}
