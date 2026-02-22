"use client";

import { useState } from "react";
import { useVoiceRecorder } from "@/lib/voice/use-voice-recorder";

interface VoiceKarteButtonProps {
  /** カルテ生成結果を受け取るコールバック */
  onKarteGenerated: (karteText: string) => void;
}

/** 経過時間を mm:ss 形式にフォーマット */
function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * AIカルテ生成ボタン — 長時間録音 → SOAP形式カルテ自動生成
 * 1. 診察中の会話を録音
 * 2. Deepgram/Groq で文字起こし
 * 3. Claude API で SOAP形式カルテに構造化
 * 4. 生成結果をカルテテキストエリアに挿入
 */
export function VoiceKarteButton({ onKarteGenerated }: VoiceKarteButtonProps) {
  const [generatingKarte, setGeneratingKarte] = useState(false);

  // 音声認識完了後 → SOAP カルテ生成
  async function handleTranscribed(transcript: string) {
    setGeneratingKarte(true);
    try {
      const res = await fetch("/api/voice/generate-karte", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, format: "soap" }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "カルテ生成に失敗しました");
      }

      onKarteGenerated(data.karte);
    } catch (err) {
      const message = err instanceof Error ? err.message : "カルテ生成エラー";
      alert(message);
    } finally {
      setGeneratingKarte(false);
    }
  }

  const { state, elapsed, audioLevel, error, startRecording, stopRecording, reset } =
    useVoiceRecorder({
      onTranscribed: handleTranscribed,
      maxDuration: 300, // 5分
    });

  // カルテ生成中
  if (generatingKarte) {
    return (
      <button
        type="button"
        disabled
        className="px-3 py-1 rounded-full border text-[11px] border-purple-300 bg-purple-50 text-purple-600"
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
          <span>カルテ生成中...</span>
        </span>
      </button>
    );
  }

  // 録音中
  if (state === "recording") {
    return (
      <div className="inline-flex items-center gap-1.5">
        <button
          type="button"
          onClick={stopRecording}
          className="relative px-3 py-1 rounded-full border text-[11px] border-purple-400 bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors"
        >
          <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-purple-500" />
          </span>
          <span className="inline-flex items-center gap-1">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <rect x="9" y="1" width="6" height="14" rx="3" />
              <path d="M19 10a7 7 0 0 1-14 0" />
              <line x1="12" y1="19" x2="12" y2="23" />
            </svg>
            <span>AI録音 {formatTime(elapsed)}</span>
          </span>
        </button>
        <div className="flex items-end gap-[1px] h-4">
          {[0.15, 0.3, 0.5, 0.7, 0.85].map((threshold, i) => (
            <div
              key={i}
              className="w-[3px] rounded-full transition-all duration-75"
              style={{
                height: `${Math.max(20, Math.min(100, audioLevel > threshold ? 100 : 20))}%`,
                backgroundColor: audioLevel > threshold ? "#a855f7" : "#d1d5db",
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  // 処理中（文字起こし中）
  if (state === "processing") {
    return (
      <button
        type="button"
        disabled
        className="px-3 py-1 rounded-full border text-[11px] border-purple-300 bg-purple-50 text-purple-600"
      >
        <span className="inline-flex items-center gap-1">
          <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>文字起こし中...</span>
        </span>
      </button>
    );
  }

  // エラー
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

  // アイドル
  return (
    <button
      type="button"
      onClick={startRecording}
      className="px-3 py-1 rounded-full border text-[11px] border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors"
      title="AIカルテ生成（診察会話を録音してSOAPカルテを自動生成）"
    >
      <span className="inline-flex items-center gap-1">
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
        <span>AIカルテ</span>
      </span>
    </button>
  );
}
