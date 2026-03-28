// middleware.ts — proxy.ts統合 + CSRF検証（Double Submit Cookie パターン）+ 権限チェック
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify, SignJWT } from "jose";
import { createClient } from "@supabase/supabase-js";
import { getRequiredPermission, hasPermission } from "@/lib/permissions";
import { resolveMenuKeyFromPath } from "@/lib/menu-permissions";

const JWT_SECRET = process.env.JWT_SECRET || process.env.ADMIN_TOKEN;
if (!JWT_SECRET) {
  console.error("[middleware] JWT_SECRET and ADMIN_TOKEN are both missing");
}

// テナント slug → id のキャッシュ（プロセス内メモリ、1分TTL）
const slugCache = new Map<string, { id: string; expires: number }>();
const CACHE_TTL = 1 * 60 * 1000;

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
const RESERVED_SLUGS = new Set(["app", "admin", "www", "localhost", "127", "l-ope", "ordix"]);

// CSRF検証を除外するパス
const CSRF_EXEMPT_PREFIXES = [
  "/api/line/webhook",
  "/api/square/webhook",
  "/api/gmo/webhook",
  "/api/cron/",
  "/api/health",
  "/api/admin/login",
  "/api/admin/logout",
  "/api/platform/login",
  "/api/platform/totp/",
  "/api/platform/password-reset/",
  "/api/line/login",
  "/api/line/callback",
  "/api/verify/",
  "/api/csrf-token",
  "/api/doctor/",
  "/api/apply",
  "/api/inquiries",
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
  /^\/api\/ai-reply\//,
  /^\/api\/square\/pay$/,
];

