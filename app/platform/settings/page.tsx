"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

// 2FA設定のステップ
type TotpStep = "idle" | "setup" | "verify" | "done";

export default function PlatformSettingsPage() {
  // 2FA状態
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [totpStep, setTotpStep] = useState<TotpStep>("idle");
  const [totpSecret, setTotpSecret] = useState("");
  const [totpUri, setTotpUri] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verifyCode, setVerifyCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showDisable, setShowDisable] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  // 初回: 2FA有効状態をチェック
  useEffect(() => {
    const checkTotpStatus = async () => {
      try {
        const res = await fetch("/api/admin/session", {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          if (data.ok && data.user) {
            // セッション情報から totp_enabled を判定
            // admin/session API が totp_enabled を返さない場合は
            // 別途チェックが必要。ここでは設定ページ表示時に
            // setup API の応答で判断する方式を補助的に使う
          }
        }
      } catch {
        // エラーは無視
      }

      // totp_enabled の状態確認用に totp/setup を試して判定する代わりに
      // admin_users のフラグを直接確認するAPIを叩く
      // 簡易実装: setup を呼ばずにページ上で状態管理
      // 実際の状態は localStorage に保存し、disable/enable 成功時に更新
      const stored = localStorage.getItem("platform-totp-enabled");
      if (stored === "true") {
        setTotpEnabled(true);
      }
      setCheckingStatus(false);
    };

    checkTotpStatus();
  }, []);

  // 2FA設定開始
  const handleSetupTotp = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/platform/totp/setup", {
        method: "POST",
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.error || "設定の開始に失敗しました");
        setLoading(false);
        return;
      }

      setTotpSecret(data.secret);
      setTotpUri(data.uri);
      setBackupCodes(data.backupCodes);
      setTotpStep("setup");
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  // 2FA検証・有効化
  const handleVerifyTotp = async () => {
    if (verifyCode.length !== 6) {
      setError("6桁のコードを入力してください");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/platform/totp/verify", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: totpSecret,
          token: verifyCode,
          backupCodes,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.error || "コードの検証に失敗しました");
        setLoading(false);
        return;
      }

      setTotpEnabled(true);
      setTotpStep("done");
      setSuccess("2要素認証が有効になりました");
      localStorage.setItem("platform-totp-enabled", "true");
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  // 2FA無効化
  const handleDisableTotp = async () => {
    if (disableCode.length !== 6) {
      setError("6桁のコードを入力してください");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/platform/totp/disable", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: disableCode }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.error || "無効化に失敗しました");
        setLoading(false);
        return;
      }

      setTotpEnabled(false);
      setShowDisable(false);
      setDisableCode("");
      setSuccess("2要素認証が無効になりました");
      localStorage.setItem("platform-totp-enabled", "false");
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  // 設定リセット（キャンセル）
  const handleCancelSetup = () => {
    setTotpStep("idle");
    setTotpSecret("");
    setTotpUri("");
    setBackupCodes([]);
    setVerifyCode("");
    setError("");
  };

  return (
    <div className="min-h-screen bg-zinc-900 p-6">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* ヘッダー */}
        <div>
          <h1 className="text-2xl font-bold text-white">アカウント設定</h1>
          <p className="text-zinc-400 text-sm mt-1">セキュリティ設定とアカウント管理</p>
        </div>

        {/* 成功メッセージ */}
        {success && (
          <div className="p-4 bg-green-900/50 border border-green-700 rounded-lg">
            <p className="text-green-300 text-sm">{success}</p>
          </div>
        )}

        {/* エラーメッセージ */}
        {error && (
          <div className="p-4 bg-red-900/50 border border-red-700 rounded-lg">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* セクションA: 2要素認証 */}
        <div className="bg-zinc-800 rounded-lg border border-zinc-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-white">2要素認証 (TOTP)</h2>
              <p className="text-zinc-400 text-sm mt-1">
                Google Authenticator 等の認証アプリを使用して、ログイン時に追加の認証コードを要求します
              </p>
            </div>
            {!checkingStatus && (
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  totpEnabled
                    ? "bg-green-900/50 text-green-400 border border-green-700"
                    : "bg-zinc-700 text-zinc-400 border border-zinc-600"
                }`}
              >
                {totpEnabled ? "有効" : "無効"}
              </span>
            )}
          </div>

          {checkingStatus ? (
            <div className="flex items-center gap-2 text-zinc-400 text-sm">
              <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              読み込み中...
            </div>
          ) : totpEnabled && totpStep === "idle" ? (
            /* 設定済み: 無効化UI */
            <div>
              {!showDisable ? (
                <button
                  onClick={() => {
                    setShowDisable(true);
                    setError("");
                    setSuccess("");
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  2要素認証を無効化
                </button>
              ) : (
                <div className="space-y-4 bg-zinc-900 rounded-lg p-4 border border-zinc-700">
                  <p className="text-zinc-300 text-sm">
                    無効化するには、認証アプリに表示されている6桁のコードを入力してください
                  </p>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={disableCode}
                      onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ""))}
                      placeholder="000000"
                      className="w-40 px-4 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-white text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <button
                      onClick={handleDisableTotp}
                      disabled={loading || disableCode.length !== 6}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium disabled:bg-zinc-600 disabled:cursor-not-allowed transition-colors"
                    >
                      {loading ? "処理中..." : "無効化する"}
                    </button>
                    <button
                      onClick={() => {
                        setShowDisable(false);
                        setDisableCode("");
                        setError("");
                      }}
                      className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg text-sm transition-colors"
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : totpStep === "idle" ? (
            /* 未設定: 設定開始ボタン */
            <button
              onClick={handleSetupTotp}
              disabled={loading}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium disabled:bg-zinc-600 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  準備中...
                </span>
              ) : (
                "2要素認証を設定"
              )}
            </button>
          ) : totpStep === "setup" ? (
            /* ステップ1: QRコード表示 + バックアップコード */
            <div className="space-y-6">
              {/* QRコード */}
              <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-700">
                <h3 className="text-white font-medium mb-3">
                  1. 認証アプリでQRコードをスキャン
                </h3>
                <p className="text-zinc-400 text-sm mb-4">
                  Google Authenticator、Microsoft Authenticator、Authy などの認証アプリで以下のQRコードをスキャンしてください
                </p>
                <div className="flex justify-center bg-white rounded-lg p-4 w-fit mx-auto">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://chart.googleapis.com/chart?cht=qr&chs=200x200&chl=${encodeURIComponent(totpUri)}`}
                    alt="TOTP QR Code"
                    width={200}
                    height={200}
                  />
                </div>
                <details className="mt-3">
                  <summary className="text-zinc-500 text-xs cursor-pointer hover:text-zinc-400">
                    QRコードが読み取れない場合（手動入力）
                  </summary>
                  <div className="mt-2 p-3 bg-zinc-800 rounded border border-zinc-600">
                    <p className="text-zinc-400 text-xs mb-1">シークレットキー:</p>
                    <code className="text-amber-400 text-sm font-mono break-all select-all">
                      {totpSecret}
                    </code>
                  </div>
                </details>
              </div>

              {/* バックアップコード */}
              <div className="bg-zinc-900 rounded-lg p-4 border border-amber-700/50">
                <h3 className="text-white font-medium mb-2">
                  2. バックアップコードを保存
                </h3>
                <p className="text-zinc-400 text-sm mb-3">
                  認証アプリが使用できない場合に備え、以下のバックアップコードを安全な場所に保存してください。
                  各コードは一度だけ使用できます。
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {backupCodes.map((code, i) => (
                    <div
                      key={i}
                      className="px-3 py-2 bg-zinc-800 rounded border border-zinc-600 text-center"
                    >
                      <code className="text-white font-mono text-sm tracking-wider">
                        {code}
                      </code>
                    </div>
                  ))}
                </div>
              </div>

              {/* 検証コード入力 */}
              <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-700">
                <h3 className="text-white font-medium mb-3">
                  3. 認証コードを入力して確認
                </h3>
                <p className="text-zinc-400 text-sm mb-3">
                  認証アプリに表示されている6桁のコードを入力してください
                </p>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="000000"
                    className="w-40 px-4 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-white text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-amber-500"
                    autoFocus
                  />
                  <button
                    onClick={handleVerifyTotp}
                    disabled={loading || verifyCode.length !== 6}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium disabled:bg-zinc-600 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? "検証中..." : "有効化する"}
                  </button>
                  <button
                    onClick={handleCancelSetup}
                    className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg text-sm transition-colors"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            </div>
          ) : totpStep === "done" ? (
            /* 設定完了 */
            <div className="bg-green-900/30 rounded-lg p-4 border border-green-700">
              <p className="text-green-300 font-medium">2要素認証が正常に有効化されました</p>
              <p className="text-green-400/70 text-sm mt-1">
                次回ログイン時から認証コードの入力が必要になります
              </p>
              <button
                onClick={() => {
                  setTotpStep("idle");
                  setSuccess("");
                }}
                className="mt-3 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg text-sm transition-colors"
              >
                閉じる
              </button>
            </div>
          ) : null}
        </div>

        {/* セクションB: パスワード変更（プレースホルダー） */}
        <div className="bg-zinc-800 rounded-lg border border-zinc-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-2">パスワード変更</h2>
          <p className="text-zinc-400 text-sm mb-4">アカウントのパスワードを変更します</p>

          <div className="space-y-4 opacity-50 pointer-events-none">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                現在のパスワード
              </label>
              <input
                type="password"
                disabled
                placeholder="現在のパスワード"
                className="w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white placeholder-zinc-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                新しいパスワード
              </label>
              <input
                type="password"
                disabled
                placeholder="新しいパスワード"
                className="w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white placeholder-zinc-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                新しいパスワード（確認）
              </label>
              <input
                type="password"
                disabled
                placeholder="もう一度入力"
                className="w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white placeholder-zinc-500"
              />
            </div>
            <button
              disabled
              className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium"
            >
              パスワードを変更
            </button>
          </div>
          <p className="text-zinc-500 text-xs mt-3">
            ※ この機能は近日中に実装予定です
          </p>
        </div>

        {/* セッション管理へのリンク */}
        <div className="bg-zinc-800 rounded-lg border border-zinc-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-2">セッション管理</h2>
          <p className="text-zinc-400 text-sm mb-4">
            現在アクティブなログインセッションの確認・管理ができます
          </p>
          <Link
            href="/platform/settings/sessions"
            className="inline-block px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            セッション一覧を表示
          </Link>
        </div>
      </div>
    </div>
  );
}
