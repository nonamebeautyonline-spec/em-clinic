"use client";

import { useState, useRef, useEffect } from "react";

interface Props {
  /** 現在のFlex JSON（編集モード時に渡す） */
  currentFlexJson: Record<string, unknown> | null;
  /** AI生成完了コールバック */
  onGenerated: (flexJson: Record<string, unknown>, name: string) => void;
}

/** エディタ画面下部に常設するAI指示入力バー */
export function AiCommandBar({ currentFlexJson, onGenerated }: Props) {
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastPrompt, setLastPrompt] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cmd+K でフォーカス
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSubmit = async () => {
    if (!prompt.trim() || generating) return;
    setGenerating(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/line/flex-builder/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          ...(currentFlexJson ? { currentFlexJson } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "生成に失敗しました");
        return;
      }
      setLastPrompt(prompt);
      setPrompt("");
      onGenerated(data.flexJson, data.name);
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    // 上矢印で前回のプロンプトを復元
    if (e.key === "ArrowUp" && !prompt && lastPrompt) {
      setPrompt(lastPrompt);
    }
  };

  return (
    <div className="flex-shrink-0 border-t border-gray-200 bg-white px-4 py-2.5">
      {error && (
        <div className="mb-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 flex items-center gap-2">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      <div className="flex items-center gap-2">
        {/* AIアイコン */}
        <div className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${generating ? "bg-purple-100 animate-pulse" : "bg-purple-50"}`}>
          <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
        </div>

        {/* 入力フィールド */}
        <input
          ref={inputRef}
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={currentFlexJson ? "AIに指示して修正...（例: ヘッダーを赤に / ボタン追加 / カルーセル3枚に）" : "AIに指示してFlexメッセージを作成...（例: キャンペーン告知、予約リマインド）"}
          className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-400 placeholder:text-gray-400"
          disabled={generating}
        />

        {/* 送信ボタン */}
        <button
          onClick={handleSubmit}
          disabled={!prompt.trim() || generating}
          className="flex-shrink-0 px-3 py-1.5 bg-purple-500 text-white text-sm rounded-lg hover:bg-purple-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
        >
          {generating ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span className="text-xs">生成中</span>
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              <span className="text-xs">送信</span>
            </>
          )}
        </button>

        {/* ショートカットヒント */}
        <span className="flex-shrink-0 text-[10px] text-gray-300 hidden md:block">
          {"\u2318"}K
        </span>
      </div>
    </div>
  );
}
