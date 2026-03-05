// app/api/platform/totp/setup/route.ts — TOTP設定開始API
// シークレットとQRコードURIを生成（まだDBには保存しない）
import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { generateSecret, generateTOTPUri, generateBackupCodes } from "@/lib/totp";

export async function POST(req: NextRequest) {
  try {
    // プラットフォーム管理者認証
    const admin = await verifyPlatformAdmin(req);
    if (!admin) {
      return unauthorized();
    }

    // シークレット生成
    const secret = generateSecret();
    const uri = generateTOTPUri(secret, admin.email);
    const backupCodes = generateBackupCodes();

    return NextResponse.json({
      ok: true,
      secret,
      uri,
      backupCodes,
    });
  } catch (err) {
    console.error("[TOTP Setup] Error:", err);
    return serverError("サーバーエラー");
  }
}
