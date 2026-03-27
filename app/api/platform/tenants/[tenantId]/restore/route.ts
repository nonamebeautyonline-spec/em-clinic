// app/api/platform/tenants/[tenantId]/restore/route.ts
// 削除済みテナントの復元API（ソフトデリートの解除）

import { NextRequest, NextResponse } from "next/server";
import { badRequest, forbidden, notFound, serverError } from "@/lib/api-error";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { logAudit } from "@/lib/audit";

interface RouteContext {
  params: Promise<{ tenantId: string }>;
}

/**
 * POST: 削除済みテナントを復元
 * deleted_at を null に戻し、is_active = true にする
 */
export async function POST(req: NextRequest, ctx: RouteContext) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin) return forbidden("権限がありません");

  const { tenantId } = await ctx.params;

  try {
    // 削除済みテナントを検索
    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("id, name, slug, deleted_at")
      .eq("id", tenantId)
      .not("deleted_at", "is", null)
      .single();

    if (!tenant) {
      return notFound("削除済みテナントが見つかりません");
    }

    // スラグの重複チェック（復元後に同名スラグが存在しないか）
    const { data: duplicate } = await supabaseAdmin
      .from("tenants")
      .select("id")
      .eq("slug", tenant.slug)
      .is("deleted_at", null)
      .neq("id", tenantId)
      .maybeSingle();

    if (duplicate) {
      return badRequest(
        `スラグ「${tenant.slug}」は既に別のテナントで使用されています。復元前にスラグを変更してください。`,
      );
    }

    // 復元
    const now = new Date().toISOString();
    const { error: updateErr } = await supabaseAdmin
      .from("tenants")
      .update({
        deleted_at: null,
        is_active: true,
        suspended_at: null,
        suspend_reason: null,
        updated_at: now,
      })
      .eq("id", tenantId);

    if (updateErr) {
      console.error("[platform/tenants/restore] 復元エラー:", updateErr);
      return serverError("テナントの復元に失敗しました");
    }

    // メンバーも再有効化
    await supabaseAdmin
      .from("admin_users")
      .update({ is_active: true })
      .eq("tenant_id", tenantId);

    // 監査ログ
    logAudit(req, "restore_tenant", "tenant", tenantId, {
      name: tenant.name,
      slug: tenant.slug,
      deletedAt: tenant.deleted_at,
      restoredBy: admin.name,
    });

    return NextResponse.json({
      ok: true,
      message: `テナント「${tenant.name}」を復元しました`,
    });
  } catch (err) {
    console.error("[platform/tenants/restore] 予期しないエラー:", err);
    return serverError("予期しないエラーが発生しました");
  }
}
