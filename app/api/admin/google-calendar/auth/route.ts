// app/api/admin/google-calendar/auth/route.ts
// Google Calendar OAuth2 認証URL生成API
// 管理者が医師のGoogleカレンダー連携を開始する際に呼び出す

import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow } from "@/lib/tenant";
import { getAuthUrl } from "@/lib/google-calendar";

export async function GET(req: NextRequest) {
  try {
    // 管理者認証チェック
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) {
      return unauthorized();
    }

    const tenantId = resolveTenantIdOrThrow(req);
    if (!tenantId) {
      return badRequest("テナントIDが取得できません");
    }

    // doctor_id パラメータ取得
    const doctorId = req.nextUrl.searchParams.get("doctor_id");
    if (!doctorId) {
      return badRequest("doctor_id パラメータは必須です");
    }

    // OAuth2認証URLを生成
    const authUrl = getAuthUrl(tenantId, doctorId);

    return NextResponse.json({ ok: true, authUrl });
  } catch (error) {
    console.error("[Google Calendar Auth] エラー:", error);
    return serverError(error instanceof Error ? error.message : "Server error");
  }
}
