"use client";

import { useState, useCallback } from "react";
import { useVoiceRecorder } from "@/lib/voice/use-voice-recorder";
import type { SoapNote } from "@/lib/soap-parser";

/** 音声→カルテ生成の状態 */
export type VoiceKarteStep = "idle" | "recording" | "transcribing" | "generating" | "preview" | "error";

/** generate-karte APIレスポンスの型 */
export interface KarteGenerateResult {
  soap: { S: string; O: string; A: string; P: string };
  summary: string;
  medications: string[];
  raw_transcript: string;
}

/** プレビュー用データ */
export interface KartePreview {
  soap: SoapNote;
  summary: string;
  medications: string[];
  transcript: string;
}

interface VoiceKarteInputProps {
  /** SOAP各フィールドへの自動入力コールバック */
  onApply: (soap: SoapNote, meta: { summary: string; medications: string[] }) => void;
  /** 最大録音時間（秒、デフォルト300秒=5分） */
  maxDurationSec?: number;
}

/** 経過時間を mm:ss 形式にフォーマット */
function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** SOAPセクションの表示設定 */
const SOAP_SECTIONS = [
  { key: "s" as const, label: "S（主訴）", color: "border-l-blue-400", bg: "bg-blue-50" },
  { key: "o" as const, label: "O（所見）", color: "border-l-green-400", bg: "bg-green-50" },
  { key: "a" as const, label: "A（評価）", color: "border-l-amber-400", bg: "bg-amber-50" },
  { key: "p" as const, label: "P（計画）", color: "border-l-purple-400", bg: "bg-purple-50" },
] as const;

/**
 * 音声→カルテ自動記入コンポーネント（再利用可能）
 *
 * フロー:
 * 1. マイクボタンで録音開始/停止
 * 2. /api/voice/transcribe に送信してテキスト化
 * 3. /api/voice/generate-karte に送信してSOAP形式生成
 * 4. プレビュー表示 → 確認後に各SOAPフィールドへ反映
 */
