// app/api/admin/platform/billing/plans/[tenantId]/route.ts
// テナント別プラン更新API

import { NextRequest, NextResponse } from "next/server";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { logAudit } from "@/lib/audit";
import { parseBody } from "@/lib/validations/helpers";
import { updatePlanSchema } from "@/lib/validations/platform-billing";

/**
 * PUT: プラン変更（upsert）
 * tenant_id で ON CONFLICT → プラン情報を更新
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin)
    return NextResponse.json(
      { ok: false, error: "権限がありません" },
      { status: 403 },
    );

  const { tenantId } = await params;

  // バリデーション
  const parsed = await parseBody(req, updatePlanSchema);
  if (parsed.error) return parsed.error;

  const data = parsed.data;

  try {
    // テナントの存在確認
    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("id, name")
      .eq("id", tenantId)
      .is("deleted_at", null)
      .maybeSingle();

    if (!tenant) {
      return NextResponse.json(
        { ok: false, error: "テナントが見つかりません" },
        { status: 404 },
      );
    }

    // tenant_plans の upsert（tenant_id が UNIQUE なので ON CONFLICT で更新）
    const { data: plan, error: planErr } = await supabaseAdmin
      .from("tenant_plans")
      .upsert(
        {
          tenant_id: tenantId,
          plan_name: data.planName,
          monthly_fee: data.monthlyFee,
          setup_fee: data.setupFee ?? 0,
          notes: data.notes ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "tenant_id" },
      )
      .select()
      .single();

    if (planErr) {
      console.error("[platform/billing/plans] PUT error:", planErr);
      return NextResponse.json(
        { ok: false, error: "プランの更新に失敗しました" },
        { status: 500 },
      );
    }

    // 監査ログ（fire-and-forget）
    logAudit(req, "update_plan", "tenant_plan", tenantId, {
      tenantName: tenant.name,
      planName: data.planName,
      monthlyFee: data.monthlyFee,
      setupFee: data.setupFee,
    });

    return NextResponse.json({
      ok: true,
      plan,
    });
  } catch (err) {
    console.error("[platform/billing/plans] PUT unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: "予期しないエラーが発生しました" },
      { status: 500 },
    );
  }
}
