// lib/logger.ts
// 構造化ログヘルパー（本番: JSON形式 / 開発: 読みやすい形式）
import * as Sentry from "@sentry/nextjs";

type LogLevel = "info" | "warn" | "error";

interface LogContext {
  route?: string;
  tenantId?: string | null;
  patientId?: string;
  action?: string;
  [key: string]: unknown;
}

function formatLog(level: LogLevel, message: string, context?: LogContext) {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...context,
  };

  if (process.env.NODE_ENV === "production") {
    // 本番: JSON 1行（Vercel Logs でフィルタ可能）
    return JSON.stringify(entry);
  }

  // 開発: 読みやすい形式
  const ctx = context
    ? " " + Object.entries(context)
        .filter(([, v]) => v != null)
        .map(([k, v]) => `${k}=${typeof v === "object" ? JSON.stringify(v) : v}`)
        .join(" ")
    : "";
  return `[${level.toUpperCase()}] ${message}${ctx}`;
}

export const logger = {
  info(message: string, context?: LogContext) {
    console.log(formatLog("info", message, context));
  },

  warn(message: string, context?: LogContext) {
    console.warn(formatLog("warn", message, context));
  },

  error(message: string, error?: unknown, context?: LogContext) {
    const errorInfo = error instanceof Error
      ? { errorName: error.name, errorMessage: error.message }
      : error != null
        ? { errorMessage: String(error) }
        : {};

    console.error(formatLog("error", message, { ...context, ...errorInfo }));

    // Sentry にもエラーを送信
    if (error instanceof Error) {
      Sentry.captureException(error, {
        extra: { message, ...context },
      });
    } else if (error != null) {
      Sentry.captureMessage(`${message}: ${String(error)}`, {
        level: "error",
        extra: context,
      });
    }
  },
};
