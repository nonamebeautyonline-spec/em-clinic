// proxy.ts — Basic認証 + JWTテナント解決
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET || process.env.ADMIN_TOKEN || "fallback-secret";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // /doctor 配下のBasic認証
  if (pathname.startsWith("/doctor")) {
    const basicAuth = req.headers.get("authorization");
    const user = process.env.DR_BASIC_USER;
    const pass = process.env.DR_BASIC_PASS;

    // env未設定なら開発用に素通し
    if (user && pass) {
      if (basicAuth) {
        const authValue = basicAuth.split(" ")[1];
        const [u, p] = Buffer.from(authValue, "base64").toString().split(":");
        if (u !== user || p !== pass) {
          return new NextResponse("Auth required", {
            status: 401,
            headers: { "WWW-Authenticate": 'Basic realm="Doctor Console"' },
          });
        }
      } else {
        return new NextResponse("Auth required", {
          status: 401,
          headers: { "WWW-Authenticate": 'Basic realm="Doctor Console"' },
        });
      }
    }
  }

  // admin_session Cookie から tenantId を抽出してヘッダーに設定
  const sessionCookie = req.cookies.get("admin_session")?.value;
  if (sessionCookie) {
    try {
      const secret = new TextEncoder().encode(JWT_SECRET);
      const { payload } = await jwtVerify(sessionCookie, secret);
      const tenantId = (payload as { tenantId?: string | null }).tenantId;
      if (tenantId) {
        const headers = new Headers(req.headers);
        headers.set("x-tenant-id", tenantId);
        return NextResponse.next({ request: { headers } });
      }
    } catch {
      // JWT 無効 — tenantId なしで続行
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*", "/admin/:path*", "/doctor/:path*"],
};
