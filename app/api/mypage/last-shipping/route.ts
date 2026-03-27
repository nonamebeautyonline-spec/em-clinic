// app/api/mypage/last-shipping/route.ts
// 前回の配送先情報を取得するAPI
import { NextRequest, NextResponse } from "next/server";
import { unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyPatientSession } from "@/lib/patient-session";
import { withTenant, resolveTenantId } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await verifyPatientSession(req);
  if (!session) return unauthorized();

  const tenantId = resolveTenantId(req);

  // 直近の決済済み注文から配送先情報を取得
  const { data } = await withTenant(
    supabaseAdmin
      .from("orders")
      .select("shipping_name, postal_code, address, phone, email, account_name, payment_method")
      .eq("patient_id", session.patientId)
      .not("shipping_name", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    tenantId,
  );

  if (!data) {
    return NextResponse.json({ ok: true, hasData: false });
  }

  return NextResponse.json({
    ok: true,
    hasData: true,
    shipping: {
      name: data.shipping_name || "",
      postalCode: data.postal_code || "",
      address: data.address || "",
      phone: data.phone || "",
      email: data.email || "",
      accountName: data.account_name || "",
      paymentMethod: data.payment_method || "",
    },
  });
}
