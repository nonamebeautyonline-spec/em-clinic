// middleware.ts
import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // /doctor 配下だけ認証
  if (pathname.startsWith("/doctor")) {
    const basicAuth = req.headers.get("authorization");
    const user = process.env.DR_BASIC_USER;
    const pass = process.env.DR_BASIC_PASS;

    // env未設定なら開発用に素通し
    if (!user || !pass) return NextResponse.next();

    if (basicAuth) {
      const authValue = basicAuth.split(" ")[1];
      const [u, p] = Buffer.from(authValue, "base64").toString().split(":");

      if (u === user && p === pass) {
        return NextResponse.next();
      }
    }

    return new NextResponse("Auth required", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Doctor Console"',
      },
    });
  }

  return NextResponse.next();
}

// /doctor 配下だけ対象
export const config = {
  matcher: ["/doctor/:path*"],
};
