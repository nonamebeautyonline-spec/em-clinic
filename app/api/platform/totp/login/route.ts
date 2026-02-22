// app/api/platform/totp/login/route.ts — TOTPログイン検証API
// ログイン時に2FAが有効な場合、pendingTotpToken + TOTPコードで最終認証
// 認証不要（pendingTotpTokenで検証）
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SignJWT } from "jose";
import { verifyTOTP } from "@/lib/totp";
import { decrypt } from "@/lib/crypto";
import { logAudit } from "@/lib/audit";
import { createSession } from "@/lib/session";
import { getClientIp } from "@/lib/rate-limit";
import { redis } from "@/lib/redis";
import { parseBody } from "@/lib/validations/helpers";
import { totpLoginSchema } from "@/lib/validations/platform";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const JWT_SECRET = process.env.JWT_SECRET || process.env.ADMIN_TOKEN || "fallback-secret";

// セッション有効期限: 24時間
const SESSION_DURATION_SECONDS = 24 * 60 * 60;

export async function POST(req: NextRequest) {
  try {
    const parsed = await parseBody(req, totpLoginSchema);
    if ("error" in parsed) return parsed.error;
    const { pendingTotpToken, token } = parsed.data;

    // Redisから仮トークンに紐づくuserIdを取得
    let userId: string | null = null;
    try {
      userId = await redis.get<string>(`totp-pending:${pendingTotpToken}`);
    } catch (redisErr) {
      console.error("[TOTP Login] Redis error:", redisErr);
      return NextResponse.json(
        { ok: false, error: "サーバーエラー" },
        { status: 500 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { ok: false, error: "認証セッションが期限切れです。再度ログインしてください。" },
        { status: 401 }
      );
    }

    // ユーザー情報を取得
    const { data: user, error: userError } = await supabase
      .from("admin_users")
      .select("id, email, name, username, tenant_id, platform_role, totp_secret, totp_enabled, totp_backup_codes, is_active")
      .eq("id", userId)
      .eq("platform_role", "platform_admin")
      .eq("is_active", true)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { ok: false, error: "ユーザーが見つかりません" },
        { status: 401 }
      );
    }

    if (!user.totp_enabled || !user.totp_secret) {
      return NextResponse.json(
        { ok: false, error: "2要素認証が設定されていません" },
        { status: 400 }
      );
    }

    // TOTPコードを検証
    const decryptedSecret = decrypt(user.totp_secret);
    let isValid = verifyTOTP(decryptedSecret, token);

    // TOTP不一致の場合、バックアップコードをチェック
    if (!isValid && user.totp_backup_codes && Array.isArray(user.totp_backup_codes)) {
      const backupIndex = user.totp_backup_codes.indexOf(token);
      if (backupIndex !== -1) {
        isValid = true;
        // 使用済みバックアップコードを削除
        const updatedCodes = [...user.totp_backup_codes];
        updatedCodes.splice(backupIndex, 1);
        await supabase
          .from("admin_users")
          .update({ totp_backup_codes: updatedCodes })
          .eq("id", user.id);
      }
    }

    if (!isValid) {
      return NextResponse.json(
        { ok: false, error: "認証コードが正しくありません" },
        { status: 401 }
      );
    }

    // Redis から仮トークンを削除
    try {
      await redis.del(`totp-pending:${pendingTotpToken}`);
    } catch {
      // 削除失敗はTTLで自動削除されるため無視
    }

    // 監査ログ
    logAudit(req, "platform.login.totp_verified", "admin_user", user.id, {
      username: user.username,
    });

    // JWTトークン生成（既存のログインAPIと同じ処理）
    const ip = getClientIp(req);
    const secret = new TextEncoder().encode(JWT_SECRET);
    const expiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000);

    const jwt = await new SignJWT({
      role: "admin",
      userId: user.id,
      email: user.email,
      name: user.name,
      username: user.username,
      tenantId: null,
      platformRole: "platform_admin",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(expiresAt)
      .sign(secret);

    // サーバー側セッション作成
    createSession({
      adminUserId: user.id,
      tenantId: null,
      jwt,
      expiresAt,
      ipAddress: ip,
      userAgent: req.headers.get("user-agent"),
    }).catch((err) => console.error("[TOTP Login] Session create error:", err));

    // レスポンス
    const response = NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
      },
    });

    // httpOnly Cookie設定（24時間有効）
    const cookieOptions: {
      name: string;
      value: string;
      httpOnly: boolean;
      secure: boolean;
      sameSite: "lax";
      path: string;
      maxAge: number;
      domain?: string;
    } = {
      name: "admin_session",
      value: jwt,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_DURATION_SECONDS,
    };

    // 本番環境では .l-ope.jp ドメインでCookieを発行
    if (process.env.NODE_ENV === "production") {
      cookieOptions.domain = ".l-ope.jp";
    }

    response.cookies.set(cookieOptions);

    return response;
  } catch (err) {
    console.error("[TOTP Login] Error:", err);
    return NextResponse.json(
      { ok: false, error: "サーバーエラー" },
      { status: 500 }
    );
  }
}
