// app/api/platform/tenants/[tenantId]/features/route.ts
// プラットフォーム管理: テナント別の機能フラグオーバーライド設定

import { NextRequest, NextResponse } from "next/server";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { logAudit } from "@/lib/audit";
import {
  getEnabledFeatures,
  getPlanFeatures,
  ALL_FEATURES,
  FEATURE_LABELS,
  type Feature,
} from "@/lib/feature-flags";

interface RouteContext {
  params: Promise<{ tenantId: string }>;
}

/**
 * GET: テナントの機能フラグ状態を取得
 * プラン由来 + オーバーライド状態を統合して返す
 */
export async function GET(req: NextRequest, ctx: RouteContext) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin) {
    return NextResponse.json(
      { ok: false, error: "権限がありません" },
      { status: 403 }
    );
  }

  const { tenantId } = await ctx.params;

  // プラン名取得
  const { data: plan } = await supabaseAdmin
    .from("tenant_plans")
    .select("plan_name")
    .eq("tenant_id", tenantId)
    .eq("status", "active")
    .maybeSingle();

  const planName = plan?.plan_name ?? null;
  const planFeatures = planName ? getPlanFeatures(planName) : [];

  // オーバーライド取得
  const { data: overrides } = await supabaseAdmin
    .from("tenant_settings")
    .select("key, value")
    .eq("tenant_id", tenantId)
    .eq("category", "feature_flags");

  const overrideMap: Record<string, boolean> = {};
  for (const row of overrides ?? []) {
    overrideMap[row.key] = row.value === "true";
  }

  // 統合した有効機能
  const enabled = await getEnabledFeatures(tenantId);

  return NextResponse.json({
    ok: true,
    planName,
    features: ALL_FEATURES.map((f) => ({
      key: f,
      label: FEATURE_LABELS[f],
      fromPlan: planFeatures.includes(f),
      override: f in overrideMap ? overrideMap[f] : null,
      enabled: enabled.includes(f),
    })),
  });
}

/**
 * PUT: テナントの機能フラグオーバーライドを設定
 * body: { feature: string, enabled: boolean | null }
 * null を指定するとオーバーライドを削除（プランデフォルトに戻す）
 */
export async function PUT(req: NextRequest, ctx: RouteContext) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin) {
    return NextResponse.json(
      { ok: false, error: "権限がありません" },
      { status: 403 }
    );
  }

  const { tenantId } = await ctx.params;

  let body: { feature: string; enabled: boolean | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "不正なリクエスト" },
      { status: 400 }
    );
  }

  const { feature, enabled } = body;

  // 機能名のバリデーション
  if (!ALL_FEATURES.includes(feature as Feature)) {
    return NextResponse.json(
      { ok: false, error: `不明な機能: ${feature}` },
      { status: 400 }
    );
  }

  if (enabled === null) {
    // オーバーライド削除
    await supabaseAdmin
      .from("tenant_settings")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("category", "feature_flags")
      .eq("key", feature);
  } else {
    // オーバーライド設定（upsert）
    await supabaseAdmin.from("tenant_settings").upsert(
      {
        tenant_id: tenantId,
        category: "feature_flags",
        key: feature,
        value: String(enabled),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "tenant_id,category,key" }
    );
  }

  // 監査ログ
  logAudit(
    req,
    "platform.feature_flag.update",
    "feature_flags",
    feature,
    { tenantId, enabled },
  );

  // 更新後の状態を返す
  const updatedFeatures = await getEnabledFeatures(tenantId);

  return NextResponse.json({
    ok: true,
    enabledFeatures: updatedFeatures,
  });
}
