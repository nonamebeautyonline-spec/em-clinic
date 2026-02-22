// app/api/admin/session/route.ts
// セッション検証API
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET || process.env.ADMIN_TOKEN || "fallback-secret";

export async function GET(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get("admin_session")?.value;

    if (!sessionCookie) {
      return NextResponse.json({ ok: false, error: "no_session" }, { status: 401 });
    }

    // JWT検証
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(sessionCookie, secret);

    return NextResponse.json({
      ok: true,
      user: {
        userId: payload.userId,
        email: payload.email,
        name: payload.name,
        role: payload.role,
        tenantId: (payload as any).tenantId || null,
        platformRole: (payload as any).platformRole || "tenant_admin",
        tenantRole: (payload as any).tenantRole || "admin",
      },
      expiresAt: payload.exp ? new Date(payload.exp * 1000).toISOString() : null,
    });
  } catch (err) {
    // JWT無効または期限切れ
    return NextResponse.json({ ok: false, error: "invalid_session" }, { status: 401 });
  }
}
