// app/api/platform/totp/verify/route.ts — TOTPコード検証・有効化API
// setup で生成したシークレットで実際にコードが一致するか確認し、DBに保存
import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { verifyTOTP } from "@/lib/totp";
import { encrypt } from "@/lib/crypto";
import { supabaseAdmin } from "@/lib/supabase";
import { logAudit } from "@/lib/audit";
import { parseBody } from "@/lib/validations/helpers";
import { totpVerifySchema } from "@/lib/validations/platform";

export async function POST(req: NextRequest) {
  try {
    // プラットフォーム管理者認証
    const admin = await verifyPlatformAdmin(req);
    if (!admin) {
      return unauthorized();
    }

    const parsed = await parseBody(req, totpVerifySchema);
    if ("error" in parsed) return parsed.error;
    const { secret, token, backupCodes } = parsed.data;

    // TOTPコードを検証
    const isValid = verifyTOTP(secret, token);
    if (!isValid) {
      return badRequest("コードが正しくありません。もう一度お試しください。");
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
      return serverError("設定の保存に失敗しました");
    }

    // 監査ログ
    logAudit(req, "platform.totp.enabled", "admin_user", admin.userId, {
      email: admin.email,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[TOTP Verify] Error:", err);
    return serverError("サーバーエラー");
  }
}
