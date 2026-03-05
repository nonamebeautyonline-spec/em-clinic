// 処方歴タイムラインAPI — 患者の処方変更履歴を時系列で返す
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant } from "@/lib/tenant";
import { buildPrescriptionTimeline } from "@/lib/prescription-timeline";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);
  const patientId = req.nextUrl.searchParams.get("patientId")?.trim();
  if (!patientId) {
    return NextResponse.json({ error: "patientId は必須です" }, { status: 400 });
  }

  const [ordersRes, reordersRes] = await Promise.all([
    withTenant(
      supabaseAdmin
        .from("orders")
        .select("product_code, paid_at, created_at")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false }),
      tenantId,
    ),
    withTenant(
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
