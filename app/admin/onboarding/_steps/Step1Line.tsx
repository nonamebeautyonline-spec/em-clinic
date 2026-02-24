"use client";

// Step 1: LINE連携設定
import { useState } from "react";

interface Props {
  completed: boolean;
  onNext: () => void;
  onBack: () => void;
}

export default function Step1Line({ completed, onNext, onBack }: Props) {
  const [channelAccessToken, setChannelAccessToken] = useState("");
  const [channelId, setChannelId] = useState("");
  const [channelSecret, setChannelSecret] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!channelAccessToken.trim()) {
      setError("Channel Access Token は必須です");
      return;
    }

    setSaving(true);
    setError("");

    try {
      // 設定を順番に保存
      const settings = [
        { category: "line", key: "channel_access_token", value: channelAccessToken.trim() },
        ...(channelId.trim()
          ? [{ category: "line", key: "channel_id", value: channelId.trim() }]
          : []),
        ...(channelSecret.trim()
          ? [{ category: "line", key: "channel_secret", value: channelSecret.trim() }]
          : []),
      ];

      for (const setting of settings) {
        const res = await fetch("/api/admin/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(setting),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error || "設定の保存に失敗しました");
        }
      }

      setSaved(true);
      setTimeout(() => onNext(), 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setSaving(false);
    }
  };

  // 完了済みの場合
  if (completed && !saved) {
    return (
      <div className="p-6 sm:p-8">
        <h2 className="text-lg font-bold text-slate-900 mb-2">LINE連携設定</h2>
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-6">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-medium text-green-800">LINE連携は設定済みです</p>
          </div>
          <p className="text-xs text-green-600 mt-1 ml-7">設定を変更する場合は、後から設定ページで編集できます</p>
        </div>
        <StepNavigation onBack={onBack} onNext={onNext} nextLabel="次へ（スキップ）" />
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8">
      <h2 className="text-lg font-bold text-slate-900 mb-1">LINE連携設定</h2>
      <p className="text-sm text-slate-500 mb-6">
        LINE Messaging APIの認証情報を入力してください
      </p>

      {/* 案内バナー */}
      <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <h3 className="text-sm font-medium text-amber-900 mb-2">設定方法</h3>
        <ol className="text-xs text-amber-700 space-y-1 list-decimal list-inside">
          <li>LINE公式アカウントを作成（LINE Official Account Manager）</li>
          <li>LINE Developersコンソールで Messaging API チャネルを作成</li>
          <li>チャネル設定画面から下記の情報をコピーして入力</li>
        </ol>
      </div>

      {/* エラー */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* 保存成功 */}
      {saved && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          設定を保存しました
        </div>
      )}

      {/* フォーム */}
      <div className="space-y-4 mb-8">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Channel Access Token <span className="text-red-500">*</span>
          </label>
          <textarea
            value={channelAccessToken}
            onChange={(e) => setChannelAccessToken(e.target.value)}
            placeholder="長期アクセストークンを貼り付け"
            rows={3}
            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          />
          <p className="mt-1 text-xs text-slate-400">
            LINE Developersコンソール &gt; チャネル設定 &gt; Messaging API設定 から発行
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Channel ID
          </label>
          <input
            type="text"
            value={channelId}
            onChange={(e) => setChannelId(e.target.value)}
            placeholder="例: 1234567890"
            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Channel Secret
          </label>
          <input
            type="password"
            value={channelSecret}
            onChange={(e) => setChannelSecret(e.target.value)}
            placeholder="チャネルシークレット"
            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <StepNavigation
        onBack={onBack}
        onNext={handleSave}
        nextLabel={saving ? "保存中..." : "保存して次へ"}
        nextDisabled={saving || !channelAccessToken.trim()}
        showSkip
        onSkip={onNext}
      />
    </div>
  );
}

// ステップ間ナビゲーション（共通コンポーネント）
function StepNavigation({
  onBack,
  onNext,
  nextLabel = "次へ",
  nextDisabled = false,
  showSkip = false,
  onSkip,
}: {
  onBack: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  showSkip?: boolean;
  onSkip?: () => void;
}) {
  return (
    <div className="flex items-center justify-between pt-6 border-t border-slate-100">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1 px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        戻る
      </button>
      <div className="flex items-center gap-3">
        {showSkip && onSkip && (
          <button
            onClick={onSkip}
            className="px-4 py-2.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            スキップ
          </button>
        )}
        <button
          onClick={onNext}
          disabled={nextDisabled}
          className="inline-flex items-center gap-1 px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          {nextLabel}
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export { StepNavigation };
