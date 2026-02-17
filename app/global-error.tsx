"use client";
// app/global-error.tsx
// アプリ全体の未キャッチエラーをSentryに送信
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div style={{ padding: "2rem", textAlign: "center" }}>
          <h2>エラーが発生しました</h2>
          <p>申し訳ございません。問題が発生しました。</p>
          <button onClick={reset} style={{ marginTop: "1rem", padding: "0.5rem 1rem" }}>
            再試行
          </button>
        </div>
      </body>
    </html>
  );
}
