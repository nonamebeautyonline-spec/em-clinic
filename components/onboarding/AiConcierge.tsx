"use client";

// components/onboarding/AiConcierge.tsx — オンボーディングAIコンシェルジュ
// 各ステップで自動表示される解説パネル + 「もっと詳しく」ストリーミング解説

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { OnboardingStep } from "@/lib/onboarding-concierge";

interface AiConciergeProps {
  step: OnboardingStep;
  initialExplanation: string;
}

export function AiConcierge({ step, initialExplanation }: AiConciergeProps) {
  const [showDetail, setShowDetail] = useState(false);
  const [detailText, setDetailText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState("");
  const [hasApiKey, setHasApiKey] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  // コンポーネントunmount時にストリーミング中断
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  // ステップ変更時にリセット
  useEffect(() => {
    setShowDetail(false);
    setDetailText("");
    setError("");
    setIsStreaming(false);
    abortRef.current?.abort();
  }, [step]);

  const handleDetailClick = useCallback(async () => {
    if (isStreaming) return;

    setShowDetail(true);
    setDetailText("");
    setError("");
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/admin/onboarding/concierge/detail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ step }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 500 && data?.error?.includes("未設定")) {
          setHasApiKey(false);
          setShowDetail(false);
        } else {
          setError(data?.error || "詳細の取得に失敗しました");
        }
        setIsStreaming(false);
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6);
          if (payload === "[DONE]") break;
          try {
            const parsed = JSON.parse(payload);
            if (parsed.error) {
              setError(parsed.error);
              break;
            }
            if (parsed.text) {
              setDetailText((prev) => prev + parsed.text);
            }
          } catch {
            // JSONパース失敗は無視
          }
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        // ユーザーによる中断 — エラー表示しない
      } else {
        setError("詳細の取得に失敗しました");
      }
    } finally {
      setIsStreaming(false);
    }
  }, [step, isStreaming]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
      className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg"
    >
      {/* ヘッダー */}
      <div className="flex items-center gap-2 mb-2">
        <svg
          className="w-4 h-4 text-blue-600 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
        <h3 className="text-sm font-medium text-blue-900">セットアップガイド</h3>
      </div>

      {/* 初期解説（静的テキスト） */}
      <p className="text-sm text-blue-800 whitespace-pre-wrap leading-relaxed">
        {initialExplanation}
      </p>

      {/* 「もっと詳しく」ボタン */}
      {hasApiKey && !showDetail && (
        <button
          onClick={handleDetailClick}
          disabled={isStreaming}
          className="mt-3 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          もっと詳しく（AI解説）
        </button>
      )}

      {/* ストリーミング詳細解説 */}
      <AnimatePresence>
        {showDetail && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="mt-3 pt-3 border-t border-blue-100">
              {error ? (
                <p className="text-sm text-red-600">{error}</p>
              ) : (
                <p className="text-sm text-blue-800 whitespace-pre-wrap leading-relaxed">
                  {detailText}
                  {isStreaming && (
                    <motion.span
                      animate={{ opacity: [1, 0] }}
                      transition={{ duration: 0.8, repeat: Infinity }}
                      className="inline-block ml-0.5 text-blue-500"
                    >
                      ▌
                    </motion.span>
                  )}
                  {!isStreaming && !detailText && !error && (
                    <span className="text-blue-400">読み込み中...</span>
                  )}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
