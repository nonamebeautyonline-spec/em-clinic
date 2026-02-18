// lib/admin-auth.ts
// 管理者認証ヘルパー

import { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { validateSession } from "@/lib/session";

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
      // サーバー側セッション存在チェック（admin_sessionsテーブル未作成時はスキップ）
      try {
        const isValid = await validateSession(sessionCookie);
        if (!isValid) return false;
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
