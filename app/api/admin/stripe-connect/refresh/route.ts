// app/api/admin/stripe-connect/refresh/route.ts — Stripe Connectオンボーディング中断時のリフレッシュ
// オンボーディングが中断された場合に新しいアカウントリンクを生成してリダイレクト
import { NextRequest, NextResponse } from "next/server";
import { decodeStripeState, refreshStripeAccountLink } from "@/lib/stripe-connect";

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

    // 新しいオンボーディングURLを生成
    const newUrl = await refreshStripeAccountLink(accountId, tenantId);

    console.log(`[Stripe Connect Refresh] リフレッシュ: tenant=${tenantId}, account=${accountId}`);

    return NextResponse.redirect(newUrl);
  } catch (error) {
    console.error("[Stripe Connect Refresh] エラー:", error);
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
