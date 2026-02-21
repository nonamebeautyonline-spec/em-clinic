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

  // TOTP入力ステップ
  const [pendingTotp, setPendingTotp] = useState(false);
  const [pendingTotpToken, setPendingTotpToken] = useState("");
  const [totpCode, setTotpCode] = useState("");

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

      // 2FA/TOTP が有効な場合: TOTP入力ステップへ
      if (data.pendingTotp) {
        setPendingTotp(true);
        setPendingTotpToken(data.pendingTotpToken);
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

  // TOTP検証
  const handleTotpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/platform/totp/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          pendingTotpToken,
          token: totpCode,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.error || "認証コードの検証に失敗しました");
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

  // ログインフォームに戻る
  const handleBackToLogin = () => {
    setPendingTotp(false);
    setPendingTotpToken("");
    setTotpCode("");
    setError("");
    setPassword("");
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
          <p className="text-slate-400 text-sm">
            {pendingTotp ? "2要素認証" : "プラットフォーム管理ログイン"}
          </p>
        </div>

        {pendingTotp ? (
          /* TOTP入力ステップ */
          <form onSubmit={handleTotpVerify} className="space-y-4">
            <div className="text-center mb-4">
              <p className="text-slate-300 text-sm">
                認証アプリに表示されている6桁のコードを入力してください
              </p>
              <p className="text-slate-500 text-xs mt-1">
                バックアップコード（8桁）も使用可能です
              </p>
            </div>

            <div>
              <label htmlFor="totp-code" className="block text-sm font-medium text-slate-300 mb-2">
                認証コード
              </label>
              <input
                id="totp-code"
                type="text"
                inputMode="numeric"
                maxLength={8}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                required
                autoFocus
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white text-center text-xl tracking-[0.3em] placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent font-mono"
              />
            </div>

            {error && (
              <div className="p-4 bg-red-900/50 border border-red-700 rounded-lg">
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || totpCode.length < 6}
              className="w-full py-3 px-4 bg-violet-600 text-white rounded-lg font-semibold hover:bg-violet-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                  検証中...
                </span>
              ) : (
                "認証"
              )}
            </button>

            <button
              type="button"
              onClick={handleBackToLogin}
              className="w-full py-2 text-sm text-slate-400 hover:text-slate-300 transition-colors"
            >
              ログインに戻る
            </button>
          </form>
        ) : (
          /* 通常のログインフォーム */
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
        )}

        <div className="mt-4 text-center space-y-2">
          <a
            href="/platform/password-reset"
            className="block text-sm text-slate-400 hover:text-violet-400 transition-colors"
          >
            パスワードを忘れた方
          </a>
          <p className="text-xs text-slate-500">
            セッションは24時間有効です
          </p>
        </div>
      </div>
    </div>
  );
}
