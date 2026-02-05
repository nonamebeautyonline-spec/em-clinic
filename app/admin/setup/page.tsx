"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function SetupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [tokenError, setTokenError] = useState("");
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    if (!token) {
      setTokenError("無効なリンクです");
      setValidating(false);
      return;
    }

    const validateToken = async () => {
      try {
        const res = await fetch(`/api/admin/password-reset/confirm?token=${token}`);
        const data = await res.json();

        if (!res.ok || !data.ok) {
          setTokenError(data.error || "無効または期限切れのリンクです");
        } else {
          setUserName(data.user?.name || "");
          setUserEmail(data.user?.email || "");
        }
      } catch {
        setTokenError("検証に失敗しました");
      } finally {
        setValidating(false);
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("パスワードは8文字以上必要です");
      return;
    }

    if (password !== confirmPassword) {
      setError("パスワードが一致しません");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/admin/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.error || "エラーが発生しました");
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push("/admin/login"), 2000);
    } catch {
      setError("エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <p className="text-slate-400">リンクを検証中...</p>
      </div>
    );
  }

  if (tokenError) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 rounded-lg shadow-xl p-8 w-full max-w-md border border-slate-700 text-center">
          <div className="text-red-400 text-5xl mb-4">✕</div>
          <h1 className="text-xl font-bold text-white mb-4">リンクが無効です</h1>
          <p className="text-slate-400 text-sm mb-6">{tokenError}</p>
          <p className="text-slate-500 text-xs">管理者に再度招待を依頼してください</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 rounded-lg shadow-xl p-8 w-full max-w-md border border-slate-700 text-center">
          <div className="text-green-400 text-5xl mb-4">✓</div>
          <h1 className="text-xl font-bold text-white mb-4">セットアップ完了</h1>
          <p className="text-slate-400 text-sm">ログインページに移動します...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-lg shadow-xl p-8 w-full max-w-md border border-slate-700">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">アカウントセットアップ</h1>
          <p className="text-slate-400 text-sm">管理画面へようこそ</p>
          {userName && (
            <div className="mt-4 p-3 bg-slate-700 rounded-lg">
              <p className="text-white font-medium">{userName}</p>
              <p className="text-slate-400 text-sm">{userEmail}</p>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
              パスワードを設定
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="8文字以上"
              required
              minLength={8}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300 mb-2">
              パスワード確認
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="もう一度入力"
              required
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-slate-600"
          >
            {loading ? "設定中..." : "セットアップを完了"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-slate-500">
            セットアップ後、メールアドレスとパスワード、<br />
            管理者トークンでログインできます
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SetupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900 flex items-center justify-center"><p className="text-slate-400">読み込み中...</p></div>}>
      <SetupContent />
    </Suspense>
  );
}
