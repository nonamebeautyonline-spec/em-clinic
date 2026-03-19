// app/api/admin/square-oauth/auth/route.ts — Square OAuth2 認可URL生成
import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId } from "@/lib/tenant";
import { getSquareAuthUrl } from "@/lib/square-oauth";

export async function GET(req: NextRequest) {
  try {
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) return unauthorized();

    const tenantId = resolveTenantId(req);
    if (!tenantId) return badRequest("テナントIDが取得できません");

    const authUrl = await getSquareAuthUrl(tenantId);
    return NextResponse.json({ ok: true, authUrl });
  } catch (error) {
    console.error("[Square OAuth Auth] エラー:", error);
    return serverError(error instanceof Error ? error.message : "Server error");
  }
}
