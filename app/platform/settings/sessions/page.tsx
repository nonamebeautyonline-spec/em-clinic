"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface SessionItem {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  lastActivity: string;
  expiresAt: string;
  isCurrent: boolean;
}

/** User-Agentからブラウザ名を簡易パース */
function parseBrowser(ua: string | null): string {
  if (!ua) return "不明";
  if (ua.includes("Edg/") || ua.includes("Edge/")) return "Edge";
  if (ua.includes("Chrome/") && !ua.includes("Edg/")) return "Chrome";
  if (ua.includes("Firefox/")) return "Firefox";
  if (ua.includes("Safari/") && !ua.includes("Chrome/")) return "Safari";
  if (ua.includes("Opera/") || ua.includes("OPR/")) return "Opera";
  return "その他";
}

/** User-AgentからOS名を簡易パース */
function parseOS(ua: string | null): string {
  if (!ua) return "不明";
  if (ua.includes("iPhone") || ua.includes("iPad")) return "iOS";
  if (ua.includes("Android")) return "Android";
  if (ua.includes("Windows")) return "Windows";
  if (ua.includes("Macintosh") || ua.includes("Mac OS")) return "Mac";
  if (ua.includes("Linux")) return "Linux";
  return "その他";
}

/** 日時を相対表示 */
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return "たった今";
  if (diffMin < 60) return `${diffMin}分前`;
  if (diffHour < 24) return `${diffHour}時間前`;
  if (diffDay < 7) return `${diffDay}日前`;

  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PlatformSessionsPage() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // セッション一覧を取得
  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/platform/sessions", {
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.error || "セッション情報の取得に失敗しました");
        return;
      }

      setSessions(data.sessions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // セッション削除
  const handleRevoke = async (sessionId: string) => {
    setRevoking(sessionId);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`/api/platform/sessions/${sessionId}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.error || "セッションの削除に失敗しました");
        return;
      }

      setSuccess("セッションをログアウトしました");
      // 一覧を再取得
      await fetchSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setRevoking(null);
    }
  };

  // 他のすべてのセッションをログアウト
  const handleRevokeAll = async () => {
    if (!confirm("現在のセッション以外のすべてのセッションをログアウトしますか?")) {
      return;
    }

    setRevokingAll(true);
    setError("");
    setSuccess("");

    try {
      // 現在のセッション以外を個別に削除
      const otherSessions = sessions.filter((s) => !s.isCurrent);
      let revokedCount = 0;

      for (const session of otherSessions) {
        const res = await fetch(`/api/platform/sessions/${session.id}`, {
          method: "DELETE",
          credentials: "include",
        });

        const data = await res.json();
        if (res.ok && data.ok) {
          revokedCount++;
        }
      }

      if (revokedCount > 0) {
        setSuccess(`${revokedCount}件のセッションをログアウトしました`);
      } else {
        setSuccess("ログアウトするセッションはありません");
      }

      // 一覧を再取得
      await fetchSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setRevokingAll(false);
    }
  };

  const otherSessionCount = sessions.filter((s) => !s.isCurrent).length;

  return (
    <div className="min-h-screen bg-zinc-900 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Link
                href="/platform/settings"
                className="text-zinc-400 hover:text-zinc-300 text-sm transition-colors"
              >
                アカウント設定
              </Link>
              <span className="text-zinc-600">/</span>
              <h1 className="text-xl font-bold text-white">セッション管理</h1>
            </div>
            <p className="text-zinc-400 text-sm">
              現在アクティブなログインセッションの一覧です
            </p>
          </div>
        </div>

        {/* メッセージ */}
        {success && (
          <div className="p-3 bg-green-900/50 border border-green-700 rounded-lg">
            <p className="text-green-300 text-sm">{success}</p>
          </div>
        )}
        {error && (
          <div className="p-3 bg-red-900/50 border border-red-700 rounded-lg">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* ローディング */}
        {loading ? (
          <div className="bg-zinc-800 rounded-lg border border-zinc-700 p-12 text-center">
            <div className="inline-block w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-zinc-400 text-sm mt-3">セッション情報を取得中...</p>
          </div>
        ) : (
          <>
            {/* 一括ログアウトボタン */}
            {otherSessionCount > 0 && (
              <div className="flex justify-end">
                <button
                  onClick={handleRevokeAll}
                  disabled={revokingAll}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium disabled:bg-zinc-600 disabled:cursor-not-allowed transition-colors"
                >
                  {revokingAll ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      処理中...
                    </span>
                  ) : (
                    `他のすべてのセッションをログアウト (${otherSessionCount}件)`
                  )}
                </button>
              </div>
            )}

            {/* セッション一覧 */}
            {sessions.length === 0 ? (
              <div className="bg-zinc-800 rounded-lg border border-zinc-700 p-8 text-center">
                <p className="text-zinc-400">アクティブなセッションはありません</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={`bg-zinc-800 rounded-lg border p-4 ${
                      session.isCurrent
                        ? "border-amber-500/50"
                        : "border-zinc-700"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        {/* デバイス・ブラウザ情報 */}
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-white font-medium text-sm">
                            {parseBrowser(session.userAgent)} / {parseOS(session.userAgent)}
                          </span>
                          {session.isCurrent && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-900/60 text-green-400 border border-green-700">
                              現在のセッション
                            </span>
                          )}
                        </div>

                        {/* 詳細情報 */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400">
                          <span>
                            IP: {session.ipAddress || "不明"}
                          </span>
                          <span>
                            最終アクティビティ: {formatRelativeTime(session.lastActivity)}
                          </span>
                          <span>
                            ログイン: {new Date(session.createdAt).toLocaleDateString("ja-JP", {
                              month: "2-digit",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>

                      {/* アクション */}
                      {!session.isCurrent && (
                        <button
                          onClick={() => handleRevoke(session.id)}
                          disabled={revoking === session.id}
                          className="ml-4 px-3 py-1.5 bg-red-600/80 hover:bg-red-600 text-white rounded text-xs font-medium disabled:bg-zinc-600 disabled:cursor-not-allowed transition-colors shrink-0"
                        >
                          {revoking === session.id ? "処理中..." : "ログアウト"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
