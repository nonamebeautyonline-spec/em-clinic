// app/api/admin/points/settings/route.ts — ポイント設定API
// GET: ポイント設定取得, PUT: ポイント設定更新

import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow, tenantPayload, strictWithTenant } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase";
import { getPointSettings } from "@/lib/points";
import { logAudit } from "@/lib/audit";

/**
 * GET: ポイント設定を取得
 */
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);

  try {
    const settings = await getPointSettings(tenantId);
    return NextResponse.json({ ok: true, settings });
  } catch (err) {
    console.error("[admin/points/settings] GET error:", err);
    return serverError("ポイント設定の取得に失敗しました");
  }
}

/**
 * PUT: ポイント設定を更新（upsert）
 * body: { points_per_yen?, expiry_months?, is_active? }
 */
export async function PUT(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);

  try {
    const body = await req.json();
    const { points_per_yen, expiry_months, is_active } = body;

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (points_per_yen !== undefined) {
      if (typeof points_per_yen !== "number" || points_per_yen < 0) {
        return badRequest("points_per_yen は0以上の整数で指定してください");
      }
      updates.points_per_yen = points_per_yen;
    }

    if (expiry_months !== undefined) {
      if (typeof expiry_months !== "number" || expiry_months < 1) {
        return badRequest("expiry_months は1以上の整数で指定してください");
      }
      updates.expiry_months = expiry_months;
    }

    if (is_active !== undefined) {
      if (typeof is_active !== "boolean") {
        return badRequest("is_active は真偽値で指定してください");
      }
      updates.is_active = is_active;
    }

    // upsert（tenant_idでユニーク制約あり）
    const { data, error } = await supabaseAdmin
      .from("point_settings")
      .upsert(
        { ...tenantPayload(tenantId), ...updates },
        { onConflict: "tenant_id" },
      )
      .select()
      .single();

    if (error) {
      console.error("[admin/points/settings] PUT error:", error);
      return serverError("ポイント設定の更新に失敗しました");
    }

    logAudit(req, "point_settings.update", "point_settings", "settings");
    return NextResponse.json({ ok: true, settings: data });
  } catch (err) {
    console.error("[admin/points/settings] PUT error:", err);
    return serverError("ポイント設定の更新に失敗しました");
  }
}
