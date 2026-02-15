// lib/admin-auth.ts
// 管理者認証ヘルパー

import { NextRequest } from "next/server";
import { jwtVerify } from "jose";

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
  // 1. クッキーベースのセッション認証（新方式）
  const sessionCookie = request.cookies.get("admin_session")?.value;
  if (sessionCookie) {
    try {
      const secret = new TextEncoder().encode(JWT_SECRET);
      await jwtVerify(sessionCookie, secret);
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
