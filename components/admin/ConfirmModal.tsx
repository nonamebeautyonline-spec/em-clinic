// 汎用確認モーダル（削除等の破壊的操作の確認に使用）
"use client";

import React from "react";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string | React.ReactNode;
  variant?: "danger" | "default";
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  open,
  title,
  message,
  variant = "default",
  confirmLabel = "実行",
  cancelLabel = "キャンセル",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!open) return null;

  const isDanger = variant === "danger";

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center">
          {/* アイコン */}
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
              isDanger ? "bg-red-50" : "bg-blue-50"
            }`}
          >
            {isDanger ? (
              <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            )}
          </div>

          {/* タイトル */}
          <h3 className="font-bold text-gray-900 mb-1">{title}</h3>

          {/* メッセージ */}
          <div className="text-sm text-gray-500 mb-5">{message}</div>

          {/* ボタン */}
          <div className="flex gap-3 w-full">
            <button
              onClick={onCancel}
              disabled={loading}
              className="flex-1 min-h-[44px] px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 text-sm font-medium transition-colors disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className={`flex-1 min-h-[44px] px-4 py-2.5 text-white rounded-xl text-sm font-medium shadow-lg transition-all disabled:opacity-50 ${
                isDanger
                  ? "bg-red-500 hover:bg-red-600 shadow-red-500/25"
                  : "bg-blue-500 hover:bg-blue-600 shadow-blue-500/25"
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  処理中...
                </span>
              ) : (
                confirmLabel
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
