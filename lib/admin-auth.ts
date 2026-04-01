// lib/admin-auth.ts
// 管理者認証ヘルパー

import { NextRequest } from "next/server";
import { jwtVerify, type JWTPayload } from "jose";
import { validateSession, hashToken } from "@/lib/session";
import { getSessionCache, setSessionCache } from "@/lib/redis";
import crypto from "crypto";

const JWT_SECRET = process.env.JWT_SECRET || process.env.ADMIN_TOKEN;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET または ADMIN_TOKEN 環境変数が未設定です");
}

/**
 * 管理者認証チェック（クッキーまたはBearerトークン）
 * @param request NextRequest
 * @returns 認証成功時 true
 */
export async function verifyAdminAuth(request: NextRequest): Promise<boolean> {
  // 1. クッキーベースのセッション認証（JWT + サーバー側セッション検証）
  const sessionCookie = request.cookies.get("admin_session")?.value;
  if (sessionCookie) {
    try {
      const secret = new TextEncoder().encode(JWT_SECRET);
      await jwtVerify(sessionCookie, secret);
      // Redisキャッシュでセッション検証を高速化
      const tokenH = hashToken(sessionCookie);
      const cached = await getSessionCache(tokenH);
      if (cached === true) return true;
      // cached === false でも DB再検証する（Redisのstale false防止）
      // キャッシュミスまたは false: DB検証してキャッシュに保存
      try {
        const isValid = await validateSession(sessionCookie);
        setSessionCache(tokenH, isValid).catch(() => {});
        if (!isValid) {
          // DBにセッションがなくてもJWT自体は有効なので認証成功
          // （MAX_SESSIONS超過で古いセッションが削除されたケースをカバー）
          return true;
        }
      } catch {
        // admin_sessionsテーブル未作成時はJWT検証のみで認証成功
      }
      return true;
    } catch {
      // クッキー無効、次の方式を試す
    }
  }

  // 2. Bearerトークン認証（後方互換性）
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    if (token === process.env.ADMIN_TOKEN) {
      return true;
    }
  }

  // 3. Basic認証（Dr用）— タイミングセーフ比較
  if (authHeader?.startsWith("Basic ")) {
    const drUser = process.env.DR_BASIC_USER;
    const drPass = process.env.DR_BASIC_PASS;
    if (drUser && drPass) {
      const decoded = Buffer.from(authHeader.substring(6), "base64").toString();
      const colonIdx = decoded.indexOf(":");
      if (colonIdx > 0) {
        const u = decoded.slice(0, colonIdx);
        const p = decoded.slice(colonIdx + 1);
        const userMatch = u.length === drUser.length &&
          crypto.timingSafeEqual(Buffer.from(u), Buffer.from(drUser));
        const passMatch = p.length === drPass.length &&
          crypto.timingSafeEqual(Buffer.from(p), Buffer.from(drPass));
        if (userMatch && passMatch) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * リクエストからトークンを取得（後方互換性用）
 * クッキーがある場合はADMIN_TOKENを返す（API内部呼び出し用）
 */
/**
 * JWTからadmin userId（UUID）を取得
 */
export async function getAdminUserId(request: NextRequest): Promise<string | null> {
  const sessionCookie = request.cookies.get("admin_session")?.value;
  if (sessionCookie) {
    try {
      const secret = new TextEncoder().encode(JWT_SECRET);
      const { payload } = await jwtVerify(sessionCookie, secret);
      return (payload as { userId?: string }).userId || null;
    } catch {
      // クッキー無効
    }
  }
  return null;
}

/**
 * JWTからtenantIdを取得
 */
export async function getAdminTenantId(request: NextRequest): Promise<string | null> {
  const sessionCookie = request.cookies.get("admin_session")?.value;
  if (sessionCookie) {
    try {
      const secret = new TextEncoder().encode(JWT_SECRET);
      const { payload } = await jwtVerify(sessionCookie, secret);
      return (payload as { tenantId?: string | null }).tenantId || null;
    } catch {
      // クッキー無効
    }
  }
  return null;
}

/**
 * JWTからplatformRoleを取得
 */
export async function getAdminPlatformRole(request: NextRequest): Promise<string> {
  const sessionCookie = request.cookies.get("admin_session")?.value;
  if (sessionCookie) {
    try {
      const secret = new TextEncoder().encode(JWT_SECRET);
      const { payload } = await jwtVerify(sessionCookie, secret);
      return (payload as { platformRole?: string }).platformRole || "tenant_admin";
    } catch {
      // クッキー無効
    }
  }
  return "tenant_admin";
}

/**
 * JWTからtenantRole（テナント内ロール）を取得
 */
export async function getAdminTenantRole(request: NextRequest): Promise<string> {
  const sessionCookie = request.cookies.get("admin_session")?.value;
  if (sessionCookie) {
    try {
      const secret = new TextEncoder().encode(JWT_SECRET);
      const { payload } = await jwtVerify(sessionCookie, secret);
      return (payload as { tenantRole?: string }).tenantRole || "admin";
    } catch {
      // クッキー無効
    }
  }
  return "admin";
}

/**
 * JWTから許可メニューキー一覧を取得
 * null = 全権限（owner/admin）
 */
export async function getAllowedMenuKeys(request: NextRequest): Promise<string[] | null> {
  const sessionCookie = request.cookies.get("admin_session")?.value;
  if (sessionCookie) {
    try {
      const secret = new TextEncoder().encode(JWT_SECRET);
      const { payload } = await jwtVerify(sessionCookie, secret);
      const keys = (payload as { allowedMenuKeys?: string[] | null }).allowedMenuKeys;
      return keys ?? null;
    } catch {
      // クッキー無効
    }
  }
  return null;
}

/**
 * Server Component用: cookiesからJWTペイロードを取得
 * cookies()の結果を受け取る（Server Component側で await cookies() して渡す）
 */
export async function getAdminPayloadFromCookies(
  cookieValue: string | undefined,
): Promise<(JWTPayload & { userId?: string; tenantId?: string | null }) | null> {
  if (!cookieValue) return null;
  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(cookieValue, secret);
    return payload as JWTPayload & { userId?: string; tenantId?: string | null };
  } catch {
    return null;
  }
}

export async function getAdminToken(request: NextRequest): Promise<string | null> {
  // クッキーベースの認証が成功した場合、ADMIN_TOKENを返す
  const sessionCookie = request.cookies.get("admin_session")?.value;
  if (sessionCookie) {
    try {
      const secret = new TextEncoder().encode(JWT_SECRET);
      await jwtVerify(sessionCookie, secret);
      return process.env.ADMIN_TOKEN || null;
    } catch {
      // クッキー無効
    }
  }

  // Bearerトークンから取得
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    if (token === process.env.ADMIN_TOKEN) {
      return token;
    }
  }

  return null;
}
