import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  async headers() {
    return [
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
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.squareup.com https://sandbox.web.squarecdn.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https: http:",
              "connect-src 'self' https://*.supabase.co https://api.line.me https://connect.squareup.com https://api.squareup.com https://*.upstash.io https://*.sentry.io https://*.ingest.sentry.io",
              "frame-src 'self' https://js.squareup.com https://sandbox.web.squarecdn.com",
              "base-uri 'self'",
              "form-action 'self'",
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
