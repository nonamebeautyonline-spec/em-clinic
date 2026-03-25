// app/api/admin/patient-discounts/route.ts — 個別患者割引CRUD API
import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveTenantIdOrThrow, strictWithTenant, tenantPayload } from "@/lib/tenant";
import { logAudit } from "@/lib/audit";
import { z } from "zod/v4";
import { parseBody } from "@/lib/validations/helpers";

const discountSchema = z.object({
  patient_id: z.string().min(1, "患者IDは必須です"),
  product_id: z.string().nullable().optional(),
  discount_type: z.enum(["percent", "fixed"]),
  discount_value: z.number().min(1, "割引値は1以上"),
  reason: z.string().optional().default(""),
  valid_until: z.string().nullable().optional(),
  is_active: z.boolean().optional().default(true),
}).passthrough();

// 患者の個別割引一覧
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const { searchParams } = new URL(req.url);
  const patientId = searchParams.get("patient_id");

  let query = strictWithTenant(
    supabaseAdmin.from("patient_discounts").select("*").order("created_at", { ascending: false }),
    tenantId,
  );

  if (patientId) {
    query = query.eq("patient_id", patientId);
  }

  const { data, error } = await query;
  if (error) return serverError(error.message);
  return NextResponse.json({ discounts: data || [] });
}

// 個別割引作成
export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const parsed = await parseBody(req, discountSchema);
  if ("error" in parsed) return parsed.error;

  const { patient_id, product_id, discount_type, discount_value, reason, valid_until, is_active } = parsed.data;

  const { data, error } = await supabaseAdmin
    .from("patient_discounts")
    .insert({
      ...tenantPayload(tenantId),
      patient_id,
      product_id: product_id || null,
      discount_type,
      discount_value,
      reason: reason || "",
      valid_until: valid_until || null,
      is_active: is_active !== false,
    })
    .select()
    .single();

  if (error) return serverError(error.message);
  logAudit(req, "patient_discount.create", "patient_discount", data.id);
  return NextResponse.json({ discount: data }, { status: 201 });
}

// 個別割引更新
export async function PUT(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const body = await req.json();
  const { id, ...updates } = body;
  if (!id) return badRequest("IDは必須です");

  updates.updated_at = new Date().toISOString();

  const { data, error } = await strictWithTenant(
    supabaseAdmin.from("patient_discounts").update(updates),
    tenantId,
  ).eq("id", id).select().single();

  if (error) return serverError(error.message);
  logAudit(req, "patient_discount.update", "patient_discount", id);
  return NextResponse.json({ discount: data });
}

// 個別割引削除
export async function DELETE(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return badRequest("IDは必須です");

  const { error } = await strictWithTenant(
    supabaseAdmin.from("patient_discounts").delete(),
    tenantId,
  ).eq("id", id);

  if (error) return serverError(error.message);
  logAudit(req, "patient_discount.delete", "patient_discount", id);
  return NextResponse.json({ ok: true });
}
