// app/api/admin/line/ab-test/[id]/variants/route.ts — バリアントCRUD API
import { NextRequest, NextResponse } from "next/server";
import { badRequest, notFound, serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow, strictWithTenant } from "@/lib/tenant";
import { logAudit } from "@/lib/audit";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET: 指定テストのバリアント一覧
 */
export async function GET(req: NextRequest, ctx: RouteContext) {
  const ok = await verifyAdminAuth(req);
  if (!ok) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const { id: testId } = await ctx.params;

  // テストの存在確認（テナントチェック）
  const { data: test } = await strictWithTenant(
    supabaseAdmin.from("ab_tests").select("id").eq("id", testId),
    tenantId,
  ).single();

  if (!test) return notFound("ABテストが見つかりません");

  const { data: variants, error } = await supabaseAdmin
    .from("ab_test_variants")
    .select("*")
    .eq("ab_test_id", testId)
    .order("created_at", { ascending: true });

  if (error) return serverError(error.message);

  return NextResponse.json({ variants: variants || [] });
}

/**
 * POST: バリアント追加
 */
export async function POST(req: NextRequest, ctx: RouteContext) {
  const ok = await verifyAdminAuth(req);
  if (!ok) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const { id: testId } = await ctx.params;

  // テストの存在・ステータス確認
  const { data: test } = await strictWithTenant(
    supabaseAdmin.from("ab_tests").select("id, status").eq("id", testId),
    tenantId,
  ).single();

  if (!test) return notFound("ABテストが見つかりません");
  if (test.status !== "draft") {
    return badRequest("下書き状態のテストにのみバリアントを追加できます");
  }

  const body = await req.json();
  const { name, message_content, message_type, flex_json, allocation_ratio } = body;

  if (!name) return badRequest("バリアント名は必須です");

  const { data: variant, error } = await supabaseAdmin
    .from("ab_test_variants")
    .insert({
      ab_test_id: testId,
      name,
      message_content: message_content || null,
      message_type: message_type || "text",
      flex_json: flex_json || null,
      allocation_ratio: allocation_ratio ?? 50,
    })
    .select()
    .single();

  if (error) return serverError(error.message);

  logAudit(req, "ab_test_variant.create", "ab_test_variant", String(variant.id));
  return NextResponse.json({ variant });
}

/**
 * PUT: バリアント更新（bodyにidを含む）
 */
export async function PUT(req: NextRequest, ctx: RouteContext) {
  const ok = await verifyAdminAuth(req);
  if (!ok) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const { id: testId } = await ctx.params;

  // テストの存在・ステータス確認
  const { data: test } = await strictWithTenant(
    supabaseAdmin.from("ab_tests").select("id, status").eq("id", testId),
    tenantId,
  ).single();

  if (!test) return notFound("ABテストが見つかりません");
  if (test.status !== "draft") {
    return badRequest("下書き状態のテストのみバリアントを編集できます");
  }

  const body = await req.json();
  const { id: variantId, name, message_content, message_type, flex_json, allocation_ratio } = body;

  if (!variantId) return badRequest("バリアントIDは必須です");

  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (message_content !== undefined) updateData.message_content = message_content;
  if (message_type !== undefined) updateData.message_type = message_type;
  if (flex_json !== undefined) updateData.flex_json = flex_json;
  if (allocation_ratio !== undefined) updateData.allocation_ratio = allocation_ratio;

  const { data: variant, error } = await supabaseAdmin
    .from("ab_test_variants")
    .update(updateData)
    .eq("id", variantId)
    .eq("ab_test_id", testId)
    .select()
    .single();

  if (error) return serverError(error.message);
  if (!variant) return notFound("バリアントが見つかりません");

  logAudit(req, "ab_test_variant.update", "ab_test_variant", String(variantId));
  return NextResponse.json({ variant });
}

/**
 * DELETE: バリアント削除（クエリパラメータ variantId）
 */
export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const ok = await verifyAdminAuth(req);
  if (!ok) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const { id: testId } = await ctx.params;

  const variantId = req.nextUrl.searchParams.get("variantId");
  if (!variantId) return badRequest("variantIdクエリパラメータが必要です");

  // テストの存在・ステータス確認
  const { data: test } = await strictWithTenant(
    supabaseAdmin.from("ab_tests").select("id, status").eq("id", testId),
    tenantId,
  ).single();

  if (!test) return notFound("ABテストが見つかりません");
  if (test.status !== "draft") {
    return badRequest("下書き状態のテストのみバリアントを削除できます");
  }

  // 最低2つは必要（削除後に1つ未満にならないか確認）
  const { count } = await supabaseAdmin
    .from("ab_test_variants")
    .select("id", { count: "exact", head: true })
    .eq("ab_test_id", testId);

  if ((count || 0) <= 2) {
    return badRequest("バリアントは最低2つ必要です");
  }

  const { error } = await supabaseAdmin
    .from("ab_test_variants")
    .delete()
    .eq("id", variantId)
    .eq("ab_test_id", testId);

  if (error) return serverError(error.message);

  logAudit(req, "ab_test_variant.delete", "ab_test_variant", String(variantId));
  return NextResponse.json({ ok: true });
}
