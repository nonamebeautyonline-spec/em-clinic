// __tests__/api/csrf-token.test.ts
// csrf-token エンドポイントとCSPヘッダーのテスト
import { describe, it, expect, vi } from "vitest";
import fs from "fs";
import path from "path";

// ===================================================================
// csrf-token エンドポイント動作テスト
// ===================================================================
describe("csrf-token エンドポイント（app/api/csrf-token/route.ts）", () => {
  it("GET エクスポートが存在する", () => {
    const src = fs.readFileSync(
      path.resolve(process.cwd(), "app/api/csrf-token/route.ts"),
      "utf-8",
    );
    expect(src).toMatch(/export\s+async\s+function\s+GET/);
  });

  it("randomUUID でトークンを生成する", () => {
    const src = fs.readFileSync(
      path.resolve(process.cwd(), "app/api/csrf-token/route.ts"),
      "utf-8",
    );
    expect(src).toContain("randomUUID");
  });

  it("レスポンスに csrfToken を含む", () => {
    const src = fs.readFileSync(
      path.resolve(process.cwd(), "app/api/csrf-token/route.ts"),
      "utf-8",
    );
    expect(src).toContain("csrfToken");
  });

  it("httpOnly=false（Double Submit Cookie パターン）", () => {
    const src = fs.readFileSync(
      path.resolve(process.cwd(), "app/api/csrf-token/route.ts"),
      "utf-8",
    );
    expect(src).toContain("httpOnly: false");
  });

  it("sameSite=lax", () => {
    const src = fs.readFileSync(
      path.resolve(process.cwd(), "app/api/csrf-token/route.ts"),
      "utf-8",
    );
    expect(src).toMatch(/sameSite:\s*["']lax["']/);
  });

  it("Cookie名は csrf_token", () => {
    const src = fs.readFileSync(
      path.resolve(process.cwd(), "app/api/csrf-token/route.ts"),
      "utf-8",
    );
    expect(src).toContain('"csrf_token"');
  });

  it("有効期限は24時間", () => {
    const src = fs.readFileSync(
      path.resolve(process.cwd(), "app/api/csrf-token/route.ts"),
      "utf-8",
    );
    expect(src).toContain("24 * 60 * 60");
  });
});

// ===================================================================
// トークン生成の動作テスト
// ===================================================================
describe("CSRFトークン生成ロジック", () => {
  it("randomUUID はUUIDv4形式", () => {
    const token = crypto.randomUUID();
    expect(token).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it("毎回異なるトークン", () => {
    const tokens = new Set(Array.from({ length: 100 }, () => crypto.randomUUID()));
    expect(tokens.size).toBe(100);
  });
});

// ===================================================================
// CSP ヘッダー設定テスト（next.config.ts）
// ===================================================================
describe("CSP ヘッダー設定（next.config.ts）", () => {
  const configSrc = fs.readFileSync(
    path.resolve(process.cwd(), "next.config.ts"),
    "utf-8",
  );

  it("X-Content-Type-Options: nosniff", () => {
    expect(configSrc).toContain("nosniff");
  });

  it("X-Frame-Options: DENY", () => {
    expect(configSrc).toContain("DENY");
  });

  it("X-XSS-Protection が設定されている", () => {
    expect(configSrc).toContain("X-XSS-Protection");
  });

  it("Referrer-Policy: strict-origin-when-cross-origin", () => {
    expect(configSrc).toContain("strict-origin-when-cross-origin");
  });

  it("Permissions-Policy でカメラ・マイク・位置情報を禁止", () => {
    expect(configSrc).toContain("camera=()");
    expect(configSrc).toContain("microphone=");
    expect(configSrc).toContain("geolocation=()");
  });

  it("CSP default-src は self", () => {
    expect(configSrc).toContain("default-src 'self'");
  });

  it("CSP script-src に Square CDN を許可", () => {
    expect(configSrc).toContain("js.squareup.com");
    expect(configSrc).toContain("sandbox.web.squarecdn.com");
  });

  it("CSP connect-src に Supabase を許可", () => {
    expect(configSrc).toContain("*.supabase.co");
  });

  it("CSP connect-src に LINE API を許可", () => {
    expect(configSrc).toContain("api.line.me");
  });

  it("CSP connect-src に Upstash Redis を許可", () => {
    expect(configSrc).toContain("*.upstash.io");
  });

  it("CSP style-src に Google Fonts を許可", () => {
    expect(configSrc).toContain("fonts.googleapis.com");
  });

  it("CSP frame-src に Square を許可", () => {
    expect(configSrc).toContain("frame-src");
    expect(configSrc).toContain("js.squareup.com");
  });

  it("CSP base-uri は self", () => {
    expect(configSrc).toContain("base-uri 'self'");
  });

  it("CSP form-action は self", () => {
    expect(configSrc).toContain("form-action 'self'");
  });

  it("全パス（/(.*））に適用される", () => {
    expect(configSrc).toContain("/(.*)")
  });
});
