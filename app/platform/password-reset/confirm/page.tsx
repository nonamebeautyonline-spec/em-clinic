"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

// useSearchParamsはSuspense内で使用する必要がある
function PasswordResetConfirmForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // パスワード不一致チェック（フロント側）
    if (password !== confirmPassword) {
      setError("パスワードが一致しません");
      return;
    }

    // 最低8文字チェック（フロント側）
    if (password.length < 8) {
      setError("パスワードは8文字以上で入力してください");
      return;
    }

    if (!token) {
      setError("リセットトークンが見つかりません。メールのリンクを再度クリックしてください。");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/platform/password-reset/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "エラーが発生しました");
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  // 成功画面
  if (success) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center p-4">
        <div className="bg-zinc-800 rounded-lg shadow-xl p-8 w-full max-w-md border border-zinc-700">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-600/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-white mb-2">パスワードを変更しました</h1>
            <p className="text-zinc-400 text-sm">
              新しいパスワードでログインしてください。
            </p>
          </div>

          <Link
            href="/platform/login"
            className="block w-full py-3 px-4 text-center bg-amber-600 text-white rounded-lg font-semibold hover:bg-amber-700 transition-colors"
          >
            ログインページへ
          </Link>
        </div>
      </div>
    );
  }

  // トークンが無い場合のエラー表示
  if (!token) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center p-4">
        <div className="bg-zinc-800 rounded-lg shadow-xl p-8 w-full max-w-md border border-zinc-700">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-600/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-white mb-2">無効なリンク</h1>
            <p className="text-zinc-400 text-sm">
              リセットトークンが見つかりません。メールのリンクを再度クリックするか、パスワードリセットをやり直してください。
            </p>
          </div>

          <Link
            href="/platform/password-reset"
            className="block w-full py-3 px-4 text-center bg-amber-600 text-white rounded-lg font-semibold hover:bg-amber-700 transition-colors"
          >
            パスワードリセットをやり直す
          </Link>
        </div>
      </div>
    );
  }

  // 新パスワード入力フォーム
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
          <h1 className="text-lg font-bold text-white mb-1">新しいパスワードを設定</h1>
          <p className="text-zinc-400 text-sm">
            新しいパスワードを入力してください
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-zinc-300 mb-2">
              新しいパスワード
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="8文字以上"
              required
              minLength={8}
              maxLength={200}
              autoComplete="new-password"
              className="w-full px-4 py-3 bg-zinc-700 border border-zinc-600 rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-zinc-300 mb-2">
              パスワード（確認）
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="もう一度入力してください"
              required
              minLength={8}
              maxLength={200}
              autoComplete="new-password"
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
                変更中...
              </span>
            ) : (
              "パスワードを変更する"
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

// Suspenseで囲んでuseSearchParamsのハイドレーションエラーを防止
export default function PasswordResetConfirmPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-amber-500 border-t-transparent"></div>
        </div>
      }
    >
      <PasswordResetConfirmForm />
    </Suspense>
  );
}
