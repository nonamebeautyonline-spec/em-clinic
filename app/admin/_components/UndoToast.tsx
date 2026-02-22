"use client";

// UndoToast — 操作完了時に画面下部に表示するトースト
// 「取り消す」ボタン付き、5秒後に自動フェードアウト

import { useState, useEffect, useCallback, useRef } from "react";

export type UndoToastItem = {
  id: string; // 一意キー（表示管理用）
  undoId: number; // undo_history.id
  description: string; // 表示メッセージ（例: "カルテを更新しました"）
};

type ToastState = "visible" | "undoing" | "undone" | "fading";

interface UndoToastProps {
  item: UndoToastItem;
  onUndo: (undoId: number) => Promise<boolean>;
  onDismiss: (id: string) => void;
}

/** 自動消去までの時間（ミリ秒） */
const AUTO_DISMISS_MS = 5000;
/** フェードアウトアニメーション時間（ミリ秒） */
const FADE_DURATION_MS = 300;

export default function UndoToast({ item, onUndo, onDismiss }: UndoToastProps) {
  const [state, setState] = useState<ToastState>("visible");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  // 自動消去タイマー
  const startDismissTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setState("fading");
      setTimeout(() => onDismiss(item.id), FADE_DURATION_MS);
    }, AUTO_DISMISS_MS);
  }, [item.id, onDismiss]);

  useEffect(() => {
    startDismissTimer();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [startDismissTimer]);

  // 取り消しボタン
  const handleUndo = async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setState("undoing");

    const success = await onUndo(item.undoId);
    if (success) {
      setState("undone");
      // 取り消し成功後、2秒で消去
      setTimeout(() => {
        setState("fading");
        setTimeout(() => onDismiss(item.id), FADE_DURATION_MS);
      }, 2000);
    } else {
      // 失敗時は元に戻してタイマー再開
      setState("visible");
      startDismissTimer();
    }
  };

  // 閉じるボタン
  const handleClose = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setState("fading");
    setTimeout(() => onDismiss(item.id), FADE_DURATION_MS);
  };

  const isFading = state === "fading";

  return (
    <div
      className={`
        flex items-center gap-3 bg-slate-800 text-white rounded-lg shadow-lg
        px-4 py-3 min-w-[320px] max-w-[480px]
        transition-all duration-300
        ${isFading ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"}
      `}
      role="status"
      aria-live="polite"
    >
      {/* アイコン + メッセージ */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {state === "undone" ? (
          <>
            <span className="text-blue-400 shrink-0" aria-hidden="true">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a5 5 0 015 5v2M3 10l4-4m-4 4l4 4" />
              </svg>
            </span>
            <span className="text-sm truncate">操作を取り消しました</span>
          </>
        ) : (
          <>
            <span className="text-green-400 shrink-0" aria-hidden="true">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </span>
            <span className="text-sm truncate">{item.description}</span>
          </>
        )}
      </div>

      {/* アクションボタン */}
      <div className="flex items-center gap-2 shrink-0">
        {state === "visible" && (
          <button
            onClick={handleUndo}
            className="text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors px-2 py-1 rounded hover:bg-slate-700"
          >
            取り消す
          </button>
        )}
        {state === "undoing" && (
          <span className="text-sm text-slate-400">処理中...</span>
        )}

        {/* 閉じるボタン */}
        {state !== "undone" && (
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-white transition-colors p-1 rounded hover:bg-slate-700"
            aria-label="閉じる"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* プログレスバー（取り消し可能時のみ表示） */}
      {state === "visible" && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-700 rounded-b-lg overflow-hidden">
          <div
            ref={progressRef}
            className="h-full bg-blue-500 rounded-b-lg"
            style={{
              animation: `undo-progress ${AUTO_DISMISS_MS}ms linear forwards`,
            }}
          />
        </div>
      )}
    </div>
  );
}
