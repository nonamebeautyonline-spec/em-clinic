// app/api/platform/usage/route.ts
// プラットフォーム管理: 全テナント使用量一覧API

import { NextRequest, NextResponse } from "next/server";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { getCurrentMonthUsage } from "@/lib/usage";
import { checkQuota, getAlertLevel, getAlertLabel } from "@/lib/usage-quota";

export const dynamic = "force-dynamic";

/**
 * GET: 全テナントの使用量一覧を取得
 * レスポンス: テナントごとのメッセージ数/quota、ストレージ使用量、AI呼出数、アラート状態
 */
export async function GET(req: NextRequest) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin) {
    return NextResponse.json(
      { ok: false, error: "権限がありません" },
      { status: 403 },
    );
  }

  try {
    // 全アクティブテナントを取得
    const { data: tenants, error: tenantsErr } = await supabaseAdmin
      .from("tenants")
      .select("id, name, slug, is_active, contact_email")
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("name", { ascending: true });

    if (tenantsErr) {
      return NextResponse.json(
        { ok: false, error: tenantsErr.message },
        { status: 500 },
      );
    }

    if (!tenants || tenants.length === 0) {
      return NextResponse.json({
        ok: true,
        tenants: [],
      });
    }

    // 各テナントの使用量を並列取得
    const usageResults = await Promise.allSettled(
      tenants.map(async (tenant) => {
        const [usage, quota] = await Promise.all([
          getCurrentMonthUsage(tenant.id),
          checkQuota(tenant.id),
        ]);

        const alertLevel = getAlertLevel(quota.percentUsed);
        const alertLabel = getAlertLabel(alertLevel);

        return {
          tenantId: tenant.id,
          tenantName: tenant.name,
          slug: tenant.slug,
          isActive: tenant.is_active,
          // メッセージ使用量
          messageCount: usage.messageCount,
          messageQuota: usage.quota,
          percentUsed: quota.percentUsed,
          remaining: usage.remaining,
          overageCount: usage.overageCount,
          // ストレージ
          storageMb: usage.storageMb,
          storageQuotaMb: usage.storageQuotaMb,
          storagePercent:
            usage.storageQuotaMb > 0
              ? Math.round((usage.storageMb / usage.storageQuotaMb) * 100)
              : 0,
          // API呼出数
          apiCallCount: usage.apiCallCount,
          // アラート状態
          alertLevel,
          alertLabel,
          // 月
          month: usage.month,
        };
      }),
    );

    // 成功した結果のみを返す
    const tenantUsages = usageResults
      .filter(
        (r): r is PromiseFulfilledResult<ReturnType<typeof getAlertLevel> extends never ? never : any> =>
          r.status === "fulfilled",
      )
      .map((r) => r.value);

    // サマリー統計
    const summary = {
      totalTenants: tenantUsages.length,
      cautionCount: tenantUsages.filter((t) => t.alertLevel === "caution").length,
      warningCount: tenantUsages.filter((t) => t.alertLevel === "warning").length,
      limitCount: tenantUsages.filter((t) => t.alertLevel === "limit").length,
      totalMessages: tenantUsages.reduce((sum, t) => sum + t.messageCount, 0),
      totalStorageMb: Math.round(
        tenantUsages.reduce((sum, t) => sum + t.storageMb, 0) * 100,
      ) / 100,
    };

    return NextResponse.json({
      ok: true,
      tenants: tenantUsages,
      summary,
    });
  } catch (err) {
    console.error("[platform/usage] GET unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: "予期しないエラーが発生しました" },
      { status: 500 },
    );
  }
}
