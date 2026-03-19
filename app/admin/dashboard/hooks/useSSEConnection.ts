"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { SSEStatus, ToastNotification, RealtimeStats } from "../types";

export function useSSEConnection(
  dateRange: string,
  debouncedLoadStats: () => void,
) {
  const [sseStatus, setSSEStatus] = useState<SSEStatus>("disconnected");
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [realtimeStats, setRealtimeStats] = useState<RealtimeStats>({
    activeAdminSessions: 0,
    todayOutgoingCount: 0,
    todayIncomingCount: 0,
    todayMessageCount: 0,
    todayNewPatients: 0,
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * トースト通知を追加
   */
  const addToast = useCallback(
    (toast: Omit<ToastNotification, "id" | "timestamp">) => {
      const notification: ToastNotification = {
        ...toast,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        timestamp: new Date(),
      };
      setToasts((prev) => [...prev, notification]);

      // 8秒後に自動削除
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== notification.id));
      }, 8000);
    },
    [],
  );

  /**
   * トースト通知を削除
   */
  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  /**
   * SSE接続を開始
   */
  const connectSSE = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    setSSEStatus("connecting");

    const es = new EventSource("/api/admin/dashboard-sse", {
      withCredentials: true,
    });
    eventSourceRef.current = es;

    es.onopen = () => {
      setSSEStatus("connected");
    };

    // 予約更新イベント（デバウンス付きリロード）
    es.addEventListener("reservation_update", (e) => {
      try {
        const data = JSON.parse(e.data);
        debouncedLoadStats();

        const diff = data.diff || 0;
        const cancelDiff = data.cancelDiff || 0;
        if (diff > 0) {
          addToast({
            title: "新しい予約",
            message: `${diff}件の予約が追加されました`,
            type: "reservation",
          });
        }
        if (cancelDiff > 0) {
          addToast({
            title: "予約キャンセル",
            message: `${cancelDiff}件の予約がキャンセルされました`,
            type: "reservation",
          });
        }
      } catch {
        // パースエラーは無視
      }
    });

    // 決済更新イベント
    es.addEventListener("payment_update", (e) => {
      try {
        const data = JSON.parse(e.data);
        debouncedLoadStats();

        const diff = data.diff || 0;
        if (diff > 0) {
          addToast({
            title: "決済完了",
            message: `${diff}件の決済が完了しました`,
            type: "payment",
          });
        }
      } catch {
        // パースエラーは無視
      }
    });

    // 新規患者イベント
    es.addEventListener("new_patient", (e) => {
      try {
        const data = JSON.parse(e.data);
        debouncedLoadStats();

        const diff = data.diff || 0;
        if (diff > 0) {
          addToast({
            title: "新規患者",
            message: `${diff}名の新規患者が登録されました`,
            type: "patient",
          });
        }
      } catch {
        // パースエラーは無視
      }
    });

    // リアルタイム統計更新イベント
    es.addEventListener("stats_update", (e) => {
      try {
        const data = JSON.parse(e.data);
        setRealtimeStats({
          activeAdminSessions: data.activeAdminSessions ?? 0,
          todayOutgoingCount: data.todayOutgoingCount ?? 0,
          todayIncomingCount: data.todayIncomingCount ?? 0,
          todayMessageCount: data.todayMessageCount ?? 0,
          todayNewPatients: data.todayNewPatients ?? 0,
        });
      } catch {
        // パースエラーは無視
      }
    });

    // ping（接続維持 + 初回スナップショットからリアルタイム統計取得）
    es.addEventListener("ping", (e) => {
      setSSEStatus("connected");
      try {
        const data = JSON.parse(e.data);
        if (data.snapshot) {
          setRealtimeStats({
            activeAdminSessions: data.snapshot.activeAdminSessions ?? 0,
            todayOutgoingCount: data.snapshot.todayOutgoingCount ?? 0,
            todayIncomingCount: data.snapshot.todayIncomingCount ?? 0,
            todayMessageCount: data.snapshot.todayMessageCount ?? 0,
            todayNewPatients: data.snapshot.todayNewPatients ?? 0,
          });
        }
      } catch {
        // パースエラーは無視
      }
    });

    // エラー・切断時の再接続
    es.onerror = () => {
      setSSEStatus("connecting");
      es.close();
      eventSourceRef.current = null;

      reconnectTimerRef.current = setTimeout(() => {
        connectSSE();
      }, 3000);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addToast, debouncedLoadStats]);

  /**
   * SSE切断
   */
  const disconnectSSE = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    setSSEStatus("disconnected");
  }, []);

  // SSE接続管理
  useEffect(() => {
    if (dateRange !== "today") {
      disconnectSSE();
      return;
    }

    connectSSE();

    return () => {
      disconnectSSE();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  return {
    sseStatus,
    toasts,
    realtimeStats,
    removeToast,
  };
}
