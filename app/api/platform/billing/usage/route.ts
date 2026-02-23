// app/api/platform/billing/usage/route.ts
// テナント別メッセージ使用量API

import { NextRequest, NextResponse } from "next/server";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { getCurrentMonthUsage, getMonthUsage } from "@/lib/usage";

/**
 * GET: テナントの使用量取得
 * クエリパラメータ:
 *   tenant_id - 特定テナントの使用量（省略時は全テナント）
 *   month     - 対象月 "YYYY-MM"（省略時は当月）
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
    const monthParam = url.searchParams.get("month");

    // 対象月の Date を作成
    let targetDate = new Date();
    if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
      const [year, month] = monthParam.split("-").map(Number);
      targetDate = new Date(year, month - 1, 1);
    }

    // 特定テナント指定時
    if (tenantId) {
      const usage = await getMonthUsage(tenantId, targetDate);
      return NextResponse.json({ ok: true, usage });
    }

    // 全テナント一覧（アクティブのみ）
    const { data: tenants } = await supabaseAdmin
      .from("tenants")
      .select("id, name, slug")
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("name");

    if (!tenants || tenants.length === 0) {
      return NextResponse.json({ ok: true, usages: [] });
    }

    const usages = await Promise.all(
      tenants.map(async (tenant) => {
        const usage = monthParam
          ? await getMonthUsage(tenant.id, targetDate)
          : await getCurrentMonthUsage(tenant.id);
        return {
          ...usage,
          tenantName: tenant.name,
          tenantSlug: tenant.slug,
        };
      })
    );

    return NextResponse.json({ ok: true, usages });
  } catch (err) {
    console.error("[platform/billing/usage] GET error:", err);
    return NextResponse.json(
      { ok: false, error: "使用量の取得に失敗しました" },
      { status: 500 }
    );
  }
}
