// app/api/admin/login/route.ts — ユーザーID + パスワード認証
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SignJWT } from "jose";
import bcrypt from "bcryptjs";
import { resolveTenantId } from "@/lib/tenant";
import { checkRateLimit, resetRateLimit, getClientIp } from "@/lib/rate-limit";
import { parseBody } from "@/lib/validations/helpers";
import { adminLoginSchema } from "@/lib/validations/admin-login";
import { logAudit } from "@/lib/audit";
import { createSession } from "@/lib/session";
import { sendLoginAlertIfNewIp } from "@/lib/notifications/login-alert";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const JWT_SECRET = process.env.JWT_SECRET || process.env.ADMIN_TOKEN || "fallback-secret";

// セッション有効期限: 24時間
const SESSION_DURATION_SECONDS = 24 * 60 * 60;

export async function POST(req: NextRequest) {
  try {
    // Zodバリデーション
    const parsed = await parseBody(req, adminLoginSchema);
    if (parsed.error) return parsed.error;
    const { username, password } = parsed.data;

    // レート制限チェック（ユーザーID単位: 5回/30分、IP単位: 15回/10分）
    const ip = getClientIp(req);
    const usernameNorm = username.toUpperCase().trim();
    const [userLimit, ipLimit] = await Promise.all([
      checkRateLimit(`login:user:${usernameNorm}`, 5, 1800),
      checkRateLimit(`login:ip:${ip}`, 15, 600),
    ]);
    if (userLimit.limited) {
      return NextResponse.json(
        { ok: false, error: "ログイン試行回数が上限に達しました。しばらくお待ちください。" },
        { status: 429 }
      );
    }
    if (ipLimit.limited) {
      return NextResponse.json(
        { ok: false, error: "このIPからのログイン試行が制限されています。しばらくお待ちください。" },
        { status: 429 }
      );
    }

    // ユーザー取得（usernameはグローバルに一意なのでテナント不要）
    const { data: user, error: userError } = await supabase
      .from("admin_users")
      .select("id, email, name, username, password_hash, is_active, tenant_id, platform_role")
      .eq("username", usernameNorm)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { ok: false, error: "ユーザーIDまたはパスワードが正しくありません" },
        { status: 401 }
      );
    }

    // アクティブチェック
    if (!user.is_active) {
      return NextResponse.json(
        { ok: false, error: "このアカウントは無効化されています" },
        { status: 401 }
      );
    }

    // パスワード検証
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return NextResponse.json(
        { ok: false, error: "ユーザーIDまたはパスワードが正しくありません" },
        { status: 401 }
      );
    }

    // ログイン成功 → レート制限カウントをリセット + 監査ログ + ログインアラート
    await resetRateLimit(`login:user:${usernameNorm}`);
    logAudit(req, "admin.login.success", "admin_user", user.id, { username: user.username });

    // 新しいIPからのログイン時にメール通知（fire-and-forget）
    sendLoginAlertIfNewIp({
      adminUserId: user.id,
      email: user.email,
      name: user.name,
      ipAddress: ip,
      userAgent: req.headers.get("user-agent"),
    }).catch((err) => console.error("[login-alert] Error:", err));

    // JWTトークン生成
    const secret = new TextEncoder().encode(JWT_SECRET);
    const expiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000);

    const jwt = await new SignJWT({
      role: "admin",
      userId: user.id,
      email: user.email,
      name: user.name,
      username: user.username,
      tenantId: user.tenant_id || null,
      platformRole: user.platform_role || "tenant_admin",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(expiresAt)
      .sign(secret);

    // サーバー側セッション作成（同時セッション制限: 最大3）
    createSession({
      adminUserId: user.id,
      tenantId: user.tenant_id || null,
      jwt,
      expiresAt,
      ipAddress: ip,
      userAgent: req.headers.get("user-agent"),
    }).catch((err) => console.error("[Admin Login] Session create error:", err));

    // 共有URL（テナントコンテキストなし）からのログインの場合、テナントのサブドメインURLを返す
    const requestTenantId = resolveTenantId(req);
    let redirectUrl: string | null = null;

    if (!requestTenantId && user.tenant_id) {
      // テナントのslugを取得してリダイレクトURL生成
      const { data: tenant } = await supabase
        .from("tenants")
        .select("slug")
        .eq("id", user.tenant_id)
        .maybeSingle();

      if (tenant?.slug) {
        redirectUrl = `https://${tenant.slug}.l-ope.jp/admin`;
      }
    }

    // レスポンス
    const response = NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
      },
      redirectUrl,
    });

    // httpOnly Cookie設定（24時間有効）
    // 共有URLの場合はドメインを .l-ope.jp にしてサブドメインでも有効にする
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

    // 本番環境では .l-ope.jp ドメインでCookieを発行（サブドメイン間で共有）
    if (process.env.NODE_ENV === "production") {
      cookieOptions.domain = ".l-ope.jp";
    }

    response.cookies.set(cookieOptions);

    return response;
  } catch (err) {
    console.error("[Admin Login] Error:", err);
    return NextResponse.json(
      { ok: false, error: "サーバーエラー" },
      { status: 500 }
    );
  }
}
