"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const DEMO_USER = "DEMO-001";
const DEMO_PASS = "demo1234";

export default function DemoLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // 既にログイン済みならダッシュボードへ
    if (localStorage.getItem("demo_session") === "true") {
      router.push("/d-64219f25f0e177ee");
    }
  }, [router]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // デモ認証のシミュレーション（少し遅延を入れてリアル感を出す）
    setTimeout(() => {
      const normalizedUser = username.toUpperCase().trim();
      if (normalizedUser === DEMO_USER && password === DEMO_PASS) {
        localStorage.setItem("demo_session", "true");
        router.push("/d-64219f25f0e177ee");
      } else {
        setError("ユーザーIDまたはパスワードが正しくありません");
        setLoading(false);
      }
    }, 800);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-lg shadow-xl p-8 w-full max-w-md border border-slate-700">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Lオペ for CLINIC</h1>
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="text-xs font-bold bg-amber-500 text-white px-2 py-0.5 rounded">DEMO</span>
          </div>
          <p className="text-slate-400 text-sm">デモ環境ログイン</p>
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
              placeholder="DEMO-001"
              required
              autoCapitalize="characters"
              autoComplete="username"
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
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
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                認証中...
              </span>
            ) : (
              "ログイン"
            )}
          </button>
        </form>

        {/* デモ認証情報の表示 */}
        <div className="mt-6 p-4 bg-slate-700/50 border border-slate-600 rounded-lg">
          <p className="text-xs text-slate-400 mb-2 font-semibold">デモ用ログイン情報</p>
          <div className="space-y-1">
            <p className="text-sm text-slate-300">
              ID: <code className="bg-slate-600 px-1.5 py-0.5 rounded text-cyan-300 font-mono">DEMO-001</code>
            </p>
            <p className="text-sm text-slate-300">
              PW: <code className="bg-slate-600 px-1.5 py-0.5 rounded text-cyan-300 font-mono">demo1234</code>
            </p>
          </div>
        </div>

        <div className="mt-4 text-center">
          <p className="text-xs text-slate-500">
            このデモ環境では実際のデータは使用されません
          </p>
        </div>
      </div>
    </div>
  );
}
