// app/api/admin/chatbot/scenarios/[id]/route.ts — 個別シナリオ GET/PUT/DELETE
import { NextRequest, NextResponse } from "next/server";
import { badRequest, notFound, serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow, strictWithTenant } from "@/lib/tenant";

type RouteContext = { params: Promise<{ id: string }> };

// 個別取得
export async function GET(req: NextRequest, ctx: RouteContext) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const { id } = await ctx.params;
  const tenantId = resolveTenantIdOrThrow(req);

  const { data, error } = await strictWithTenant(
    supabaseAdmin
      .from("chatbot_scenarios")
      .select("*")
      .eq("id", id)
      .maybeSingle(),
    tenantId,
  );

  if (error) return serverError(error.message);
  if (!data) return notFound("シナリオが見つかりません");
  return NextResponse.json({ scenario: data });
}

// 更新
export async function PUT(req: NextRequest, ctx: RouteContext) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const { id } = await ctx.params;
  const tenantId = resolveTenantIdOrThrow(req);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return badRequest("リクエストの形式が不正です");
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.name !== undefined) update.name = (body.name as string).trim();
  if (body.description !== undefined) update.description = body.description || null;
  if (body.trigger_keyword !== undefined) update.trigger_keyword = body.trigger_keyword || null;
  if (body.is_active !== undefined) update.is_active = body.is_active;

  const { data, error } = await strictWithTenant(
    supabaseAdmin
      .from("chatbot_scenarios")
      .update(update)
      .eq("id", id),
    tenantId,
  ).select().single();

  if (error) return serverError(error.message);
  return NextResponse.json({ ok: true, scenario: data });
}

// 削除
export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const { id } = await ctx.params;
  const tenantId = resolveTenantIdOrThrow(req);

  const { error } = await strictWithTenant(
    supabaseAdmin
      .from("chatbot_scenarios")
      .delete()
      .eq("id", id),
    tenantId,
  );

  if (error) return serverError(error.message);
  return NextResponse.json({ ok: true });
}
