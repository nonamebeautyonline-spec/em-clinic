// lib/audit.ts — 監査ログヘルパー
import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { jwtVerify } from "jose";
import { resolveTenantId } from "@/lib/tenant";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const JWT_SECRET = process.env.JWT_SECRET || process.env.ADMIN_TOKEN;

/**
 * 監査ログを記録（fire-and-forget、エラーでも業務処理を止めない）
 */
export async function logAudit(
  req: NextRequest,
  action: string,
  resourceType: string,
  resourceId: string,
  details?: Record<string, unknown>,
): Promise<void> {
  try {
    // JWTから管理者情報を取得
    let adminUserId: string | null = null;
    let adminName: string | null = null;
    const sessionCookie = req.cookies.get("admin_session")?.value;
    if (sessionCookie && JWT_SECRET) {
      try {
        const secret = new TextEncoder().encode(JWT_SECRET);
        const { payload } = await jwtVerify(sessionCookie, secret);
        adminUserId = (payload as { userId?: string }).userId || null;
        adminName = (payload as { name?: string }).name || null;
      } catch {
        // JWT無効でもログは記録する
      }
    }

    const tenantId = resolveTenantId(req);
    const ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      null;
    const userAgent = req.headers.get("user-agent") || null;

    await supabase.from("audit_logs").insert({
      tenant_id: tenantId,
      admin_user_id: adminUserId,
      admin_name: adminName,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      details: details || null,
      ip_address: ipAddress,
      user_agent: userAgent,
    });
  } catch (err) {
    // 監査ログ記録失敗でも業務処理は止めない
    console.error("[audit] Failed to log:", err);
  }
}
