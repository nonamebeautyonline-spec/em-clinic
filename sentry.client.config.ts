// sentry.client.config.ts
// クライアントサイドのSentry初期化
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: process.env.NODE_ENV === "production",

  // パフォーマンス監視（サンプリング10%）
  tracesSampleRate: 0.1,

  // リプレイ（エラー時のみ100%）
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0,

  // 不要なエラーをフィルタ
  ignoreErrors: [
    // ブラウザ拡張機能のエラー
    "ResizeObserver loop",
    "Non-Error promise rejection",
    // ネットワークエラー（患者側のオフライン等）
    "Failed to fetch",
    "Load failed",
    "NetworkError",
  ],
});
