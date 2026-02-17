// sentry.server.config.ts
// サーバーサイドのSentry初期化
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: process.env.NODE_ENV === "production",

  // パフォーマンス監視（サンプリング10%）
  tracesSampleRate: 0.1,

  // 不要なエラーをフィルタ
  ignoreErrors: [
    // Supabase の一時的な接続エラー
    "FetchError",
    "ECONNRESET",
  ],
});
