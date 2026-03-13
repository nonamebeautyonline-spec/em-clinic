"use client";

import type { SWRError } from "@/lib/swr/config";

interface ErrorFallbackProps {
  error: Error | SWRError;
  retry?: () => void;
}

/**
 * 共通エラーUI（SWRのエラーステートで使用）
 * 401はlayout.tsxがリダイレクトするため表示しない
 */
export function ErrorFallback({ error, retry }: ErrorFallbackProps) {
  const status = (error as SWRError).status;
  if (status === 401) return null;

  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-3">
        <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <p className="text-sm text-gray-600 mb-1">データの取得に失敗しました</p>
      {status === 403 && (
        <p className="text-xs text-gray-400 mb-3">アクセス権限がありません</p>
      )}
      {retry && (
        <button
          onClick={retry}
          className="text-sm text-blue-600 hover:text-blue-700 underline underline-offset-2"
        >
          再試行
        </button>
      )}
    </div>
  );
}
