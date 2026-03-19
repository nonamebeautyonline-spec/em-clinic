// 処方歴タイムラインAPI — 患者の処方変更履歴を時系列で返す
import { NextRequest, NextResponse } from "next/server";
import { badRequest, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow, strictWithTenant } from "@/lib/tenant";
import { buildPrescriptionTimeline } from "@/lib/prescription-timeline";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const patientId = req.nextUrl.searchParams.get("patientId")?.trim();
  if (!patientId) {
    return badRequest("patientId は必須です");
  }

  const [ordersRes, reordersRes] = await Promise.all([
    strictWithTenant(
      supabaseAdmin
        .from("orders")
        .select("product_code, paid_at, created_at")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false }),
      tenantId,
    ),
    strictWithTenant(
      supabaseAdmin
        .from("reorders")
        .select("product_code, paid_at, created_at, karte_note")
        .eq("patient_id", patientId)
        .eq("status", "paid")
        .order("created_at", { ascending: false }),
      tenantId,
    ),
  ]);

  const timeline = buildPrescriptionTimeline(
    ordersRes.data || [],
    reordersRes.data || [],
  );

  return NextResponse.json({ timeline });
}