export function VoiceKarteInput({
  onApply,
  maxDurationSec = 300,
}: VoiceKarteInputProps) {
  const [step, setStep] = useState<VoiceKarteStep>("idle");
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<KartePreview | null>(null);

  /** 文字起こし完了後 → カルテ生成 */
  const handleTranscribed = useCallback(async (transcript: string) => {
    setStep("generating");
    try {
      const res = await fetch("/api/voice/generate-karte", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, format: "soap" }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || data.message || "カルテ生成に失敗しました");
      }

      // プレビュー表示
      setPreview({
        soap: {
          s: data.soap?.S || data.soap?.s || "",
          o: data.soap?.O || data.soap?.o || "",
          a: data.soap?.A || data.soap?.a || "",
          p: data.soap?.P || data.soap?.p || "",
        },
        summary: data.summary || "",
        medications: data.medications || [],
        transcript,
      });
      setStep("preview");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "カルテ生成に失敗しました";
      setError(msg);
      setStep("error");
    }
  }, []);

  /** useVoiceRecorder: 録音→文字起こしを管理 */
  const recorder = useVoiceRecorder({
    onTranscribed: handleTranscribed,
    maxDurationSec,
  });

  /** 録音開始（useVoiceRecorderに委譲しつつstepも更新） */
  const handleStartRecording = useCallback(async () => {
    setError(null);
    setPreview(null);
    setStep("recording");
    try {
      await recorder.startRecording();
    } catch {
      // useVoiceRecorder内でエラー処理されるため、stepをerrorにする
      if (recorder.state === "error") {
        setError(recorder.error);
        setStep("error");
      }
    }
  }, [recorder]);

  /** 録音停止 → 文字起こし開始 */
  const handleStopRecording = useCallback(() => {
    recorder.stopRecording();
    setStep("transcribing");
  }, [recorder]);

  /** プレビュー内容を確認してSOAPフィールドに反映 */
  const handleApply = useCallback(() => {
    if (!preview) return;
    onApply(preview.soap, {
      summary: preview.summary,
      medications: preview.medications,
    });
    setPreview(null);
    setStep("idle");
  }, [preview, onApply]);

  /** プレビューを破棄して最初に戻る */
  const handleDiscard = useCallback(() => {
    setPreview(null);
    setStep("idle");
  }, []);

  /** エラーをリセット */
  const handleReset = useCallback(() => {
    recorder.reset();
    setError(null);
    setPreview(null);
    setStep("idle");
  }, [recorder]);

  // useVoiceRecorderのstate変更を反映
  // recorderがprocessing（文字起こし中）になった場合
  const recorderState = recorder.state;
  const effectiveStep =
    recorderState === "error" && step !== "error"
      ? "error"
      : recorderState === "processing" && step === "recording"
        ? "transcribing"
        : step;

  // エラーメッセージの同期
  const displayError = error || recorder.error;

  return (
    <div className="space-y-2">
      {/* マイクボタン + 状態表示 */}
      <div className="flex items-center gap-2">
        {/* アイドル状態: 録音開始ボタン */}
        {effectiveStep === "idle" && (
          <button
            type="button"
            onClick={handleStartRecording}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors"
            title="音声からカルテ生成（録音→文字起こし→SOAP自動生成）"
          >
            {/* マイクアイコン */}
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <rect x="9" y="1" width="6" height="14" rx="3" />
              <path d="M19 10a7 7 0 0 1-14 0" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
            <span>音声からカルテ生成</span>
          </button>
        )}

        {/* 録音中: 赤い点滅 + 停止ボタン + 音声レベル */}
        {effectiveStep === "recording" && (
          <div className="inline-flex items-center gap-2">
            <button
              type="button"
              onClick={handleStopRecording}
              className="relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs border-red-400 bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
            >
              {/* 録音中インジケーター（赤い点滅） */}
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
              </span>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <rect x="9" y="1" width="6" height="14" rx="3" />
                <path d="M19 10a7 7 0 0 1-14 0" />
                <line x1="12" y1="19" x2="12" y2="23" />
              </svg>
              <span>録音停止 {formatTime(recorder.elapsed)}</span>
            </button>
            {/* 音声レベルインジケーター */}
            <div className="flex items-end gap-[2px] h-5" role="meter" aria-label="音声レベル">
              {[0.15, 0.3, 0.5, 0.7, 0.85].map((threshold, i) => (
                <div
                  key={i}
                  className="w-[3px] rounded-full transition-all duration-75"
                  style={{
                    height: `${Math.max(20, Math.min(100, recorder.audioLevel > threshold ? 100 : 20))}%`,
                    backgroundColor: recorder.audioLevel > threshold ? "#ef4444" : "#d1d5db",
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* 文字起こし中: スピナー */}
        {effectiveStep === "transcribing" && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs border-blue-300 bg-blue-50 text-blue-600">
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span>音声を文字起こし中...</span>
          </div>
        )}

        {/* カルテ生成中: スピナー */}
        {effectiveStep === "generating" && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs border-purple-300 bg-purple-50 text-purple-600">
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span>SOAPカルテを生成中...</span>
          </div>
        )}

        {/* エラー表示 */}
        {effectiveStep === "error" && (
          <div className="inline-flex items-center gap-2">
            <span className="text-xs text-red-500">{displayError}</span>
            <button
              type="button"
              onClick={handleReset}
              className="px-2 py-1 rounded-full border text-[11px] border-slate-300 hover:bg-slate-50 transition-colors"
            >
              閉じる
            </button>
          </div>
        )}
      </div>

      {/* プレビュー表示 */}
      {effectiveStep === "preview" && preview && (
        <div className="border border-purple-200 rounded-lg bg-white shadow-sm" data-testid="voice-karte-preview">
          {/* ヘッダー */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-purple-100 bg-purple-50 rounded-t-lg">
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <span className="text-xs font-semibold text-purple-700">音声カルテ プレビュー</span>
            </div>
            {preview.summary && (
              <span className="text-[10px] text-purple-500 truncate max-w-[200px]">
                {preview.summary}
              </span>
            )}
          </div>

          {/* SOAP各セクション */}
          <div className="p-3 space-y-2">
            {SOAP_SECTIONS.map(({ key, label, color, bg }) => {
              const value = preview.soap[key];
              if (!value) return null;
              return (
                <div key={key} className={`border-l-4 ${color} ${bg} rounded-r px-3 py-2`}>
                  <div className="text-[10px] font-bold text-slate-500 mb-0.5">{label}</div>
                  <div className="text-xs text-slate-700 whitespace-pre-wrap">{value}</div>
                </div>
              );
            })}

            {/* 抽出された薬剤名 */}
            {preview.medications.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                <span className="text-[10px] text-slate-400">薬剤:</span>
                {preview.medications.map((med, i) => (
                  <span key={i} className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px]">
                    {med}
                  </span>
                ))}
              </div>
            )}

            {/* 元の文字起こしテキスト（折りたたみ） */}
            <details className="mt-2">
              <summary className="text-[10px] text-slate-400 cursor-pointer hover:text-slate-600">
                元の文字起こしテキストを表示
              </summary>
              <div className="mt-1 p-2 bg-slate-50 rounded text-[11px] text-slate-600 whitespace-pre-wrap max-h-32 overflow-auto">
                {preview.transcript}
              </div>
            </details>
          </div>

          {/* アクションボタン */}
          <div className="flex items-center justify-end gap-2 px-3 py-2 border-t border-purple-100 bg-slate-50 rounded-b-lg">
            <button
              type="button"
              onClick={handleDiscard}
              className="px-3 py-1.5 rounded text-xs text-slate-600 hover:bg-slate-200 transition-colors"
            >
              破棄
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-4 py-1.5 rounded bg-purple-600 text-white text-xs hover:bg-purple-700 transition-colors"
              data-testid="voice-karte-apply"
            >
              カルテに反映
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
