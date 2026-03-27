"use client";

import { useState, useRef, useEffect } from "react";
import { MediaPickerModal } from "./MediaPickerModal";

interface AttachedImage {
  url: string;
  name: string;
}

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
  const [attachedImages, setAttachedImages] = useState<AttachedImage[]>([]);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
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
    if ((!prompt.trim() && attachedImages.length === 0) || generating) return;
    setGenerating(true);
    setError(null);

    try {
      const imageUrls = attachedImages.map((img) => img.url);
      const res = await fetch("/api/admin/line/flex-builder/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim() || (imageUrls.length > 0 ? "添付画像を使ってFlexメッセージを作成して" : ""),
          imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
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
      setAttachedImages([]);
      onGenerated(data.flexJson, data.name);
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setGenerating(false);
    }
  };

  // IME変換中フラグ
  const composingRef = useRef(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (composingRef.current) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "ArrowUp" && !prompt && lastPrompt) {
      setPrompt(lastPrompt);
    }
  };

  const removeImage = (index: number) => {
    setAttachedImages((prev) => prev.filter((_, i) => i !== index));
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

      {/* 添付画像プレビュー */}
      {attachedImages.length > 0 && (
        <div className="mb-2 flex items-center gap-2 flex-wrap">
          {attachedImages.map((img, i) => (
            <div key={i} className="relative group">
              <img
                src={img.url}
                alt={img.name}
                className="w-12 h-12 rounded-lg object-cover border border-purple-200"
              />
              <button
                onClick={() => removeImage(i)}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
          <span className="text-[10px] text-purple-500">{attachedImages.length}枚添付</span>
        </div>
      )}

      <div className="flex items-center gap-2">
        {/* AIアイコン */}
        <div className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${generating ? "bg-purple-100 animate-pulse" : "bg-purple-50"}`}>
          <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
        </div>

        {/* 画像添付ボタン */}
        <button
          onClick={() => setShowMediaPicker(true)}
          disabled={generating}
          className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center bg-gray-50 hover:bg-purple-50 text-gray-400 hover:text-purple-500 transition-colors disabled:opacity-40"
          title="メディアから画像を添付"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>

        {/* 入力フィールド */}
        <input
          ref={inputRef}
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => { composingRef.current = true; }}
          onCompositionEnd={() => { composingRef.current = false; }}
          placeholder={
            attachedImages.length > 0
              ? "画像の使い方を指示...（例: この画像をヘッダーに配置）"
              : currentFlexJson
                ? "AIに指示して修正...（例: ヘッダーを赤に / ボタン追加 / カルーセル3枚に）"
                : "AIに指示してFlexメッセージを作成...（例: キャンペーン告知、予約リマインド）"
          }
          className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-400 placeholder:text-gray-400"
          disabled={generating}
        />

        {/* 送信ボタン */}
        <button
          onClick={handleSubmit}
          disabled={(!prompt.trim() && attachedImages.length === 0) || generating}
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

        <span className="flex-shrink-0 text-[10px] text-gray-300 hidden md:block">
          {"\u2318"}K
        </span>
      </div>

      {/* メディア選択モーダル */}
      {showMediaPicker && (
        <MediaPickerModal
          onSelect={(url) => {
            // URLからファイル名を抽出
            const name = url.split("/").pop()?.split("?")[0] || "image";
            setAttachedImages((prev) => [...prev, { url, name }]);
            setShowMediaPicker(false);
            inputRef.current?.focus();
          }}
          onClose={() => setShowMediaPicker(false)}
        />
      )}
    </div>
  );
}
