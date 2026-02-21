// app/api/platform/totp/setup/route.ts — TOTP設定開始API
// シークレットとQRコードURIを生成（まだDBには保存しない）
import { NextRequest, NextResponse } from "next/server";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { generateSecret, generateTOTPUri, generateBackupCodes } from "@/lib/totp";

export async function POST(req: NextRequest) {
  try {
    // プラットフォーム管理者認証
    const admin = await verifyPlatformAdmin(req);
    if (!admin) {
      return NextResponse.json(
        { ok: false, error: "認証が必要です" },
        { status: 401 }
      );
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
    return NextResponse.json(
      { ok: false, error: "サーバーエラー" },
      { status: 500 }
    );
  }
}
