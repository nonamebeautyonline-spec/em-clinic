// app/api/platform/totp/disable/route.ts — TOTP無効化API
// 現在のTOTPコードで確認後、2FA設定を削除
import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
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
      return unauthorized();
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
      return serverError("ユーザー情報の取得に失敗しました");
    }

    if (!user.totp_enabled || !user.totp_secret) {
      return badRequest("2要素認証は設定されていません");
    }

    // TOTPコードを検証
    const decryptedSecret = decrypt(user.totp_secret);
    const isValid = verifyTOTP(decryptedSecret, token);
    if (!isValid) {
      return badRequest("コードが正しくありません");
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
      return serverError("設定の更新に失敗しました");
    }

    // 監査ログ
    logAudit(req, "platform.totp.disabled", "admin_user", admin.userId, {
      email: admin.email,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[TOTP Disable] Error:", err);
    return serverError("サーバーエラー");
  }
}
