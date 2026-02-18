// middleware.ts — proxy.ts統合 + CSRF検証（Double Submit Cookie パターン）
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
const RESERVED_SLUGS = new Set(["app", "admin", "www", "localhost", "127", "l-ope"]);

// CSRF検証を除外するパス
const CSRF_EXEMPT_PREFIXES = [
  "/api/line/webhook",
  "/api/square/webhook",
  "/api/gmo/webhook",
  "/api/cron/",
  "/api/health",
  "/api/admin/login",
  "/api/admin/logout",
  "/api/line/login",
  "/api/line/callback",
  "/api/verify/",
  "/api/csrf-token",
  "/api/doctor/",
];

// フォーム送信（外部ユーザーがアクセス）も除外
const CSRF_EXEMPT_PATTERNS = [
  /^\/api\/forms\/[^/]+\/submit$/,
  /^\/api\/forms\/[^/]+\/upload$/,
  /^\/api\/bank-transfer\//,
  /^\/api\/intake$/,
  /^\/api\/checkout$/,
  /^\/api\/reorder\//,
  /^\/api\/reservations$/,
  /^\/api\/mypage/,
  /^\/api\/profile$/,
  /^\/api\/register\//,
  /^\/api\/repair$/,
];

function isCsrfExempt(pathname: string): boolean {
  if (CSRF_EXEMPT_PREFIXES.some((p) => pathname.startsWith(p))) return true;
  if (CSRF_EXEMPT_PATTERNS.some((p) => p.test(pathname))) return true;
  return false;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const host = req.headers.get("host") || "";

  // === 旧ドメインからの移行（LP rewriteより先に判定） ===
  if (host.includes("noname-beauty.jp")) {
    const newUrl = new URL(req.url);
    newUrl.host = "noname-beauty.l-ope.jp";
    // API（webhook等）は rewrite（外部サービスは301を追わないため）
    if (pathname.startsWith("/api/")) {
      return NextResponse.rewrite(newUrl);
    }
    // ブラウザアクセスは 301 リダイレクト
    return NextResponse.redirect(newUrl, 301);
  }

  // === /doctor 配下のBasic認証 ===
  if (pathname.startsWith("/doctor")) {
    const basicAuth = req.headers.get("authorization");
    const user = process.env.DR_BASIC_USER;
    const pass = process.env.DR_BASIC_PASS;

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

  // === CSRF検証（POST/PUT/PATCH/DELETE） ===
  const method = req.method;
  if (
    ["POST", "PUT", "PATCH", "DELETE"].includes(method) &&
    pathname.startsWith("/api/") &&
    !isCsrfExempt(pathname)
  ) {
    const csrfHeader = req.headers.get("x-csrf-token");
    const csrfCookie = req.cookies.get("csrf_token")?.value;

    if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) {
      return NextResponse.json(
        { ok: false, error: "CSRF token mismatch" },
        { status: 403 },
      );
    }
  }

  // === テナントID解決 ===
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
    const slug = host.split(".")[0].split(":")[0];
    if (slug && !RESERVED_SLUGS.has(slug) && host.includes(".")) {
      try {
        tenantId = await resolveSlugToTenantId(slug);
      } catch (e) {
        console.error("[middleware] subdomain resolve error:", e);
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
  matcher: ["/", "/api/:path*", "/admin/:path*", "/doctor/:path*"],
};
