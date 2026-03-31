// app/api/admin/stripe-connect/callback/route.ts — Stripe Connect Expressオンボーディング完了コールバック
// stateで検証 → アカウント状態取得 → tenant_settingsに保存 → 設定ページにリダイレクト
import { NextRequest, NextResponse } from "next/server";
import { setSetting } from "@/lib/settings";
import { decodeStripeState, getConnectAccountStatus } from "@/lib/stripe-connect";

export async function GET(req: NextRequest) {
  const state = req.nextUrl.searchParams.get("state");
  const accountId = req.nextUrl.searchParams.get("account_id");

  if (!state || !accountId) {
    const redirectUrl = new URL("/admin/settings", req.nextUrl.origin);
    redirectUrl.searchParams.set("stripe_connect", "error");
    redirectUrl.searchParams.set("stripe_connect_error", "missing_params");
    return NextResponse.redirect(redirectUrl);
  }

  try {
    // stateデコード + 有効期限チェック
    const { tenantId } = decodeStripeState(state);

    // アカウント状態確認
    const status = await getConnectAccountStatus(accountId);

    // tenant_settingsに保存
    await setSetting("stripe_connect", "account_id", accountId, tenantId);
    await setSetting("stripe_connect", "charges_enabled", String(status.chargesEnabled), tenantId);
    await setSetting("stripe_connect", "payouts_enabled", String(status.payoutsEnabled), tenantId);
    await setSetting("stripe_connect", "details_submitted", String(status.detailsSubmitted), tenantId);
    await setSetting("stripe_connect", "connected_at", new Date().toISOString(), tenantId);

    console.log(`[Stripe Connect Callback] 接続成功: tenant=${tenantId}, account=${accountId}, charges=${status.chargesEnabled}`);

    const redirectUrl = new URL("/admin/settings", req.nextUrl.origin);
    redirectUrl.searchParams.set("stripe_connect", "success");
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error("[Stripe Connect Callback] エラー:", error);
    const redirectUrl = new URL("/admin/settings", req.nextUrl.origin);
    redirectUrl.searchParams.set("stripe_connect", "error");
    redirectUrl.searchParams.set(
      "stripe_connect_error",
      error instanceof Error && error.message.includes("有効期限")
        ? "expired_state"
        : "server_error"
    );
    return NextResponse.redirect(redirectUrl);
  }
}
