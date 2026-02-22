"use client";

import { useVoiceRecorder } from "@/lib/voice/use-voice-recorder";

interface VoiceRecordButtonProps {
  /** 音声認識結果を受け取るコールバック */
  onTranscribed: (text: string) => void;
}

/** 経過時間を mm:ss 形式にフォーマット */
function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * 音声入力ボタン — Drカルテ画面の定型文ボタン行に配置
 * 録音 → Deepgram/Groq で文字起こし → テキスト返却
 */
export function VoiceRecordButton({ onTranscribed }: VoiceRecordButtonProps) {
  const { state, elapsed, audioLevel, error, startRecording, stopRecording, reset } =
    useVoiceRecorder({ onTranscribed });

  // 録音中: 赤い点滅 + 停止ボタン
  if (state === "recording") {
    return (
      <div className="inline-flex items-center gap-1.5">
        <button
          type="button"
          onClick={stopRecording}
          className="relative px-3 py-1 rounded-full border text-[11px] border-red-400 bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
        >
          {/* 録音インジケータ（点滅する赤い丸） */}
          <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
          </span>
          {/* 音声レベルバー */}
          <span className="inline-flex items-center gap-1">
            <svg
              className="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <rect x="9" y="1" width="6" height="14" rx="3" />
              <path d="M19 10a7 7 0 0 1-14 0" />
              <line x1="12" y1="19" x2="12" y2="23" />
            </svg>
            <span>{formatTime(elapsed)}</span>
          </span>
        </button>
        {/* 音声レベルインジケータ */}
        <div className="flex items-end gap-[1px] h-4">
          {[0.15, 0.3, 0.5, 0.7, 0.85].map((threshold, i) => (
            <div
              key={i}
              className="w-[3px] rounded-full transition-all duration-75"
              style={{
                height: `${Math.max(20, Math.min(100, audioLevel > threshold ? 100 : 20))}%`,
                backgroundColor: audioLevel > threshold ? "#ef4444" : "#d1d5db",
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  // 処理中: スピナー
  if (state === "processing") {
    return (
      <button
        type="button"
        disabled
        className="px-3 py-1 rounded-full border text-[11px] border-blue-300 bg-blue-50 text-blue-600"
      >
        <span className="inline-flex items-center gap-1">
          <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <span>認識中...</span>
        </span>
      </button>
    );
  }

  // エラー: エラーメッセージ + リセットボタン
  if (state === "error") {
    return (
      <div className="inline-flex items-center gap-1">
        <span className="text-[10px] text-red-500">{error}</span>
        <button
          type="button"
          onClick={reset}
          className="px-2 py-0.5 rounded-full border text-[10px] border-slate-300 hover:bg-slate-50"
        >
          閉じる
        </button>
      </div>
    );
  }

  // アイドル: マイクボタン
  return (
    <button
      type="button"
      onClick={startRecording}
      className="px-3 py-1 rounded-full border text-[11px] border-pink-300 bg-pink-50 text-pink-700 hover:bg-pink-100 transition-colors"
      title="音声入力（クリックして録音開始）"
    >
      <span className="inline-flex items-center gap-1">
        <svg
          className="w-3.5 h-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <rect x="9" y="1" width="6" height="14" rx="3" />
          <path d="M19 10a7 7 0 0 1-14 0" />
          <line x1="12" y1="19" x2="12" y2="23" />
        </svg>
        <span>音声入力</span>
      </span>
    </button>
  );
}
