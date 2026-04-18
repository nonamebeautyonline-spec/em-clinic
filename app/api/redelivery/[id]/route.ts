// 再配送請求の詳細取得（患者向け）
import { NextRequest, NextResponse } from "next/server";
import { unauthorized, forbidden } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyPatientSession } from "@/lib/patient-session";
import { resolveTenantId, strictWithTenant } from "@/lib/tenant";
import { getProductNamesMap } from "@/lib/products";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await verifyPatientSession(req);
  if (!session) return unauthorized();

  const tenantId = resolveTenantId(req);
  const { id } = await params;

  const { data } = await strictWithTenant(
    supabaseAdmin
      .from("redeliveries")
      .select("id, patient_id, original_order_id, amount, status, created_at, orders!redeliveries_original_order_id_fkey(product_name, product_code, amount, paid_at)")
      .eq("id", Number(id))
      .maybeSingle(),
    tenantId
  );

  if (!data) return NextResponse.json({ ok: false }, { status: 404 });
  if (data.patient_id !== session.patientId) return forbidden("アクセス権がありません");

  const orderArr = data.orders as unknown as { product_name: string; product_code: string; amount: number; paid_at: string }[] | null;
  const order = Array.isArray(orderArr) ? orderArr[0] : null;
  const code = order?.product_code || "";
  const pnMap = code && !order?.product_name ? await getProductNamesMap(tenantId ?? undefined) : {};
  const productName = order?.product_name || pnMap[code] || code;

  return NextResponse.json({
    ok: true,
    redelivery: {
      id: data.id,
      amount: data.amount,
      originalProductName: productName,
      originalProductCode: code,
      originalAmount: order?.amount || 0,
      originalPaidAt: order?.paid_at || "",
    },
  });
}
