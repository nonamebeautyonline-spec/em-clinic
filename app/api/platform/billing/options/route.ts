// app/api/platform/billing/options/route.ts
// テナント別AIオプション管理API

import { NextRequest, NextResponse } from "next/server";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { AI_OPTIONS } from "@/lib/plan-config";
import { parseBody } from "@/lib/validations/helpers";
import { toggleOptionSchema } from "@/lib/validations/platform-billing";

/**
 * GET: テナントのAIオプション状態取得
 * クエリパラメータ:
 *   tenant_id - テナントID（必須）
 */
export async function GET(req: NextRequest) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin)
    return NextResponse.json(
      { ok: false, error: "権限がありません" },
      { status: 403 }
    );

  try {
    const url = new URL(req.url);
    const tenantId = url.searchParams.get("tenant_id");
    if (!tenantId) {
      return NextResponse.json(
        { ok: false, error: "tenant_idは必須です" },
        { status: 400 }
      );
    }

    // tenant_options から現在の設定を取得
    const { data: activeOptions } = await supabaseAdmin
      .from("tenant_options")
      .select("option_key, monthly_price, is_active, activated_at, deactivated_at")
      .eq("tenant_id", tenantId);

    // 全オプション一覧に対して、有効/無効ステータスをマージ
    const options = AI_OPTIONS.map((opt) => {
      const active = activeOptions?.find((a) => a.option_key === opt.key);
      return {
        key: opt.key,
        label: opt.label,
        monthlyPrice: opt.monthlyPrice,
        isActive: active?.is_active ?? false,
        activatedAt: active?.activated_at ?? null,
        deactivatedAt: active?.deactivated_at ?? null,
      };
    });

    // 有効なオプションの月額合計
    const totalOptionsFee = options
      .filter((o) => o.isActive)
      .reduce((sum, o) => sum + o.monthlyPrice, 0);

    return NextResponse.json({
      ok: true,
      tenantId,
      options,
      totalOptionsFee,
    });
  } catch (err) {
    console.error("[platform/billing/options] GET error:", err);
    return NextResponse.json(
      { ok: false, error: "オプション情報の取得に失敗しました" },
      { status: 500 }
    );
  }
}

/**
 * POST: AIオプションの有効/無効切替
 * Body: { tenantId, optionKey, isActive }
 */
export async function POST(req: NextRequest) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin)
    return NextResponse.json(
      { ok: false, error: "権限がありません" },
      { status: 403 }
    );

  const parsed = await parseBody(req, toggleOptionSchema);
  if (!parsed.ok) {
    return NextResponse.json(
      { ok: false, error: parsed.error },
      { status: 400 }
    );
  }

  const { tenantId, optionKey, isActive } = parsed.data;

  try {
    const optionDef = AI_OPTIONS.find((o) => o.key === optionKey);
    if (!optionDef) {
      return NextResponse.json(
        { ok: false, error: "無効なオプションキーです" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    // upsert: tenant_options に存在すれば更新、なければ挿入
    const { error } = await supabaseAdmin.from("tenant_options").upsert(
      {
        tenant_id: tenantId,
        option_key: optionKey,
        monthly_price: optionDef.monthlyPrice,
        is_active: isActive,
        activated_at: isActive ? now : undefined,
        deactivated_at: isActive ? null : now,
      },
      { onConflict: "tenant_id,option_key" }
    );

    if (error) {
      console.error("[platform/billing/options] POST error:", error);
      return NextResponse.json(
        { ok: false, error: "オプションの更新に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      optionKey,
      isActive,
      monthlyPrice: optionDef.monthlyPrice,
    });
  } catch (err) {
    console.error("[platform/billing/options] POST unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: "予期しないエラーが発生しました" },
      { status: 500 }
    );
  }
}
