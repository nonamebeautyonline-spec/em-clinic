"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { VOICE_LIMITS } from "@/lib/validations/voice";
import {
  drawFrequencyBars,
  drawStaticBars,
  formatElapsedTime,
  DEFAULT_THEME,
  type WaveformTheme,
} from "@/lib/voice/waveform-utils";

/**
 * VoiceRecorder コンポーネントの Props
 */
export interface VoiceRecorderProps {
  /** 録音完了時のコールバック（Blobを返す） */
  onRecordingComplete: (blob: Blob) => void;
  /** 波形のカラーテーマ */
  theme?: Partial<WaveformTheme>;
  /** 最大録音時間（秒、デフォルト: 300） */
  maxDurationSec?: number;
  /** Canvas の幅（px、デフォルト: 300） */
  canvasWidth?: number;
  /** Canvas の高さ（px、デフォルト: 80） */
  canvasHeight?: number;
  /** 波形バー数（デフォルト: 32） */
  barCount?: number;
}

type RecorderState = "idle" | "recording" | "stopped" | "error";

/**
 * 音声録音コンポーネント（波形リアルタイム表示付き）
 *
 * AnalyserNode + Canvas で録音中の音声波形を周波数バーでリアルタイム描画。
 * 録音停止後は最後の波形を静止表示し、onRecordingComplete で Blob を返す。
 */
export function VoiceRecorder({
  onRecordingComplete,
  theme: themeProp,
  maxDurationSec = VOICE_LIMITS.MAX_DURATION_SEC,
  canvasWidth = 300,
  canvasHeight = 80,
  barCount = 32,
}: VoiceRecorderProps) {
  const mergedTheme: WaveformTheme = { ...DEFAULT_THEME, ...themeProp };

  const [state, setState] = useState<RecorderState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastFrequencyDataRef = useRef<Uint8Array | null>(null);

  // クリーンアップ
  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    mediaRecorderRef.current = null;
    analyserRef.current = null;
    chunksRef.current = [];
  }, []);

  // アンマウント時クリーンアップ
  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  // 波形アニメーションループ
  const startWaveformAnimation = useCallback(() => {
    const update = () => {
      const analyser = analyserRef.current;
      const canvas = canvasRef.current;
      if (!analyser || !canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(dataArray);

      // 最後のデータを保存（停止後の静止表示用）
      lastFrequencyDataRef.current = new Uint8Array(dataArray);

      drawFrequencyBars(
        ctx,
        dataArray,
        canvas.width,
        canvas.height,
        mergedTheme,
        barCount
      );

      animFrameRef.current = requestAnimationFrame(update);
    };
    update();
  }, [mergedTheme, barCount]);

  // 録音開始
  const startRecording = useCallback(async () => {
    setError(null);
    lastFrequencyDataRef.current = null;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // AudioContext + AnalyserNode
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });

        // 停止後の静止波形描画
        const canvas = canvasRef.current;
        if (canvas && lastFrequencyDataRef.current) {
          const ctx = canvas.getContext("2d");
          if (ctx) {
            drawStaticBars(
              ctx,
              lastFrequencyDataRef.current,
              canvas.width,
              canvas.height,
              mergedTheme,
              barCount
            );
          }
        }

        // ストリーム・タイマー解放（Canvas はそのまま）
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        if (animFrameRef.current) {
          cancelAnimationFrame(animFrameRef.current);
          animFrameRef.current = null;
        }
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
        if (audioCtxRef.current) {
          audioCtxRef.current.close().catch(() => {});
          audioCtxRef.current = null;
        }
        mediaRecorderRef.current = null;
        analyserRef.current = null;
        chunksRef.current = [];

        if (blob.size > VOICE_LIMITS.MAX_FILE_SIZE) {
          setError("録音データが大きすぎます。短めに録音してください。");
          setState("error");
          return;
        }
        if (blob.size < 100) {
          setError("録音データが空です。マイクを確認してください。");
          setState("error");
          return;
        }

        setState("stopped");
        onRecordingComplete(blob);
      };

      recorder.start(1000);
      setState("recording");
      setElapsed(0);

      // 経過時間タイマー
      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        const sec = Math.floor((Date.now() - startTime) / 1000);
        setElapsed(sec);
        if (sec >= maxDurationSec) {
          recorder.stop();
        }
      }, 1000);

      // 波形アニメーション開始
      startWaveformAnimation();
    } catch (err) {
      cleanup();
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        setError(
          "マイクへのアクセスが許可されていません。ブラウザの設定を確認してください。"
        );
      } else {
        setError("マイクの初期化に失敗しました。");
      }
      setState("error");
    }
  }, [
    maxDurationSec,
    cleanup,
    onRecordingComplete,
    startWaveformAnimation,
    mergedTheme,
    barCount,
  ]);

  // 録音停止
  const stopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
    }
  }, []);

  // リセット（idle に戻す）
  const resetRecorder = useCallback(() => {
    cleanup();
    setState("idle");
    setElapsed(0);
    setError(null);
    lastFrequencyDataRef.current = null;
    // Canvas クリア
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [cleanup]);

  return (
    <div className="flex flex-col items-center gap-3">
      {/* 波形キャンバス */}
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={canvasHeight}
        className="rounded-lg border border-slate-200"
        style={{ width: canvasWidth, height: canvasHeight }}
        data-testid="waveform-canvas"
      />

      {/* 録音時間表示 */}
      {(state === "recording" || state === "stopped") && (
        <div
          className="text-sm font-mono text-slate-600"
          data-testid="elapsed-time"
        >
          {formatElapsedTime(elapsed)}
        </div>
      )}

      {/* エラー表示 */}
      {state === "error" && error && (
        <div className="text-xs text-red-500" data-testid="error-message">
          {error}
        </div>
      )}

      {/* ボタン */}
      <div className="flex items-center gap-2">
        {state === "idle" && (
          <button
            type="button"
            onClick={startRecording}
            className="px-4 py-2 rounded-full bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors"
            data-testid="start-button"
          >
            録音開始
          </button>
        )}

        {state === "recording" && (
          <button
            type="button"
            onClick={stopRecording}
            className="px-4 py-2 rounded-full bg-slate-700 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
            data-testid="stop-button"
          >
            <span className="inline-flex items-center gap-1.5">
              {/* 録音中インジケータ */}
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
              </span>
              録音停止
            </span>
          </button>
        )}

        {(state === "stopped" || state === "error") && (
          <button
            type="button"
            onClick={resetRecorder}
            className="px-4 py-2 rounded-full border border-slate-300 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
            data-testid="reset-button"
          >
            リセット
          </button>
        )}
      </div>
    </div>
  );
}
