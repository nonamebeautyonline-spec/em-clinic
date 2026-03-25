// app/api/admin/subscription-plans/route.ts — 定期請求プランCRUD API
import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveTenantIdOrThrow, strictWithTenant, tenantPayload } from "@/lib/tenant";
import { logAudit } from "@/lib/audit";
import { z } from "zod/v4";
import { parseBody } from "@/lib/validations/helpers";

const planSchema = z.object({
  name: z.string().min(1, "プラン名は必須です"),
  product_id: z.string().nullable().optional(),
  interval_months: z.number().min(1).default(1),
  price: z.number().min(0, "価格は0以上"),
  discount_percent: z.number().min(0).max(100).optional().default(0),
  trial_days: z.number().min(0).optional().default(0),
  max_cycles: z.number().nullable().optional(),
  gateway: z.enum(["square", "gmo"]).default("square"),
  gateway_plan_id: z.string().nullable().optional(),
  is_active: z.boolean().optional().default(true),
  sort_order: z.number().optional().default(0),
}).passthrough();

// プラン一覧
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);

  const { data, error } = await strictWithTenant(
    supabaseAdmin.from("subscription_plans").select("*").order("sort_order", { ascending: true }),
    tenantId,
  );

  if (error) return serverError(error.message);
  return NextResponse.json({ plans: data || [] });
}

// プラン作成
export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const parsed = await parseBody(req, planSchema);
  if ("error" in parsed) return parsed.error;

  const d = parsed.data;
  const { data, error } = await supabaseAdmin
    .from("subscription_plans")
    .insert({
      ...tenantPayload(tenantId),
      name: d.name,
      product_id: d.product_id || null,
      interval_months: d.interval_months,
      price: d.price,
      discount_percent: d.discount_percent || 0,
      trial_days: d.trial_days || 0,
      max_cycles: d.max_cycles || null,
      gateway: d.gateway,
      gateway_plan_id: d.gateway_plan_id || null,
      is_active: d.is_active !== false,
      sort_order: d.sort_order || 0,
    })
    .select()
    .single();

  if (error) return serverError(error.message);
  logAudit(req, "subscription_plan.create", "subscription_plan", data.id);
  return NextResponse.json({ plan: data }, { status: 201 });
}

// プラン更新
export async function PUT(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const body = await req.json();
  const { id, ...updates } = body;
  if (!id) return badRequest("IDは必須です");

  updates.updated_at = new Date().toISOString();

  const { data, error } = await strictWithTenant(
    supabaseAdmin.from("subscription_plans").update(updates),
    tenantId,
  ).eq("id", id).select().single();

  if (error) return serverError(error.message);
  logAudit(req, "subscription_plan.update", "subscription_plan", id);
  return NextResponse.json({ plan: data });
}

// プラン削除
export async function DELETE(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return badRequest("IDは必須です");

  const { error } = await strictWithTenant(
    supabaseAdmin.from("subscription_plans").delete(),
    tenantId,
  ).eq("id", id);

  if (error) return serverError(error.message);
  logAudit(req, "subscription_plan.delete", "subscription_plan", id);
  return NextResponse.json({ ok: true });
}
