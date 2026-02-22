// app/api/platform/impersonate/route.ts
// プラットフォーム管理: テナントインパーソネーション開始

import { NextRequest, NextResponse } from "next/server";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { logAudit } from "@/lib/audit";
import { SignJWT } from "jose";
import { createSession } from "@/lib/session";
import { parseBody } from "@/lib/validations/helpers";
import { impersonateSchema } from "@/lib/validations/platform";

const JWT_SECRET = process.env.JWT_SECRET || process.env.ADMIN_TOKEN || "fallback-secret";
const SESSION_DURATION_SECONDS = 2 * 60 * 60; // インパーソネーションは2時間

export async function POST(req: NextRequest) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin)
    return NextResponse.json(
      { ok: false, error: "権限がありません" },
      { status: 403 },
    );

  try {
    const parsed = await parseBody(req, impersonateSchema);
    if ("error" in parsed) return parsed.error;
    const { tenantId } = parsed.data;

    // テナント情報取得
    const { data: tenant, error: tenantErr } = await supabaseAdmin
      .from("tenants")
      .select("id, name, slug, is_active")
      .eq("id", tenantId)
      .single();

    if (tenantErr || !tenant) {
      return NextResponse.json(
        { ok: false, error: "テナントが見つかりません" },
        { status: 404 },
      );
    }

    if (!tenant.is_active) {
      return NextResponse.json(
        { ok: false, error: "無効化されたテナントにはアクセスできません" },
        { status: 400 },
      );
    }

    // テナントの最初のadmin_userを取得
    const { data: members } = await supabaseAdmin
      .from("tenant_members")
      .select("admin_user_id, admin_users:admin_user_id (id, name, email, username)")
      .eq("tenant_id", tenantId)
      .limit(1);

    const member = members?.[0];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const targetUser = member?.admin_users as any;

    if (!targetUser) {
      return NextResponse.json(
        { ok: false, error: "テナントに管理者が存在しません" },
        { status: 400 },
      );
    }

    // 新しいJWT生成（テナント用 + impersonatedBy情報）
    const secret = new TextEncoder().encode(JWT_SECRET);
    const expiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000);

    const jwt = await new SignJWT({
      role: "admin",
      userId: targetUser.id,
      email: targetUser.email,
      name: targetUser.name,
      username: targetUser.username,
      tenantId: tenantId,
      platformRole: null,
      impersonatedBy: admin.userId,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(expiresAt)
      .sign(secret);

    // サーバー側セッション作成
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") || null;

    createSession({
      adminUserId: targetUser.id,
      tenantId,
      jwt,
      expiresAt,
      ipAddress: ip,
      userAgent: req.headers.get("user-agent"),
    }).catch((err) => console.error("[Impersonate] Session create error:", err));

    // 監査ログ
    logAudit(req, "platform.impersonate.start", "tenant", tenantId, {
      impersonatedBy: admin.userId,
      impersonatedByName: admin.name,
      targetUserId: targetUser.id,
      targetUserName: targetUser.name,
      tenantName: tenant.name,
    });

    // リダイレクトURL
    const redirectUrl = process.env.NODE_ENV === "production"
      ? `https://${tenant.slug}.l-ope.jp/admin`
      : `/admin`;

    // レスポンス作成
    const response = NextResponse.json({
      ok: true,
      redirectUrl,
      tenantName: tenant.name,
    });

    // Cookie設定
    const isProduction = process.env.NODE_ENV === "production";

    // 元のセッションを保存
    const originalSession = req.cookies.get("admin_session")?.value;
    if (originalSession) {
      const originalCookieOpts: {
        name: string;
        value: string;
        httpOnly: boolean;
        secure: boolean;
        sameSite: "lax";
        path: string;
        maxAge: number;
        domain?: string;
      } = {
        name: "platform_original_session",
        value: originalSession,
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        path: "/",
        maxAge: SESSION_DURATION_SECONDS,
      };
      if (isProduction) originalCookieOpts.domain = ".l-ope.jp";
      response.cookies.set(originalCookieOpts);
    }

    // 新しいセッションCookieを設定
    const sessionCookieOpts: {
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
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_DURATION_SECONDS,
    };
    if (isProduction) sessionCookieOpts.domain = ".l-ope.jp";
    response.cookies.set(sessionCookieOpts);

    return response;
  } catch (err) {
    console.error("[Impersonate] Error:", err);
    return NextResponse.json(
      { ok: false, error: "インパーソネーション開始に失敗しました" },
      { status: 500 },
    );
  }
}
