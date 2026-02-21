"use client";

// app/platform/health/page.tsx
// プラットフォーム管理: システムヘルスダッシュボード

import { useState, useEffect, useCallback } from "react";

interface HealthCheck {
  status: string;
  responseMs: number;
  error?: string;
}

interface HealthData {
  ok: boolean;
  checks: Record<string, HealthCheck>;
  stats: {
    activeSessions: number;
    totalTenants: number;
    activeTenants: number;
    auditLogs24h: number;
    errors24h: number;
  };
  timestamp: string;
}

// ステータスに応じた色クラス
function statusColor(status: string): { bg: string; text: string; dot: string } {
  switch (status) {
    case "healthy":
      return { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500" };
    case "degraded":
      return { bg: "bg-yellow-50", text: "text-yellow-700", dot: "bg-yellow-500" };
    case "unhealthy":
      return { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" };
    case "unconfigured":
      return { bg: "bg-zinc-50", text: "text-zinc-500", dot: "bg-zinc-400" };
    default:
      return { bg: "bg-zinc-50", text: "text-zinc-500", dot: "bg-zinc-400" };
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case "healthy":
      return "正常";
    case "degraded":
      return "遅延";
    case "unhealthy":
      return "障害";
    case "unconfigured":
      return "未設定";
    default:
      return status;
  }
}

const SERVICE_LABELS: Record<string, string> = {
  database: "データベース (Supabase)",
  redis: "キャッシュ (Redis)",
};

export default function HealthDashboardPage() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch("/api/platform/health", { credentials: "include" });
      if (!res.ok) throw new Error("ヘルスチェック取得失敗");
      const json = await res.json();
      setData(json);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    // 30秒間隔で自動リフレッシュ
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* ヘッダー */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">システムヘルス</h1>
        <p className="text-sm text-zinc-500 mt-1">
          サービスの稼働状況をリアルタイムで監視
        </p>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* 全体ステータスバナー */}
      {data && (
        <div
          className={`mb-6 p-4 rounded-lg border flex items-center justify-between ${
            data.ok
              ? "bg-green-50 border-green-200"
              : "bg-red-50 border-red-200"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-4 h-4 rounded-full ${
                data.ok ? "bg-green-500" : "bg-red-500"
              } animate-pulse`}
            />
            <span
              className={`text-sm font-semibold ${
                data.ok ? "text-green-700" : "text-red-700"
              }`}
            >
              {data.ok ? "全サービス正常稼働中" : "一部サービスに問題があります"}
            </span>
          </div>
          <div className="text-xs text-zinc-500">
            最終確認: {formatTime(data.timestamp)}
          </div>
        </div>
      )}

      {/* サービスステータスカード */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {loading
          ? Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
                <div className="h-4 bg-zinc-200 rounded w-1/2 mb-3" />
                <div className="h-6 bg-zinc-200 rounded w-1/3 mb-2" />
                <div className="h-3 bg-zinc-100 rounded w-1/4" />
              </div>
            ))
          : data &&
            Object.entries(data.checks).map(([key, check]) => {
              const color = statusColor(check.status);
              return (
                <div
                  key={key}
                  className={`bg-white rounded-lg shadow p-6 border-l-4 ${
                    check.status === "healthy"
                      ? "border-l-green-500"
                      : check.status === "degraded"
                        ? "border-l-yellow-500"
                        : check.status === "unhealthy"
                          ? "border-l-red-500"
                          : "border-l-zinc-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-zinc-900">
                      {SERVICE_LABELS[key] || key}
                    </h3>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${color.bg} ${color.text}`}
                    >
                      <span className={`w-2 h-2 rounded-full ${color.dot}`} />
                      {statusLabel(check.status)}
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-zinc-900">
                    {check.responseMs}
                    <span className="text-sm font-normal text-zinc-400 ml-1">ms</span>
                  </div>
                  {check.error && (
                    <p className="mt-2 text-xs text-red-600">{check.error}</p>
                  )}
                </div>
              );
            })}
      </div>

      {/* 統計カード */}
      <h2 className="text-lg font-bold text-zinc-900 mb-4">運用統計（直近24時間）</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
                <div className="h-3 bg-zinc-200 rounded w-1/2 mb-2" />
                <div className="h-7 bg-zinc-200 rounded w-2/3" />
              </div>
            ))
          : data && (
              <>
                <StatCard
                  label="アクティブセッション"
                  value={data.stats.activeSessions}
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                    </svg>
                  }
                  color="blue"
                />
                <StatCard
                  label="テナント数"
                  value={`${data.stats.activeTenants} / ${data.stats.totalTenants}`}
                  subtitle="アクティブ / 全体"
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  }
                  color="amber"
                />
                <StatCard
                  label="監査ログ"
                  value={data.stats.auditLogs24h}
                  subtitle="直近24時間"
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  }
                  color="zinc"
                />
                <StatCard
                  label="エラー件数"
                  value={data.stats.errors24h}
                  subtitle="直近24時間"
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  }
                  color={data.stats.errors24h > 0 ? "red" : "green"}
                />
              </>
            )}
      </div>

      {/* 自動リフレッシュ表示 */}
      <div className="text-center text-xs text-zinc-400">
        30秒ごとに自動更新されます
      </div>
    </div>
  );
}

// 統計カード
function StatCard({
  label,
  value,
  subtitle,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: "blue" | "amber" | "zinc" | "red" | "green";
}) {
  const iconBg: Record<string, string> = {
    blue: "bg-blue-100 text-blue-600",
    amber: "bg-amber-100 text-amber-600",
    zinc: "bg-zinc-100 text-zinc-600",
    red: "bg-red-100 text-red-600",
    green: "bg-green-100 text-green-600",
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-zinc-500">{label}</p>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${iconBg[color]}`}>
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold text-zinc-900">{value}</div>
      {subtitle && (
        <p className="text-xs text-zinc-400 mt-1">{subtitle}</p>
      )}
    </div>
  );
}
