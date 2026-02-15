// proxy.ts — Basic認証 + JWTテナント解決 + サブドメイン解決
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { createClient } from "@supabase/supabase-js";

const JWT_SECRET = process.env.JWT_SECRET || process.env.ADMIN_TOKEN || "fallback-secret";

// テナント slug → id のキャッシュ（プロセス内メモリ、5分TTL）
const slugCache = new Map<string, { id: string; expires: number }>();
const CACHE_TTL = 5 * 60 * 1000;

async function resolveSlugToTenantId(slug: string): Promise<string | null> {
  const cached = slugCache.get(slug);
  if (cached && cached.expires > Date.now()) return cached.id;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  const sb = createClient(url, key);
  const { data } = await sb
    .from("tenants")
    .select("id")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (data?.id) {
    slugCache.set(slug, { id: data.id, expires: Date.now() + CACHE_TTL });
    return data.id;
  }
  return null;
}

// サブドメインとして無視するホスト名プレフィックス
const RESERVED_SLUGS = new Set(["app", "admin", "www", "localhost", "127"]);

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

  let tenantId: string | null = null;

  // 1. admin_session Cookie から tenantId を抽出
  const sessionCookie = req.cookies.get("admin_session")?.value;
  if (sessionCookie) {
    try {
      const secret = new TextEncoder().encode(JWT_SECRET);
      const { payload } = await jwtVerify(sessionCookie, secret);
      tenantId = (payload as { tenantId?: string | null }).tenantId || null;
    } catch {
      // JWT 無効 — tenantId なしで続行
    }
  }

  // 2. JWTにテナントIDがなければサブドメインから解決
  if (!tenantId) {
    const host = req.headers.get("host") || "";
    const slug = host.split(".")[0].split(":")[0]; // ポート番号を除去
    if (slug && !RESERVED_SLUGS.has(slug) && host.includes(".")) {
      try {
        tenantId = await resolveSlugToTenantId(slug);
      } catch (e) {
        console.error("[proxy] subdomain resolve error:", e);
      }
    }
  }

  // テナントIDが解決できた場合はヘッダーに設定
  if (tenantId) {
    const headers = new Headers(req.headers);
    headers.set("x-tenant-id", tenantId);
    return NextResponse.next({ request: { headers } });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*", "/admin/:path*", "/doctor/:path*"],
};
