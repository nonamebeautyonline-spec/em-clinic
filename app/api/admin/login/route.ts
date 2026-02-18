// app/api/admin/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SignJWT } from "jose";
import bcrypt from "bcryptjs";
import { resolveTenantId, withTenant } from "@/lib/tenant";
import { checkRateLimit, resetRateLimit, getClientIp } from "@/lib/rate-limit";
import { parseBody } from "@/lib/validations/helpers";
import { adminLoginSchema } from "@/lib/validations/admin-login";
import { logAudit } from "@/lib/audit";
import { createSession } from "@/lib/session";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const JWT_SECRET = process.env.JWT_SECRET || process.env.ADMIN_TOKEN || "fallback-secret";

// セッション有効期限: 24時間
const SESSION_DURATION_SECONDS = 24 * 60 * 60;

export async function POST(req: NextRequest) {
  try {
    // Zodバリデーション
    const parsed = await parseBody(req, adminLoginSchema);
    if (parsed.error) return parsed.error;
    const { email, password, token } = parsed.data;

    // レート制限チェック（メール単位: 5回/30分、IP単位: 15回/10分）
    const ip = getClientIp(req);
    const emailNorm = email.toLowerCase().trim();
    const [emailLimit, ipLimit] = await Promise.all([
      checkRateLimit(`login:email:${emailNorm}`, 5, 1800),
      checkRateLimit(`login:ip:${ip}`, 15, 600),
    ]);
    if (emailLimit.limited) {
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

    const tenantId = resolveTenantId(req);

    // ADMIN_TOKENチェック
    if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
      return NextResponse.json(
        { ok: false, error: "認証に失敗しました" },
        { status: 401 }
      );
    }

    // ユーザー取得（tenant_id も取得）
    const { data: user, error: userError } = await withTenant(
      supabase
        .from("admin_users")
        .select("id, email, name, password_hash, is_active, tenant_id, platform_role")
        .eq("email", email),
      tenantId
    ).single();

    if (userError || !user) {
      return NextResponse.json(
        { ok: false, error: "認証に失敗しました" },
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
        { ok: false, error: "認証に失敗しました" },
        { status: 401 }
      );
    }

    // ログイン成功 → レート制限カウントをリセット + 監査ログ
    await resetRateLimit(`login:email:${emailNorm}`);
    logAudit(req, "admin.login.success", "admin_user", user.id, { email: user.email });

    // JWTトークン生成
    const secret = new TextEncoder().encode(JWT_SECRET);
    const expiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000);

    const jwt = await new SignJWT({
      role: "admin",
      userId: user.id,
      email: user.email,
      name: user.name,
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

    // レスポンス
    const response = NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });

    // httpOnly Cookie設定（24時間有効）
    response.cookies.set({
      name: "admin_session",
      value: jwt,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_DURATION_SECONDS,
    });

    return response;
  } catch (err) {
    console.error("[Admin Login] Error:", err);
    return NextResponse.json(
      { ok: false, error: "サーバーエラー" },
      { status: 500 }
    );
  }
}