function isCsrfExempt(pathname: string): boolean {
  if (CSRF_EXEMPT_PREFIXES.some((p) => pathname.startsWith(p))) return true;
  if (CSRF_EXEMPT_PATTERNS.some((p) => p.test(pathname))) return true;
  return false;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const host = req.headers.get("host") || "";

  // === ordix.co.jp → /corporate リライト ===
  const hostWithoutPort = host.replace(/:\d+$/, "");
  const isOrdix = hostWithoutPort === "ordix.co.jp" || hostWithoutPort === "www.ordix.co.jp";
  if (isOrdix) {
    // /corporate 配下以外へのアクセスは /corporate にリライト
    if (pathname === "/" || pathname === "") {
      return NextResponse.rewrite(new URL("/corporate", req.url));
    }
    // /about → /corporate/about 等
    if (!pathname.startsWith("/corporate") && !pathname.startsWith("/_next") && !pathname.startsWith("/api")) {
      return NextResponse.rewrite(new URL(`/corporate${pathname}`, req.url));
    }
  }

  // === www.l-ope.jp → l-ope.jp 正規化リダイレクト ===
  if (hostWithoutPort === "www.l-ope.jp") {
    const url = new URL(req.url);
    url.host = "l-ope.jp";
    url.protocol = "https:";
    return NextResponse.redirect(url, 301);
  }

  // === l-ope.jp の /lp（完全一致）→ / にリダイレクト ===
  // SEO: メインコンテンツをルートURLに集約し、旧 /lp へのアクセスを転送
  if (hostWithoutPort === "l-ope.jp" && pathname === "/lp") {
    const url = new URL(req.url);
    url.pathname = "/";
    return NextResponse.redirect(url, 301);
  }

  // === 旧カテゴリスラッグ → 新カテゴリスラッグへの301リダイレクト ===
  const oldCategoryRedirects: Record<string, string> = {
    "case-studies": "line-dx",
    guide: "line-dx",
    improvement: "line-dx",
    operation: "line-dx",
    opening: "management",
    evidence: "medication",
    revenue: "self-pay-revenue",
    // marketing → marketing（スラッグ変更なし）
    // management → management（スラッグ変更なし）
    // medication → medication（スラッグ変更なし）
    // comparison → comparison（スラッグ変更なし）
  };
  const categoryMatch = pathname.match(/^\/lp\/column\/category\/([^/]+)$/);
  if (categoryMatch) {
    const newSlug = oldCategoryRedirects[categoryMatch[1]];
    if (newSlug) {
      const url = new URL(req.url);
      url.pathname = `/lp/column/category/${newSlug}`;
      return NextResponse.redirect(url, 301);
    }
  }

  // === /lp 配下はルートドメイン(l-ope.jp) と localhost のみ許可 ===
  // テナントサブドメイン（noname-beauty.l-ope.jp 等）では非表示
  const isRootDomain = hostWithoutPort === "l-ope.jp" || hostWithoutPort === "www.l-ope.jp";
  const isLocalhost = hostWithoutPort === "localhost" || hostWithoutPort.startsWith("localhost");
  if ((pathname.startsWith("/lp") || pathname === "/") && !isLocalhost && !isRootDomain && !isOrdix) {
    return new NextResponse("Not Found", { status: 404 });
  }

  // === 旧サブドメインからの移行（ベアドメインはのなめLP用にスルー） ===
  const bareHost = host.replace(/:\d+$/, "");
  if (
    host.includes("noname-beauty.jp") &&
    bareHost !== "noname-beauty.jp" &&
    bareHost !== "www.noname-beauty.jp"
  ) {
    const newUrl = new URL(req.url);
    newUrl.host = "noname-beauty.l-ope.jp";
    // API（webhook等）は rewrite（外部サービスは301を追わないため）
    if (pathname.startsWith("/api/")) {
      // リライト先のサブドメインからテナントIDを解決してヘッダーに設定
      const rewriteSlug = newUrl.host.split(".")[0];
      const rewriteTenantId = await resolveSlugToTenantId(rewriteSlug);
      if (rewriteTenantId) {
        const headers = new Headers(req.headers);
        headers.set("x-tenant-id", rewriteTenantId);
        return NextResponse.rewrite(newUrl, { request: { headers } });
      }
      return NextResponse.rewrite(newUrl);
    }
    // ブラウザアクセスは 301 リダイレクト
    return NextResponse.redirect(newUrl, 301);
  }

  // === noname-beauty.jp ベアドメイン → のなめLP表示 ===
  if (bareHost === "noname-beauty.jp" || bareHost === "www.noname-beauty.jp") {
    if (pathname === "/" || pathname === "") {
      return NextResponse.rewrite(new URL("/noname-lp.html", req.url));
    }
  }

  // === /doctor 配下のBasic認証 ===
  if (pathname.startsWith("/doctor")) {
    const basicAuth = req.headers.get("authorization");
    const user = process.env.DR_BASIC_USER;
    const pass = process.env.DR_BASIC_PASS;

    if (user && pass) {
      const unauthorized = () =>
        new NextResponse("Unauthorized", {
          status: 401,
          headers: {
            "WWW-Authenticate": 'Basic realm="Doctor Console"',
            "Content-Type": "text/plain; charset=utf-8",
          },
        });

      if (basicAuth) {
        const authValue = basicAuth.split(" ")[1];
        const [u, p] = Buffer.from(authValue, "base64").toString().split(":");
        if (u !== user || p !== pass) {
          return unauthorized();
        }
      } else {
        return unauthorized();
      }
    }
  }

  // === /platform 配下のアクセス制限（admin サブドメインのみ許可） ===
  if (pathname.startsWith("/platform") || pathname.startsWith("/api/platform")) {
    const slug = bareHost.split(".")[0].split(":")[0];
    // admin サブドメインまたはローカル開発環境のみ許可
    const isAllowed = slug === "admin" || slug === "localhost" || slug === "127";
    if (!isAllowed) {
      return NextResponse.json(
        { ok: false, error: "Platform management is only accessible from admin subdomain" },
        { status: 403 },
      );
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
  let jwtTenantId: string | null = null;
  let tenantRole: string | null = null;
  let allowedMenuKeys: string[] | null = null;

  // 1. admin_session Cookie から tenantId / tenantRole / allowedMenuKeys を抽出
  const sessionCookie = req.cookies.get("admin_session")?.value;
  if (sessionCookie) {
    try {
      const secret = new TextEncoder().encode(JWT_SECRET);
      const { payload } = await jwtVerify(sessionCookie, secret);
      jwtTenantId = (payload as { tenantId?: string | null }).tenantId || null;
      tenantRole = (payload as { tenantRole?: string | null }).tenantRole || null;
      const menuKeys = (payload as { allowedMenuKeys?: string[] | null }).allowedMenuKeys;
      allowedMenuKeys = menuKeys ?? null;
    } catch {
      // JWT 無効 — tenantId なしで続行
    }
  }

  // 2. サブドメインからテナントIDを解決（JWTより優先）
  const subdomainSlug = bareHost.split(".")[0];
  const isSubdomainTenant = subdomainSlug && !RESERVED_SLUGS.has(subdomainSlug) && bareHost.includes(".");

  if (isSubdomainTenant) {
    try {
      tenantId = await resolveSlugToTenantId(subdomainSlug);
    } catch (e) {
      console.error("[middleware] subdomain resolve error:", e);
    }

    // サブドメインが存在するのにテナント解決失敗 → 404
    // ただし Cron / webhook / 患者向けAPIはテナント不要で動作するためスキップ
    if (!tenantId && !pathname.startsWith("/api/cron/") && !pathname.startsWith("/api/line/webhook") && !pathname.startsWith("/api/health")) {
      return NextResponse.json(
        { ok: false, error: "テナントが見つかりません" },
        { status: 404 },
      );
    }

    // JWTのtenantIdがない（古いセッション）or 不一致 → 再ログインさせる
    // ログインページ自体は除外（リダイレクトループ防止）、Cookieをクリアして通過させる
    if (tenantId && sessionCookie && (!jwtTenantId || jwtTenantId !== tenantId)) {
      if (pathname === "/admin/login" || pathname === "/admin/login/") {
        // ログインページはCookieクリアして通過（サブドメインのtenantIdをヘッダーに設定）
        const headers = new Headers(req.headers);
        headers.set("x-tenant-id", tenantId);
        const response = NextResponse.next({ request: { headers } });
        response.cookies.set("admin_session", "", {
          maxAge: 0,
          path: "/",
          domain: ".l-ope.jp",
        });
        return response;
      }
      if (pathname.startsWith("/admin") || pathname === "/") {
        const loginUrl = new URL("/admin/login", req.url);
        const response = NextResponse.redirect(loginUrl);
        response.cookies.set("admin_session", "", {
          maxAge: 0,
          path: "/",
          domain: ".l-ope.jp",
        });
        return response;
      }
      // APIアクセスの場合は401を返す
      if (pathname.startsWith("/api/admin/")) {
        return NextResponse.json(
          { ok: false, error: "別テナントのセッションです。再ログインしてください。" },
          { status: 401 },
        );
      }
    }
  } else {
    // サブドメインなし（localhost等）→ JWTのtenantIdを使用
    tenantId = jwtTenantId;
  }

  // === 細粒度権限チェック ===
  if (tenantRole && pathname.startsWith("/api/admin/")) {
    const requiredPermission = getRequiredPermission(pathname, method);
    if (requiredPermission && !hasPermission(tenantRole, requiredPermission)) {
      return NextResponse.json(
        { ok: false, error: "この操作に対する権限がありません" },
        { status: 403 },
      );
    }
  }

  // === メニューキーベースのアクセス制御 ===
  if (allowedMenuKeys !== null && (pathname.startsWith("/admin/") || pathname.startsWith("/api/admin/"))) {
    // ログイン・セッション等の基盤パスは除外
    const menuExemptPaths = ["/admin/login", "/admin/forgot-password", "/admin/reset-password", "/admin/setup",
      "/api/admin/login", "/api/admin/logout", "/api/admin/session", "/api/admin/account",
      "/api/admin/unread-count", "/api/admin/chat-reads", "/api/admin/csrf-token"];
    const isMenuExempt = menuExemptPaths.some((p) => pathname.startsWith(p));
    if (!isMenuExempt) {
      // ページパスの場合（/admin/xxx）
      const checkPath = pathname.startsWith("/api/admin/")
        ? "/admin/" + pathname.replace("/api/admin/", "")
        : pathname;
      const menuKey = resolveMenuKeyFromPath(checkPath);
      if (menuKey && !allowedMenuKeys.includes(menuKey)) {
        if (pathname.startsWith("/api/")) {
          return NextResponse.json(
            { ok: false, error: "この機能へのアクセス権限がありません" },
            { status: 403 },
          );
        }
        // ページアクセスの場合はダッシュボードにリダイレクト
        return NextResponse.redirect(new URL("/admin/dashboard", req.url));
      }
    }
  }

  // === 患者セッションJWT自動発行（旧Cookie → JWT移行） ===
  // patient_session がなく、旧Cookie（patient_id + line_user_id）がある場合にJWTを発行
  const hasPatientSession = !!req.cookies.get("patient_session")?.value;
  if (!hasPatientSession && !pathname.startsWith("/api/admin/") && !pathname.startsWith("/admin")) {
    const pid = req.cookies.get("__Host-patient_id")?.value || req.cookies.get("patient_id")?.value;
    const lid = req.cookies.get("__Host-line_user_id")?.value || req.cookies.get("line_user_id")?.value;
    if (pid && lid) {
      const patientSecret = process.env.PATIENT_SESSION_SECRET;
      if (patientSecret) {
        try {
          const secret = new TextEncoder().encode(patientSecret);
          const jwt = await new SignJWT({ pid, lid, tid: tenantId || null })
            .setProtectedHeader({ alg: "HS256" })
            .setIssuedAt()
            .setExpirationTime(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000))
            .sign(secret);

          const headers = new Headers(req.headers);
          if (tenantId) headers.set("x-tenant-id", tenantId);
          const response = NextResponse.next({ request: { headers } });
          response.cookies.set("patient_session", jwt, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            path: "/",
            maxAge: 365 * 24 * 60 * 60,
          });
          return response;
        } catch {
          // JWT生成失敗 → 通常処理を続行
        }
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
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|images/).*)"],
};
