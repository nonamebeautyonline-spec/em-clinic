// app/api/platform/tenants/[tenantId]/status/route.ts
// テナント有効化/無効化API

import { NextRequest, NextResponse } from "next/server";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { logAudit } from "@/lib/audit";
import { parseBody } from "@/lib/validations/helpers";
import { updateTenantStatusSchema } from "@/lib/validations/platform-tenant";

interface RouteContext {
  params: Promise<{ tenantId: string }>;
}

/**
 * PATCH: テナントのステータスを変更（有効化/無効化）
 */
export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin)
    return NextResponse.json(
      { ok: false, error: "権限がありません" },
      { status: 403 },
    );

  const { tenantId } = await ctx.params;

  const parsed = await parseBody(req, updateTenantStatusSchema);
  if (parsed.error) return parsed.error;

  const { isActive } = parsed.data;

  try {
    // テナント存在確認
    const { data: existing } = await supabaseAdmin
      .from("tenants")
      .select("id, name, is_active")
      .eq("id", tenantId)
      .is("deleted_at", null)
      .single();

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "テナントが見つかりません" },
        { status: 404 },
      );
    }

    // 同じステータスの場合はスキップ
    if (existing.is_active === isActive) {
      return NextResponse.json({
        ok: true,
        message: isActive ? "既に有効です" : "既に無効です",
      });
    }

    // ステータス更新
    const { error: updateErr } = await supabaseAdmin
      .from("tenants")
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq("id", tenantId);

    if (updateErr) {
      console.error("[platform/tenants/[id]/status] PATCH error:", updateErr);
      return NextResponse.json(
        { ok: false, error: "ステータスの変更に失敗しました" },
        { status: 500 },
      );
    }

    // 無効化の場合、テナントメンバーも無効化
    if (!isActive) {
      await supabaseAdmin
        .from("admin_users")
        .update({ is_active: false })
        .eq("tenant_id", tenantId);
    } else {
      // 有効化の場合、メンバーも再有効化
      await supabaseAdmin
        .from("admin_users")
        .update({ is_active: true })
        .eq("tenant_id", tenantId);
    }

    // 監査ログ（fire-and-forget）
    logAudit(
      req,
      isActive ? "activate_tenant" : "deactivate_tenant",
      "tenant",
      tenantId,
      { name: existing.name, isActive },
    );

    return NextResponse.json({
      ok: true,
      message: isActive ? "テナントを有効化しました" : "テナントを無効化しました",
    });
  } catch (err) {
    console.error("[platform/tenants/[id]/status] PATCH unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: "予期しないエラーが発生しました" },
      { status: 500 },
    );
  }
}
