// app/api/platform/totp/verify/route.ts — TOTPコード検証・有効化API
// setup で生成したシークレットで実際にコードが一致するか確認し、DBに保存
import { NextRequest, NextResponse } from "next/server";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { verifyTOTP } from "@/lib/totp";
import { encrypt } from "@/lib/crypto";
import { supabaseAdmin } from "@/lib/supabase";
import { logAudit } from "@/lib/audit";

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

    const body = await req.json();
    const { secret, token, backupCodes } = body as {
      secret?: string;
      token?: string;
      backupCodes?: string[];
    };

    if (!secret || !token) {
      return NextResponse.json(
        { ok: false, error: "シークレットとコードは必須です" },
        { status: 400 }
      );
    }

    // TOTPコードを検証
    const isValid = verifyTOTP(secret, token);
    if (!isValid) {
      return NextResponse.json(
        { ok: false, error: "コードが正しくありません。もう一度お試しください。" },
        { status: 400 }
      );
    }

    // シークレットを暗号化してDBに保存
    const encryptedSecret = encrypt(secret);

    const { error: updateError } = await supabaseAdmin
      .from("admin_users")
      .update({
        totp_secret: encryptedSecret,
        totp_enabled: true,
        totp_backup_codes: backupCodes || [],
      })
      .eq("id", admin.userId);

    if (updateError) {
      console.error("[TOTP Verify] DB update error:", updateError);
      return NextResponse.json(
        { ok: false, error: "設定の保存に失敗しました" },
        { status: 500 }
      );
    }

    // 監査ログ
    logAudit(req, "platform.totp.enabled", "admin_user", admin.userId, {
      email: admin.email,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[TOTP Verify] Error:", err);
    return NextResponse.json(
      { ok: false, error: "サーバーエラー" },
      { status: 500 }
    );
  }
}
