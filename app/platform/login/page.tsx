"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PlatformLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch("/api/admin/session", {
          method: "GET",
          credentials: "include",
        });

        if (res.ok) {
          const data = await res.json();
          if (data.ok && data.user?.platformRole === "platform_admin") {
            router.push("/platform");
            return;
          }
        }
      } catch {
        // セッションなし
      }
      setChecking(false);
    };

    checkSession();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // プラットフォーム専用ログインAPI（platform_admin のみ認証可）
      const res = await fetch("/api/platform/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          username: username.toUpperCase().trim(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.error || "認証に失敗しました");
        setLoading(false);
        return;
      }

      router.push("/platform");
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <p className="text-slate-400">認証状態を確認中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-lg shadow-xl p-8 w-full max-w-md border border-slate-700">
        <div className="text-center mb-8">
          <div className="flex items-baseline justify-center gap-0 mb-2">
            <span
              className="text-xl font-black tracking-tight bg-gradient-to-r from-violet-400 to-indigo-500 bg-clip-text text-transparent"
              style={{ fontFamily: "'Inter', 'Helvetica Neue', sans-serif" }}
            >
              Lオペ
            </span>
            <span className="ml-1.5 text-[10px] font-semibold tracking-widest uppercase bg-gradient-to-r from-violet-400 to-indigo-500 bg-clip-text text-transparent">
              Platform
            </span>
          </div>
          <p className="text-slate-400 text-sm">プラットフォーム管理ログイン</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-slate-300 mb-2">
              ユーザーID
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="LP-XXXXX"
              required
              autoCapitalize="characters"
              autoComplete="username"
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent uppercase"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
              パスワード
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="パスワード"
              required
              autoComplete="current-password"
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>

          {error && (
            <div className="p-4 bg-red-900/50 border border-red-700 rounded-lg">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-violet-600 text-white rounded-lg font-semibold hover:bg-violet-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                認証中...
              </span>
            ) : (
              "ログイン"
            )}
          </button>
        </form>

        <div className="mt-4 text-center">
          <p className="text-xs text-slate-500">
            セッションは24時間有効です
          </p>
        </div>
      </div>
    </div>
  );
}
