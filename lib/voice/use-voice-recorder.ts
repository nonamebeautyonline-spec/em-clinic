"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { VOICE_LIMITS } from "@/lib/validations/voice";

export type RecorderState = "idle" | "recording" | "processing" | "error";

interface UseVoiceRecorderOptions {
  maxDurationSec?: number;
  onTranscribed?: (text: string) => void;
}

interface UseVoiceRecorderReturn {
  state: RecorderState;
  /** 録音経過時間（秒） */
  elapsed: number;
  /** 音声レベル（0-1、レベルメーター表示用） */
  audioLevel: number;
  /** エラーメッセージ */
  error: string | null;
  /** 録音開始 */
  startRecording: () => Promise<void>;
  /** 録音停止 → API送信 → テキスト取得 */
  stopRecording: () => void;
  /** エラー状態をリセット */
  reset: () => void;
}

export function useVoiceRecorder(
  options: UseVoiceRecorderOptions = {}
): UseVoiceRecorderReturn {
  const { maxDurationSec = VOICE_LIMITS.MAX_DURATION_SEC, onTranscribed } =
    options;

  const [state, setState] = useState<RecorderState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

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
    mediaRecorderRef.current = null;
    analyserRef.current = null;
    chunksRef.current = [];
    setElapsed(0);
    setAudioLevel(0);
  }, []);

  // コンポーネントアンマウント時にクリーンアップ
  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  // 音声レベル監視
  const monitorAudioLevel = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const update = () => {
      if (!analyserRef.current) return;
      analyserRef.current.getByteFrequencyData(dataArray);
      // RMS計算
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sum / dataArray.length) / 255;
      setAudioLevel(rms);
      animFrameRef.current = requestAnimationFrame(update);
    };
    update();
  }, []);

  // 音声データ → API送信
  const sendToApi = useCallback(
    async (audioBlob: Blob) => {
      setState("processing");
      try {
        const formData = new FormData();
        formData.append("audio", audioBlob, "recording.webm");

        const res = await fetch("/api/voice/transcribe", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `音声認識に失敗しました (${res.status})`);
        }

        const data = await res.json();
        if (data.transcript) {
          onTranscribed?.(data.transcript);
        }
        setState("idle");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "音声認識に失敗しました";
        setError(msg);
        setState("error");
      }
    },
    [onTranscribed]
  );

  // 録音開始
  const startRecording = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // AnalyserNode で音声レベル取得
      const audioCtx = new AudioContext();
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
        cleanup();

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
        sendToApi(blob);
      };

      recorder.start(1000); // 1秒ごとにチャンク
      setState("recording");

      // 経過時間タイマー
      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        const sec = Math.floor((Date.now() - startTime) / 1000);
        setElapsed(sec);
        // 最大録音時間に達したら自動停止
        if (sec >= maxDurationSec) {
          recorder.stop();
        }
      }, 1000);

      // 音声レベル監視開始
      monitorAudioLevel();
    } catch (err) {
      cleanup();
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        setError("マイクへのアクセスが許可されていません。ブラウザの設定を確認してください。");
      } else {
        setError("マイクの初期化に失敗しました。");
      }
      setState("error");
    }
  }, [maxDurationSec, cleanup, sendToApi, monitorAudioLevel]);

  // 録音停止
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  // リセット
  const reset = useCallback(() => {
    cleanup();
    setState("idle");
    setError(null);
  }, [cleanup]);

  return {
    state,
    elapsed,
    audioLevel,
    error,
    startRecording,
    stopRecording,
    reset,
  };
}
