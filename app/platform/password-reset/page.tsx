"use client";

import { useState } from "react";
import Link from "next/link";

// パスワードリセットリクエストフォーム（メールアドレス入力）
export default function PasswordResetRequestPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/platform/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "エラーが発生しました");
        setLoading(false);
        return;
      }

      setSent(true);
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  // 送信完了画面
  if (sent) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center p-4">
        <div className="bg-zinc-800 rounded-lg shadow-xl p-8 w-full max-w-md border border-zinc-700">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-600/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-white mb-2">メールを送信しました</h1>
            <p className="text-zinc-400 text-sm">
              入力されたメールアドレスにパスワードリセット用のリンクを送信しました。
              メールをご確認ください。
            </p>
            <p className="text-zinc-500 text-xs mt-3">
              リンクの有効期限は30分です。メールが届かない場合はメールアドレスをご確認の上、再度お試しください。
            </p>
          </div>

          <Link
            href="/platform/login"
            className="block w-full py-3 px-4 text-center bg-zinc-700 text-white rounded-lg font-semibold hover:bg-zinc-600 transition-colors"
          >
            ログインページに戻る
          </Link>
        </div>
      </div>
    );
  }

  // メールアドレス入力フォーム
  return (
    <div className="min-h-screen bg-zinc-900 flex items-center justify-center p-4">
      <div className="bg-zinc-800 rounded-lg shadow-xl p-8 w-full max-w-md border border-zinc-700">
        <div className="text-center mb-8">
          <div className="flex items-baseline justify-center gap-0 mb-2">
            <span
              className="text-xl font-black tracking-tight bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent"
              style={{ fontFamily: "'Inter', 'Helvetica Neue', sans-serif" }}
            >
              Lオペ
            </span>
            <span className="ml-1.5 text-[10px] font-semibold tracking-widest uppercase bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
              Platform
            </span>
          </div>
          <h1 className="text-lg font-bold text-white mb-1">パスワードリセット</h1>
          <p className="text-zinc-400 text-sm">
            登録済みのメールアドレスを入力してください
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-zinc-300 mb-2">
              メールアドレス
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              required
              autoComplete="email"
              className="w-full px-4 py-3 bg-zinc-700 border border-zinc-600 rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
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
            className="w-full py-3 px-4 bg-amber-600 text-white rounded-lg font-semibold hover:bg-amber-700 disabled:bg-zinc-600 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                送信中...
              </span>
            ) : (
              "リセットメールを送信"
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link
            href="/platform/login"
            className="text-sm text-amber-500 hover:text-amber-400 transition-colors"
          >
            ログインページに戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
