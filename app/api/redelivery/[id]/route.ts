// 再配送請求の詳細取得（患者向け）
import { NextRequest, NextResponse } from "next/server";
import { unauthorized, forbidden } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyPatientSession } from "@/lib/patient-session";
import { resolveTenantId, strictWithTenant } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await verifyPatientSession(req);
  if (!session) return unauthorized();

  const tenantId = resolveTenantId(req);
  const { id } = await params;

  const { data } = await strictWithTenant(
    supabaseAdmin
      .from("redeliveries")
      .select("id, patient_id, amount, status, product_code, product_name")
      .eq("id", Number(id))
      .maybeSingle(),
    tenantId
  );

  if (!data) return NextResponse.json({ ok: false }, { status: 404 });
  if (data.patient_id !== session.patientId) return forbidden("アクセス権がありません");

  return NextResponse.json({
    ok: true,
    redelivery: {
      id: data.id,
      amount: data.amount,
      originalProductName: data.product_name || data.product_code || "",
      originalProductCode: data.product_code || "",
    },
  });
}
