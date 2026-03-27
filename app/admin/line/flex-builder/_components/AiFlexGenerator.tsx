"use client";

import { useState } from "react";

interface Props {
  onGenerated: (flexJson: Record<string, unknown>, name: string) => void;
  onCancel: () => void;
}

/** AI Flex Message生成モーダル */
export function AiFlexGenerator({ onGenerated, onCancel }: Props) {
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/line/flex-builder/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "生成に失敗しました");
        return;
      }
      onGenerated(data.flexJson, data.name);
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* ヘッダー */}
        <div className="bg-gradient-to-r from-purple-500 to-violet-600 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
              </svg>
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">AIでFlexメッセージを作成</h2>
              <p className="text-white/70 text-xs">内容や用途を入力するだけで自動生成</p>
            </div>
          </div>
        </div>

        {/* 本文 */}
        <div className="px-6 py-5">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            どんなメッセージを作りたいですか？
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={"例:\n・来週の美容キャンペーン告知、20%OFF、予約ボタン付き\n・施術後のアフターケア案内、注意事項リスト\n・新メニュー紹介カルーセル（3枚）"}
            className="w-full h-32 px-4 py-3 rounded-xl border border-gray-300 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none resize-none text-sm placeholder:text-gray-400"
            disabled={generating}
          />

          {/* ヒント */}
          <div className="mt-3 flex flex-wrap gap-2">
            {["キャンペーン告知", "予約リマインド", "施術後フォロー", "新メニュー紹介"].map((hint) => (
              <button
                key={hint}
                type="button"
                onClick={() => setPrompt((prev) => (prev ? `${prev}\n${hint}` : hint))}
                className="px-3 py-1 text-xs bg-purple-50 text-purple-600 rounded-full hover:bg-purple-100 transition-colors"
                disabled={generating}
              >
                {hint}
              </button>
            ))}
          </div>

          {error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="px-6 py-4 bg-gray-50 flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            disabled={generating}
          >
            キャンセル
          </button>
          <button
            onClick={handleGenerate}
            disabled={!prompt.trim() || generating}
            className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-violet-600 text-white text-sm font-medium rounded-xl hover:from-purple-600 hover:to-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            {generating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                AIで生成
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
