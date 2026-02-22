// app/api/platform/totp/disable/route.ts — TOTP無効化API
// 現在のTOTPコードで確認後、2FA設定を削除
import { NextRequest, NextResponse } from "next/server";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { verifyTOTP } from "@/lib/totp";
import { decrypt } from "@/lib/crypto";
import { supabaseAdmin } from "@/lib/supabase";
import { logAudit } from "@/lib/audit";
import { parseBody } from "@/lib/validations/helpers";
import { totpDisableSchema } from "@/lib/validations/platform";

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

    const parsed = await parseBody(req, totpDisableSchema);
    if ("error" in parsed) return parsed.error;
    const { token } = parsed.data;

    // 現在のシークレットをDBから取得
    const { data: user, error: fetchError } = await supabaseAdmin
      .from("admin_users")
      .select("totp_secret, totp_enabled")
      .eq("id", admin.userId)
      .single();

    if (fetchError || !user) {
      return NextResponse.json(
        { ok: false, error: "ユーザー情報の取得に失敗しました" },
        { status: 500 }
      );
    }

    if (!user.totp_enabled || !user.totp_secret) {
      return NextResponse.json(
        { ok: false, error: "2要素認証は設定されていません" },
        { status: 400 }
      );
    }

    // TOTPコードを検証
    const decryptedSecret = decrypt(user.totp_secret);
    const isValid = verifyTOTP(decryptedSecret, token);
    if (!isValid) {
      return NextResponse.json(
        { ok: false, error: "コードが正しくありません" },
        { status: 400 }
      );
    }

    // TOTP設定を削除
    const { error: updateError } = await supabaseAdmin
      .from("admin_users")
      .update({
        totp_secret: null,
        totp_enabled: false,
        totp_backup_codes: null,
      })
      .eq("id", admin.userId);

    if (updateError) {
      console.error("[TOTP Disable] DB update error:", updateError);
      return NextResponse.json(
        { ok: false, error: "設定の更新に失敗しました" },
        { status: 500 }
      );
    }

    // 監査ログ
    logAudit(req, "platform.totp.disabled", "admin_user", admin.userId, {
      email: admin.email,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[TOTP Disable] Error:", err);
    return NextResponse.json(
      { ok: false, error: "サーバーエラー" },
      { status: 500 }
    );
  }
}
