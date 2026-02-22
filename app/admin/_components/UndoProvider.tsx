"use client";

// UndoProvider — React Contextでアプリ全体にUndo機能を提供
// showUndoToast(undoId, description) でトースト表示
// Undo履歴一覧も管理

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import UndoToast, { type UndoToastItem } from "./UndoToast";

type UndoContextType = {
  /** トースト表示（操作完了後に呼ぶ） */
  showUndoToast: (undoId: number, description: string) => void;
};

const UndoContext = createContext<UndoContextType | null>(null);

/**
 * Undoコンテキストを使用するフック
 * UndoProvider内でのみ使用可能
 */
export function useUndo(): UndoContextType {
  const ctx = useContext(UndoContext);
  if (!ctx) {
    throw new Error("useUndo は UndoProvider 内で使用してください");
  }
  return ctx;
}

/** 一意ID生成（簡易） */
let idCounter = 0;
function generateId(): string {
  idCounter += 1;
  return `undo-${Date.now()}-${idCounter}`;
}

interface UndoProviderProps {
  children: ReactNode;
}

export default function UndoProvider({ children }: UndoProviderProps) {
  const [toasts, setToasts] = useState<UndoToastItem[]>([]);

  // トースト表示
  const showUndoToast = useCallback(
    (undoId: number, description: string) => {
      const newItem: UndoToastItem = {
        id: generateId(),
        undoId,
        description,
      };
      setToasts((prev) => [...prev, newItem]);
    },
    [],
  );

  // 取り消し実行
  const handleUndo = useCallback(async (undoId: number): Promise<boolean> => {
    try {
      const res = await fetch("/api/admin/undo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ undo_id: undoId }),
      });
      const data = await res.json();
      return data.ok === true;
    } catch {
      return false;
    }
  }, []);

  // トースト消去
  const handleDismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <UndoContext.Provider value={{ showUndoToast }}>
      {children}

      {/* トースト表示エリア（画面下部中央） */}
      {toasts.length > 0 && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col-reverse gap-2 items-center"
          aria-label="通知"
        >
          {toasts.map((toast) => (
            <UndoToast
              key={toast.id}
              item={toast}
              onUndo={handleUndo}
              onDismiss={handleDismiss}
            />
          ))}
        </div>
      )}

      {/* プログレスバーのアニメーション定義 */}
      <style jsx global>{`
        @keyframes undo-progress {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </UndoContext.Provider>
  );
}
