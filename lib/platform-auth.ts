// lib/platform-auth.ts
// プラットフォーム管理者認証ヘルパー

import { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { validateSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";

const JWT_SECRET = process.env.JWT_SECRET || process.env.ADMIN_TOKEN;

export interface PlatformAdminPayload {
  userId: string;
  email: string;
  name: string;
  tenantId: string | null;
  platformRole: string;
}

/**
 * プラットフォーム管理者認証（JWT + DB二重チェック）
 * platform_role = 'platform_admin' のユーザーのみ許可
 */
export async function verifyPlatformAdmin(
  request: NextRequest
): Promise<PlatformAdminPayload | null> {
  if (!JWT_SECRET) return null;

  const sessionCookie = request.cookies.get("admin_session")?.value;
  if (!sessionCookie) return null;

  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(sessionCookie, secret);
    const p = payload as Record<string, unknown>;

    // JWTのplatformRoleチェック
    if (p.platformRole !== "platform_admin") return null;

    // サーバー側セッション検証
    try {
      const isValid = await validateSession(sessionCookie);
      if (!isValid) return null;
    } catch {
      // admin_sessionsテーブル未作成時はスキップ
    }

    // DB側でも権限を再確認（JWT改ざん防止）
    const { data: user } = await supabaseAdmin
      .from("admin_users")
      .select("id, platform_role")
      .eq("id", p.userId as string)
      .eq("platform_role", "platform_admin")
      .eq("is_active", true)
      .single();

    if (!user) return null;

    return {
      userId: p.userId as string,
      email: p.email as string,
      name: p.name as string,
      tenantId: (p.tenantId as string) || null,
      platformRole: "platform_admin",
    };
  } catch {
    return null;
  }
}
