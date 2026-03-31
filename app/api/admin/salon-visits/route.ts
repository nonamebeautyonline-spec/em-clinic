// app/api/admin/salon-visits/route.ts — 施術カルテ（来店記録） CRUD API
import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveTenantIdOrThrow, strictWithTenant, tenantPayload } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const patientId = searchParams.get("patient_id");
  const offset = (page - 1) * limit;

  // patient名とstylist名をJOIN
  let query = strictWithTenant(
    supabaseAdmin
      .from("salon_visits")
      .select("*, patients(id, name), stylists(id, name)", { count: "exact" })
      .order("visit_date", { ascending: false })
      .range(offset, offset + limit - 1),
    tenantId,
  );

  if (patientId) {
    query = query.eq("patient_id", patientId);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("[salon-visits API] GET error:", error.message);
    return serverError(error.message);
  }

  return NextResponse.json({
    visits: data,
    total: count ?? 0,
    page,
    limit,
  });
}

export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return badRequest("リクエストの形式が不正です");
  }

  const {
    patient_id, stylist_id, visit_date, menu_items,
    total_amount, payment_method, notes, photo_urls,
  } = body as {
    patient_id?: number;
    stylist_id?: string;
    visit_date?: string;
    menu_items?: unknown;
    total_amount?: number;
    payment_method?: string;
    notes?: string;
    photo_urls?: string[];
  };

  if (!patient_id) return badRequest("patient_id は必須です");
  if (!visit_date) return badRequest("visit_date は必須です");

  const { data, error } = await supabaseAdmin
    .from("salon_visits")
    .insert({
      ...tenantPayload(tenantId),
      patient_id,
      stylist_id: stylist_id || null,
      visit_date,
      menu_items: menu_items ?? [],
      total_amount: total_amount ?? 0,
      payment_method: payment_method || null,
      notes: notes || null,
      photo_urls: photo_urls || null,
    })
    .select("*, patients(id, name), stylists(id, name)")
    .single();

  if (error) {
    console.error("[salon-visits API] POST error:", error.message);
    return serverError(error.message);
  }

  return NextResponse.json({ visit: data }, { status: 201 });
}
