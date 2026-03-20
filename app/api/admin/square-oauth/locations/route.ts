// app/api/admin/square-oauth/locations/route.ts — OAuth接続済みアカウントのLocation選択
import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow } from "@/lib/tenant";
import { getSetting, setSetting } from "@/lib/settings";
import { fetchSquareLocations } from "@/lib/square-oauth";
import type { SquareAccount } from "@/lib/square-account";
import { logAudit } from "@/lib/audit";

/** GET: アカウントのロケーション一覧を取得 */
export async function GET(req: NextRequest) {
  try {
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) return unauthorized();

    const tenantId = resolveTenantIdOrThrow(req) ?? undefined;
    const accountId = req.nextUrl.searchParams.get("account_id");
    if (!accountId) return badRequest("account_id は必須です");

    const accountsJson = await getSetting("square", "accounts", tenantId);
    if (!accountsJson) return badRequest("Squareアカウントが設定されていません");

    const accounts: SquareAccount[] = JSON.parse(accountsJson);
    const account = accounts.find((a) => a.id === accountId);
    if (!account) return badRequest("指定されたアカウントが見つかりません");
    if (!account.access_token) return badRequest("アクセストークンがありません");

    const locations = await fetchSquareLocations(account.access_token);

    return NextResponse.json({
      locations: locations.map((l) => ({
        id: l.id,
        name: l.name,
        address: l.address,
      })),
      currentLocationId: account.location_id,
    });
  } catch (error) {
    console.error("[Square OAuth Locations GET] エラー:", error);
    return serverError(error instanceof Error ? error.message : "Server error");
  }
}

/** PUT: アカウントのlocation_idを更新 */
export async function PUT(req: NextRequest) {
  try {
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) return unauthorized();

    const tenantId = resolveTenantIdOrThrow(req) ?? undefined;
    const body = await req.json();
    const { accountId, locationId } = body;

    if (!accountId || !locationId) {
      return badRequest("accountId と locationId は必須です");
    }

    const accountsJson = await getSetting("square", "accounts", tenantId);
    if (!accountsJson) return badRequest("Squareアカウントが設定されていません");

    const accounts: SquareAccount[] = JSON.parse(accountsJson);
    const idx = accounts.findIndex((a) => a.id === accountId);
    if (idx === -1) return badRequest("指定されたアカウントが見つかりません");

    accounts[idx].location_id = locationId.trim();
    await setSetting("square", "accounts", JSON.stringify(accounts), tenantId);

    logAudit(req, "square_oauth.select_location", "square_oauth", String(accountId));
    return NextResponse.json({ success: true, locationId: accounts[idx].location_id });
  } catch (error) {
    console.error("[Square OAuth Locations PUT] エラー:", error);
    return serverError(error instanceof Error ? error.message : "Server error");
  }
}
