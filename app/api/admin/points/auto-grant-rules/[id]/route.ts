// app/api/admin/points/auto-grant-rules/[id]/route.ts — 個別ルール GET/PUT/DELETE
import { NextRequest, NextResponse } from "next/server";
import { badRequest, notFound, serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant } from "@/lib/tenant";

// 有効なトリガータイプ
const VALID_TRIGGER_TYPES = ["per_purchase", "first_purchase", "amount_threshold"] as const;
type TriggerType = (typeof VALID_TRIGGER_TYPES)[number];

function isValidTriggerType(t: string): t is TriggerType {
  return (VALID_TRIGGER_TYPES as readonly string[]).includes(t);
}

// 個別ルール取得
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantId(req);
  const { id } = await params;

  const { data: rule, error } = await withTenant(
    supabaseAdmin
      .from("point_auto_grant_rules")
      .select("*")
      .eq("id", id)
      .single(),
    tenantId,
  );

  if (error || !rule) return notFound("ルールが見つかりません");

  return NextResponse.json({ rule });
}

// ルール更新
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantId(req);
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return badRequest("リクエストボディが不正です");
  }

  const { name, trigger_type, points_amount, trigger_config, is_active } = body as {
    name?: string;
    trigger_type?: string;
    points_amount?: number;
    trigger_config?: Record<string, unknown>;
    is_active?: boolean;
  };

  // 更新データ構築
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (name !== undefined) updateData.name = name.trim();
  if (trigger_type !== undefined) {
    if (!isValidTriggerType(trigger_type)) {
      return badRequest("トリガータイプが不正です");
    }
    updateData.trigger_type = trigger_type;
  }
  if (points_amount !== undefined) updateData.points_amount = points_amount;
  if (trigger_config !== undefined) updateData.trigger_config = trigger_config;
  if (is_active !== undefined) updateData.is_active = is_active;

  const { data: rule, error } = await withTenant(
    supabaseAdmin
      .from("point_auto_grant_rules")
      .update(updateData)
      .eq("id", id)
      .select()
      .single(),
    tenantId,
  );

  if (error) return serverError(error.message);
  if (!rule) return notFound("ルールが見つかりません");

  return NextResponse.json({ ok: true, rule });
}

// ルール削除
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantId(req);
  const { id } = await params;

  const { error } = await withTenant(
    supabaseAdmin
      .from("point_auto_grant_rules")
      .delete()
      .eq("id", id),
    tenantId,
  );

  if (error) return serverError(error.message);

  return NextResponse.json({ ok: true });
}
