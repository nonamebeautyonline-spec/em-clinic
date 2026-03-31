// app/api/admin/session/route.ts
// セッション検証API
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { createClient } from "@supabase/supabase-js";
import { isFullAccessRole } from "@/lib/menu-permissions";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET || process.env.ADMIN_TOKEN;
  if (!secret) throw new Error("JWT_SECRET or ADMIN_TOKEN environment variable is required");
  return secret;
}

export async function GET(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get("admin_session")?.value;

    if (!sessionCookie) {
      return NextResponse.json({ ok: false, error: "no_session" }, { status: 401 });
    }

    // JWT検証
    const secret = new TextEncoder().encode(getJwtSecret());
    const { payload } = await jwtVerify(sessionCookie, secret);

    const tenantRole = ((payload as Record<string, unknown>).tenantRole as string) || "admin";

    // メニュー権限を取得
    let allowedMenuKeys: string[] | null = null;
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    if (!isFullAccessRole(tenantRole)) {
      try {
        const { data: permissions } = await supabase
          .from("role_menu_permissions")
          .select("menu_key")
          .eq("role", tenantRole);
        allowedMenuKeys = (permissions || []).map((p: { menu_key: string }) => p.menu_key);
      } catch (e) {
        console.error("[Session] menu permissions fetch error:", e);
        allowedMenuKeys = [];
      }
    }

    // テナントのindustryを取得
    const tenantId = (payload as Record<string, unknown>).tenantId as string | null;
    let industry: string = "clinic";
    if (tenantId) {
      try {
        const { data: tenantData } = await supabase
          .from("tenants")
          .select("industry")
          .eq("id", tenantId)
          .maybeSingle();
        industry = tenantData?.industry || "clinic";
      } catch {
        // テナント情報取得失敗 → デフォルトclinic
      }
    }

    return NextResponse.json({
      ok: true,
      user: {
        userId: payload.userId,
        email: payload.email,
        name: payload.name,
        role: payload.role,
        tenantId: tenantId || null,
        platformRole: (payload as Record<string, unknown>).platformRole || "tenant_admin",
        tenantRole,
        allowedMenuKeys,
        industry,
      },
      expiresAt: payload.exp ? new Date(payload.exp * 1000).toISOString() : null,
    });
  } catch (err) {
    // JWT無効または期限切れ
    return NextResponse.json({ ok: false, error: "invalid_session" }, { status: 401 });
  }
}
