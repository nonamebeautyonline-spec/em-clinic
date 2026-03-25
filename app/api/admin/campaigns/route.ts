// app/api/admin/campaigns/route.ts — キャンペーン（期間限定セール）CRUD API
import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveTenantIdOrThrow, strictWithTenant, tenantPayload } from "@/lib/tenant";
import { logAudit } from "@/lib/audit";
import { z } from "zod/v4";
import { parseBody } from "@/lib/validations/helpers";

const campaignSchema = z.object({
  name: z.string().min(1, "キャンペーン名は必須です"),
  description: z.string().optional().default(""),
  discount_type: z.enum(["percent", "fixed"]),
  discount_value: z.number().min(1, "割引値は1以上"),
  target_type: z.enum(["all", "category", "specific"]),
  target_ids: z.array(z.string()).optional().default([]),
  target_category: z.string().optional().default(""),
  starts_at: z.string().min(1, "開始日は必須です"),
  ends_at: z.string().nullable().optional(),
  is_active: z.boolean().optional().default(true),
}).passthrough();

// キャンペーン一覧
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);

  const { data, error } = await strictWithTenant(
    supabaseAdmin.from("campaigns").select("*").order("created_at", { ascending: false }),
    tenantId,
  );

  if (error) return serverError(error.message);
  return NextResponse.json({ campaigns: data || [] });
}

// キャンペーン作成
export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const parsed = await parseBody(req, campaignSchema);
  if ("error" in parsed) return parsed.error;

  const { name, description, discount_type, discount_value, target_type, target_ids, target_category, starts_at, ends_at, is_active } = parsed.data;

  const { data, error } = await supabaseAdmin
    .from("campaigns")
    .insert({
      ...tenantPayload(tenantId),
      name,
      description: description || "",
      discount_type,
      discount_value,
      target_type,
      target_ids: target_ids || [],
      target_category: target_category || "",
      starts_at,
      ends_at: ends_at || null,
      is_active: is_active !== false,
    })
    .select()
    .single();

  if (error) return serverError(error.message);
  logAudit(req, "campaign.create", "campaign", data.id);
  return NextResponse.json({ campaign: data }, { status: 201 });
}

// キャンペーン更新
export async function PUT(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const body = await req.json();
  const { id, ...updates } = body;
  if (!id) return badRequest("IDは必須です");

  updates.updated_at = new Date().toISOString();

  const { data, error } = await strictWithTenant(
    supabaseAdmin.from("campaigns").update(updates),
    tenantId,
  ).eq("id", id).select().single();

  if (error) return serverError(error.message);
  logAudit(req, "campaign.update", "campaign", id);
  return NextResponse.json({ campaign: data });
}

// キャンペーン削除
export async function DELETE(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return badRequest("IDは必須です");

  const { error } = await strictWithTenant(
    supabaseAdmin.from("campaigns").delete(),
    tenantId,
  ).eq("id", id);

  if (error) return serverError(error.message);
  logAudit(req, "campaign.delete", "campaign", id);
  return NextResponse.json({ ok: true });
}
