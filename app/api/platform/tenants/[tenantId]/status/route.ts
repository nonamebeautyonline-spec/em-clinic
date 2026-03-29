// app/api/platform/tenants/[tenantId]/status/route.ts
// テナント有効化/無効化 + ライフサイクル遷移API

import { NextRequest, NextResponse } from "next/server";
import { badRequest, forbidden, notFound, serverError } from "@/lib/api-error";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { logAudit } from "@/lib/audit";
import { parseBody } from "@/lib/validations/helpers";
import { updateTenantStatusSchema } from "@/lib/validations/platform-tenant";
import {
  deriveLifecycleStatus,
  getAllowedTransitions,
  type LifecycleStatus,
} from "@/lib/tenant-lifecycle";

interface RouteContext {
  params: Promise<{ tenantId: string }>;
}

/**
 * GET: テナントのライフサイクル状態を取得
 */
export async function GET(req: NextRequest, ctx: RouteContext) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin) return forbidden("権限がありません");

  const { tenantId } = await ctx.params;

  try {
    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("id, name, is_active, created_at, deleted_at, suspended_at, suspend_reason")
      .eq("id", tenantId)
      .single();

    if (!tenant) return notFound("テナントが見つかりません");

    const { data: plan } = await supabaseAdmin
      .from("tenant_plans")
      .select("status, plan_name, payment_failed_at, started_at")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    const currentStatus = deriveLifecycleStatus(tenant, plan);
    const allowedTransitions = getAllowedTransitions(currentStatus);

    return NextResponse.json({
      ok: true,
      lifecycle: {
        current: currentStatus,
        allowedTransitions,
        suspendedAt: tenant.suspended_at,
        suspendReason: tenant.suspend_reason,
        deletedAt: tenant.deleted_at,
        paymentFailedAt: plan?.payment_failed_at || null,
      },
    });
  } catch (err) {
    console.error("[status] GET error:", err);
    return serverError("ステータスの取得に失敗しました");
  }
}

/**
 * PUT: ライフサイクル状態を遷移させる
 */
export async function PUT(req: NextRequest, ctx: RouteContext) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin) return forbidden("権限がありません");

  const { tenantId } = await ctx.params;

  let body: { targetStatus: LifecycleStatus; reason?: string };
  try {
    body = await req.json();
  } catch {
    return badRequest("リクエストボディが不正です");
  }

  const { targetStatus, reason } = body;
  const validStatuses: LifecycleStatus[] = ["trial", "active", "grace", "suspended", "churned"];
  if (!validStatuses.includes(targetStatus)) {
    return badRequest("不正なステータスです");
  }

  try {
    // 現在の状態を取得
    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("id, name, is_active, created_at, deleted_at, suspended_at, suspend_reason")
      .eq("id", tenantId)
      .single();

    if (!tenant) return notFound("テナントが見つかりません");

    const { data: plan } = await supabaseAdmin
      .from("tenant_plans")
      .select("status, plan_name, payment_failed_at, started_at")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    const currentStatus = deriveLifecycleStatus(tenant, plan);
    const allowed = getAllowedTransitions(currentStatus);

    if (!allowed.includes(targetStatus)) {
      return badRequest(`${currentStatus} から ${targetStatus} への遷移は許可されていません`);
    }

    const now = new Date().toISOString();

    // 状態遷移を実行
    switch (targetStatus) {
      case "active": {
        await supabaseAdmin
          .from("tenants")
          .update({
            is_active: true,
            suspended_at: null,
            suspend_reason: null,
            deleted_at: null,
            updated_at: now,
          })
          .eq("id", tenantId);

        // プランも active に
        if (plan) {
          await supabaseAdmin
            .from("tenant_plans")
            .update({ status: "active", payment_failed_at: null, updated_at: now })
            .eq("tenant_id", tenantId);
        }

        // メンバー再有効化
        await supabaseAdmin
          .from("admin_users")
          .update({ is_active: true })
          .eq("tenant_id", tenantId);
        break;
      }

      case "suspended": {
        await supabaseAdmin
          .from("tenants")
          .update({
            is_active: false,
            suspended_at: now,
            suspend_reason: reason || "プラットフォーム管理者による停止",
            updated_at: now,
          })
          .eq("id", tenantId);

        if (plan) {
          await supabaseAdmin
            .from("tenant_plans")
            .update({ status: "suspended", updated_at: now })
            .eq("tenant_id", tenantId);
        }
        break;
      }

      case "churned": {
        await supabaseAdmin
          .from("tenants")
          .update({
            is_active: false,
            deleted_at: now,
            updated_at: now,
          })
          .eq("id", tenantId);

        if (plan) {
          await supabaseAdmin
            .from("tenant_plans")
            .update({ status: "cancelled", updated_at: now })
            .eq("tenant_id", tenantId);
        }

        // メンバー無効化
        await supabaseAdmin
          .from("admin_users")
          .update({ is_active: false })
          .eq("tenant_id", tenantId);
        break;
      }

      case "trial": {
        await supabaseAdmin
          .from("tenants")
          .update({
            is_active: true,
            suspended_at: null,
            suspend_reason: null,
            updated_at: now,
          })
          .eq("id", tenantId);

        if (plan) {
          await supabaseAdmin
            .from("tenant_plans")
            .update({ status: "trial", plan_name: "trial", updated_at: now })
            .eq("tenant_id", tenantId);
        }
        break;
      }

      case "grace": {
        // 通常はcronが設定するが、手動設定も可能
        if (plan) {
          await supabaseAdmin
            .from("tenant_plans")
            .update({
              status: "payment_failed",
              payment_failed_at: now,
              updated_at: now,
            })
            .eq("tenant_id", tenantId);
        }
        break;
      }
    }

    logAudit(req, "platform.lifecycle.transition", "tenant", tenantId, {
      tenantName: tenant.name,
      from: currentStatus,
      to: targetStatus,
      reason,
    });

    return NextResponse.json({
      ok: true,
      from: currentStatus,
      to: targetStatus,
    });
  } catch (err) {
    console.error("[status] PUT error:", err);
    return serverError("状態遷移に失敗しました");
  }
}

/**
 * PATCH: テナントのステータスを変更（有効化/無効化）- レガシー互換
 */
export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin)
    return forbidden("権限がありません");

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
      return notFound("テナントが見つかりません");
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
      return serverError("ステータスの変更に失敗しました");
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
    return serverError("予期しないエラーが発生しました");
  }
}
