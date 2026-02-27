// app/api/admin/google-calendar/auth/route.ts
// Google Calendar OAuth2 認証URL生成API
// 管理者が医師のGoogleカレンダー連携を開始する際に呼び出す

import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId } from "@/lib/tenant";
import { getAuthUrl } from "@/lib/google-calendar";

export async function GET(req: NextRequest) {
  try {
    // 管理者認証チェック
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = resolveTenantId(req);
    if (!tenantId) {
      return NextResponse.json({ error: "テナントIDが取得できません" }, { status: 400 });
    }

    // doctor_id パラメータ取得
    const doctorId = req.nextUrl.searchParams.get("doctor_id");
    if (!doctorId) {
      return NextResponse.json(
        { error: "doctor_id パラメータは必須です" },
        { status: 400 }
      );
    }

    // OAuth2認証URLを生成
    const authUrl = getAuthUrl(tenantId, doctorId);

    return NextResponse.json({ ok: true, authUrl });
  } catch (error) {
    console.error("[Google Calendar Auth] エラー:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}
