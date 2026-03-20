// app/api/admin/square-oauth/revoke/route.ts — Square OAuth接続解除
import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow } from "@/lib/tenant";
import { getSetting, setSetting } from "@/lib/settings";
import { revokeSquareToken } from "@/lib/square-oauth";
import type { SquareAccount } from "@/lib/square-account";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) return unauthorized();

    const tenantId = resolveTenantIdOrThrow(req) ?? undefined;
    const body = await req.json();
    const { accountId } = body;

    if (!accountId) return badRequest("accountId は必須です");

    const accountsJson = await getSetting("square", "accounts", tenantId);
    if (!accountsJson) return badRequest("Squareアカウントが設定されていません");

    const accounts: SquareAccount[] = JSON.parse(accountsJson);
    const idx = accounts.findIndex((a) => a.id === accountId);
    if (idx === -1) return badRequest("指定されたアカウントが見つかりません");

    const account = accounts[idx];

    // Squareにトークン失効をリクエスト
    if (account.access_token && account.oauth_connected) {
      try {
        await revokeSquareToken(account.access_token);
      } catch (e) {
        console.warn("[Square OAuth Revoke] トークン失効リクエスト失敗（続行）:", e);
      }
    }

    // アカウントを配列から削除
    accounts.splice(idx, 1);

    // アクティブアカウントが削除された場合は先頭に切替
    const activeId = await getSetting("square", "active_account_id", tenantId);
    if (activeId === accountId) {
      const newActiveId = accounts[0]?.id || "";
      await setSetting("square", "active_account_id", newActiveId, tenantId);
    }

    await setSetting("square", "accounts", JSON.stringify(accounts), tenantId);

    console.log(`[Square OAuth Revoke] 切断成功: tenant=${tenantId}, account=${accountId}`);

    logAudit(req, "square_oauth.revoke", "square_oauth", String(accountId));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Square OAuth Revoke] エラー:", error);
    return serverError(error instanceof Error ? error.message : "Server error");
  }
}
