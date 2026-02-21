// app/api/platform/impersonate/exit/route.ts
// プラットフォーム管理: インパーソネーション終了

import { NextRequest, NextResponse } from "next/server";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { logAudit } from "@/lib/audit";
import { jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET || process.env.ADMIN_TOKEN || "fallback-secret";

export async function POST(req: NextRequest) {
  // プラットフォーム管理者認証（元のセッションCookieから検証）
  // 注: インパーソネーション中は admin_session がテナント管理者のものになっているため、
  // platform_original_session の存在をもって認可する（下記で別途JWT検証）
  const admin = await verifyPlatformAdmin(req);
  // admin が null でも platform_original_session があれば許可（インパーソネーション中のため）

  try {
    // 元のセッションCookieの存在チェック
    const originalSession = req.cookies.get("platform_original_session")?.value;
    if (!originalSession) {
      return NextResponse.json(
        { ok: false, error: "元のセッションが見つかりません" },
        { status: 400 },
      );
    }

    // 元のセッションを検証（platform_adminであることを確認）
    let originalUserId: string | null = null;
    try {
      const secret = new TextEncoder().encode(JWT_SECRET);
      const { payload } = await jwtVerify(originalSession, secret);
      const p = payload as Record<string, unknown>;
      if (p.platformRole !== "platform_admin") {
        return NextResponse.json(
          { ok: false, error: "元のセッションがプラットフォーム管理者ではありません" },
          { status: 403 },
        );
      }
      originalUserId = p.userId as string;
    } catch {
      return NextResponse.json(
        { ok: false, error: "元のセッションの検証に失敗しました" },
        { status: 401 },
      );
    }

    // 現在のインパーソネーション情報を取得（監査ログ用）
    const currentSession = req.cookies.get("admin_session")?.value;
    let impersonatedTenantId: string | null = null;
    if (currentSession) {
      try {
        const secret = new TextEncoder().encode(JWT_SECRET);
        const { payload } = await jwtVerify(currentSession, secret);
        const p = payload as Record<string, unknown>;
        impersonatedTenantId = (p.tenantId as string) || null;
      } catch {
        // 現在のセッション無効でも元のセッションに戻す
      }
    }

    // 監査ログ
    logAudit(req, "platform.impersonate.end", "admin_user", originalUserId || "unknown", {
      impersonatedTenantId,
    });

    // リダイレクトURL
    const redirectUrl = process.env.NODE_ENV === "production"
      ? "https://admin.l-ope.jp/platform"
      : "/platform";

    // レスポンス作成
    const response = NextResponse.json({ ok: true, redirectUrl });

    const isProduction = process.env.NODE_ENV === "production";

    // 元のセッションCookieを admin_session に復元
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
      value: originalSession,
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: 24 * 60 * 60, // 元の有効期限は不明なので24時間に設定
    };
    if (isProduction) sessionCookieOpts.domain = ".l-ope.jp";
    response.cookies.set(sessionCookieOpts);

    // platform_original_session を削除
    const deleteCookieOpts: {
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
      value: "",
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    };
    if (isProduction) deleteCookieOpts.domain = ".l-ope.jp";
    response.cookies.set(deleteCookieOpts);

    return response;
  } catch (err) {
    console.error("[Impersonate Exit] Error:", err);
    return NextResponse.json(
      { ok: false, error: "インパーソネーション終了に失敗しました" },
      { status: 500 },
    );
  }
}
