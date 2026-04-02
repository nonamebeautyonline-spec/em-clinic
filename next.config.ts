import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async redirects() {
    return [];
  },
  async headers() {
    return [
      /* クリニックコラム記事 — CDNキャッシュ24h + stale-while-revalidate */
      {
        source: "/clinic/column/:slug((?!category|thumbnails|_components)[^/]+)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400" },
        ],
      },
      /* クリニックOG画像 — 7日キャッシュ */
      {
        source: "/clinic/column/:slug/opengraph-image",
        headers: [
          { key: "Cache-Control", value: "public, max-age=604800, immutable" },
        ],
      },
      /* クリニックサムネイル画像 — ブラウザ1日 + CDN7日 */
      {
        source: "/clinic/column/thumbnails/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400" },
        ],
      },
      /* 汎用LINEコラム記事 — CDNキャッシュ24h + stale-while-revalidate */
      {
        source: "/line/column/:slug((?!category|thumbnails|_components)[^/]+)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400" },
        ],
      },
      /* 汎用LINE OG画像 — 7日キャッシュ */
      {
        source: "/line/column/:slug/opengraph-image",
        headers: [
          { key: "Cache-Control", value: "public, max-age=604800, immutable" },
        ],
      },
      /* サロンコラム記事 */
      {
        source: "/salon/column/:slug((?!category|thumbnails|_components)[^/]+)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400" },
        ],
      },
      {
        source: "/salon/column/:slug/opengraph-image",
        headers: [
          { key: "Cache-Control", value: "public, max-age=604800, immutable" },
        ],
      },
      /* EC コラム記事 */
      {
        source: "/ec/column/:slug((?!category|thumbnails|_components)[^/]+)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400" },
        ],
      },
      {
        source: "/ec/column/:slug/opengraph-image",
        headers: [
          { key: "Cache-Control", value: "public, max-age=604800, immutable" },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(self), geolocation=(), payment=(self)",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.squareup.com https://sandbox.web.squarecdn.com https://web.squarecdn.com https://*.mul-pay.jp https://static.mul-pay.jp https://stg.static.mul-pay.jp",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://sandbox.web.squarecdn.com https://web.squarecdn.com",
              "font-src 'self' https://fonts.gstatic.com https://square-fonts-production-f.squarecdn.com https://d1g145x70srn7h.cloudfront.net",
              "img-src 'self' data: blob: https: http:",
              "connect-src 'self' https://*.supabase.co https://api.line.me https://connect.squareup.com https://connect.squareupsandbox.com https://api.squareup.com https://pci-connect.squareup.com https://pci-connect.squareupsandbox.com https://web.squarecdn.com https://sandbox.web.squarecdn.com https://*.upstash.io https://*.sentry.io https://*.ingest.sentry.io https://o160250.ingest.sentry.io https://*.l-ope.jp https://api.anthropic.com https://zipcloud.ibsnet.co.jp https://*.cardinalcommerce.com https://*.mul-pay.jp",
              "frame-src 'self' https://js.squareup.com https://sandbox.web.squarecdn.com https://web.squarecdn.com https://pci-connect.squareup.com https://pci-connect.squareupsandbox.com https://*.cardinalcommerce.com https://*.mul-pay.jp",
              "base-uri 'self'",
              "form-action 'self' https://*.cardinalcommerce.com https://*.mul-pay.jp",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // ソースマップをSentryにアップロード（ビルド時）
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // ソースマップ設定
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },

  // webpack自動インストルメンテーション
  webpack: {
    autoInstrumentServerFunctions: true,
    autoInstrumentMiddleware: true,
    autoInstrumentAppDirectory: true,
    treeshake: {
      removeDebugLogging: true,
    },
  },

  // SENTRY_AUTH_TOKEN 未設定時はソースマップアップロードをスキップ
  silent: !process.env.SENTRY_AUTH_TOKEN,
});
