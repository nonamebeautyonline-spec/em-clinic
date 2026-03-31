// app/api/admin/stripe-connect/status/route.ts — Stripe Connect接続状態確認
import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow } from "@/lib/tenant";
import { getSetting } from "@/lib/settings";
import { getConnectAccountStatus } from "@/lib/stripe-connect";

export async function GET(req: NextRequest) {
  try {
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) return unauthorized();

    const tenantId = resolveTenantIdOrThrow(req);

    // tenant_settingsからStripe Connect設定を取得
    const accountId = await getSetting("stripe_connect", "account_id", tenantId);

    if (!accountId) {
      return NextResponse.json({
        ok: true,
        connected: false,
      });
    }

    // Stripe APIから最新の状態を取得
    let liveStatus = null;
    try {
      liveStatus = await getConnectAccountStatus(accountId);
    } catch {
      // APIエラー時はDB保存値を返す
    }

    const connectedAt = await getSetting("stripe_connect", "connected_at", tenantId);

    return NextResponse.json({
      ok: true,
      connected: true,
      accountId,
      chargesEnabled: liveStatus?.chargesEnabled
        ?? (await getSetting("stripe_connect", "charges_enabled", tenantId)) === "true",
      payoutsEnabled: liveStatus?.payoutsEnabled
        ?? (await getSetting("stripe_connect", "payouts_enabled", tenantId)) === "true",
      detailsSubmitted: liveStatus?.detailsSubmitted
        ?? (await getSetting("stripe_connect", "details_submitted", tenantId)) === "true",
      connectedAt,
    });
  } catch (error) {
    console.error("[Stripe Connect Status] エラー:", error);
    return serverError(error instanceof Error ? error.message : "Server error");
  }
}
