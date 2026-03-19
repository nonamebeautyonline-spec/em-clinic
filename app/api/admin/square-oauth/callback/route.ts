// app/api/admin/square-oauth/callback/route.ts — Square OAuth2 コールバック
// Squareの認可画面から戻ってきた際にcodeをtokenに交換し、アカウントを自動保存
import { NextRequest, NextResponse } from "next/server";
import { getSetting, setSetting } from "@/lib/settings";
import {
  decodeSquareState,
  exchangeSquareCode,
  fetchSquareMerchant,
  fetchSquareLocations,
  getSquareApplicationId,
} from "@/lib/square-oauth";
import type { SquareAccount } from "@/lib/square-account";

export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get("code");
    const state = req.nextUrl.searchParams.get("state");
    const error = req.nextUrl.searchParams.get("error");

    // ユーザーが認可を拒否した場合
    if (error) {
      console.error("[Square OAuth Callback] 認可拒否:", error);
      const redirectUrl = new URL("/admin/settings", req.nextUrl.origin);
      redirectUrl.searchParams.set("square_oauth_error", "auth_denied");
      return NextResponse.redirect(redirectUrl);
    }

    if (!code || !state) {
      const redirectUrl = new URL("/admin/settings", req.nextUrl.origin);
      redirectUrl.searchParams.set("square_oauth_error", "missing_params");
      return NextResponse.redirect(redirectUrl);
    }

    // stateデコード＋有効期限チェック
    let tenantId: string;
    try {
      const decoded = decodeSquareState(state);
      tenantId = decoded.tenantId;
    } catch {
      const redirectUrl = new URL("/admin/settings", req.nextUrl.origin);
      redirectUrl.searchParams.set("square_oauth_error", "invalid_state");
      return NextResponse.redirect(redirectUrl);
    }

    // 認証コード → トークン交換
    const tokenResponse = await exchangeSquareCode(code);
    const { access_token, refresh_token, expires_at, merchant_id } = tokenResponse;

    // マーチャント情報取得（アカウント名に使用）
    let businessName = "Squareアカウント";
    try {
      const merchant = await fetchSquareMerchant(access_token);
      if (merchant.businessName) businessName = merchant.businessName;
    } catch (e) {
      console.warn("[Square OAuth Callback] マーチャント情報取得失敗:", e);
    }

    // ロケーション一覧取得
    let locations: { id: string; name: string }[] = [];
    try {
      locations = await fetchSquareLocations(access_token);
    } catch (e) {
      console.warn("[Square OAuth Callback] ロケーション取得失敗:", e);
    }

    // 新しいSquareAccountを構築
    const newAccount: SquareAccount = {
      id: `sq_oauth_${Date.now()}`,
      name: businessName,
      access_token,
      application_id: getSquareApplicationId(),
      location_id: locations.length === 1 ? locations[0].id : "",
      webhook_signature_key: "",
      env: "production",
      three_ds_enabled: false,
      oauth_connected: true,
      refresh_token: refresh_token || "",
      token_expires_at: expires_at || "",
      merchant_id: merchant_id || "",
    };

    // 既存のaccounts配列に追加
    const accountsJson = await getSetting("square", "accounts", tenantId);
    let accounts: SquareAccount[] = [];
    if (accountsJson) {
      try {
        accounts = JSON.parse(accountsJson);
      } catch { /* 空配列で続行 */ }
    }

    accounts.push(newAccount);

    // 保存（新アカウントをアクティブに設定）
    await setSetting("square", "accounts", JSON.stringify(accounts), tenantId);
    await setSetting("square", "active_account_id", newAccount.id, tenantId);

    console.log(`[Square OAuth Callback] 接続成功: tenant=${tenantId}, merchant=${merchant_id}, account=${newAccount.id}`);

    // リダイレクト
    const redirectUrl = new URL("/admin/settings", req.nextUrl.origin);
    redirectUrl.searchParams.set("square_oauth", "success");

    // ロケーションが複数ある場合は選択が必要
    if (locations.length !== 1) {
      redirectUrl.searchParams.set("square_oauth", "select_location");
      redirectUrl.searchParams.set("sq_account_id", newAccount.id);
    }

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error("[Square OAuth Callback] エラー:", error);
    const redirectUrl = new URL("/admin/settings", req.nextUrl.origin);
    redirectUrl.searchParams.set("square_oauth_error", "server_error");
    return NextResponse.redirect(redirectUrl);
  }
}
