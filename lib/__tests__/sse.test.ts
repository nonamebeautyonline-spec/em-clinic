// lib/__tests__/sse.test.ts — SSEユーティリティテスト
import { describe, it, expect } from "vitest";
import {
  formatSSEEvent,
  createPingEvent,
  detectChanges,
  SSE_HEADERS,
  SSE_CONFIG,
  type SSEEvent,
  type DashboardSnapshot,
} from "@/lib/sse";

describe("sse", () => {
  describe("formatSSEEvent", () => {
    it("SSEプロトコル形式にフォーマット", () => {
      const event: SSEEvent = {
        type: "ping",
        data: { message: "test" },
        timestamp: "2026-02-22T00:00:00.000Z",
      };
      const result = formatSSEEvent(event);
      expect(result).toContain("event: ping");
      expect(result).toContain('data: {"message":"test"}');
      // 空行で終端
      expect(result.endsWith("\n\n")).toBe(true);
    });

    it("reservation_updateイベントをフォーマット", () => {
      const event: SSEEvent = {
        type: "reservation_update",
        data: { reservationCount: 10, diff: 1 },
        timestamp: "2026-02-22T00:00:00.000Z",
      };
      const result = formatSSEEvent(event);
      expect(result).toContain("event: reservation_update");
      expect(result).toContain('"reservationCount":10');
    });
  });

  describe("createPingEvent", () => {
    it("pingイベントを生成", () => {
      const event = createPingEvent();
      expect(event.type).toBe("ping");
      expect(event.data.message).toBe("keep-alive");
      expect(event.timestamp).toBeTruthy();
    });

    it("ISOタイムスタンプを含む", () => {
      const event = createPingEvent();
      expect(() => new Date(event.timestamp)).not.toThrow();
    });
  });

  describe("detectChanges", () => {
    const baseSnapshot: DashboardSnapshot = {
      reservationCount: 10,
      cancelledCount: 2,
      paidCount: 5,
      newPatientCount: 3,
      latestReservationAt: "2026-02-22T00:00:00Z",
      latestPaidAt: "2026-02-22T00:00:00Z",
      latestPatientAt: "2026-02-22T00:00:00Z",
    };

    it("変更なしの場合は空配列", () => {
      const events = detectChanges(baseSnapshot, { ...baseSnapshot });
      expect(events).toHaveLength(0);
    });

    it("予約数の変更を検出", () => {
      const current = { ...baseSnapshot, reservationCount: 11 };
      const events = detectChanges(baseSnapshot, current);
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe("reservation_update");
      expect(events[0].data.diff).toBe(1);
    });

    it("キャンセル数の変更を検出", () => {
      const current = { ...baseSnapshot, cancelledCount: 3 };
      const events = detectChanges(baseSnapshot, current);
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe("reservation_update");
      expect(events[0].data.cancelDiff).toBe(1);
    });

    it("決済数の変更を検出", () => {
      const current = { ...baseSnapshot, paidCount: 7 };
      const events = detectChanges(baseSnapshot, current);
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe("payment_update");
      expect(events[0].data.diff).toBe(2);
    });

    it("新規患者の変更を検出", () => {
      const current = { ...baseSnapshot, newPatientCount: 5 };
      const events = detectChanges(baseSnapshot, current);
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe("new_patient");
      expect(events[0].data.diff).toBe(2);
    });

    it("複数の変更を同時に検出", () => {
      const current = {
        ...baseSnapshot,
        reservationCount: 15,
        paidCount: 10,
        newPatientCount: 8,
      };
      const events = detectChanges(baseSnapshot, current);
      expect(events).toHaveLength(3);
      const types = events.map(e => e.type);
      expect(types).toContain("reservation_update");
      expect(types).toContain("payment_update");
      expect(types).toContain("new_patient");
    });

    it("減少も検出する", () => {
      const current = { ...baseSnapshot, paidCount: 3 };
      const events = detectChanges(baseSnapshot, current);
      expect(events).toHaveLength(1);
      expect(events[0].data.diff).toBe(-2);
    });
  });

  describe("SSE_HEADERS", () => {
    it("正しいContent-Typeを設定", () => {
      expect(SSE_HEADERS["Content-Type"]).toBe("text/event-stream");
    });

    it("キャッシュ無効化", () => {
      expect(SSE_HEADERS["Cache-Control"]).toContain("no-cache");
    });

    it("keep-alive接続", () => {
      expect(SSE_HEADERS.Connection).toBe("keep-alive");
    });
  });

  describe("SSE_CONFIG", () => {
    it("ポーリング間隔が設定されている", () => {
      expect(SSE_CONFIG.POLL_INTERVAL_MS).toBe(30_000);
    });

    it("キープアライブ間隔が設定されている", () => {
      expect(SSE_CONFIG.KEEPALIVE_INTERVAL_MS).toBe(25_000);
    });

    it("ストリーム最大寿命が55秒", () => {
      expect(SSE_CONFIG.MAX_STREAM_DURATION_MS).toBe(55_000);
    });
  });
});
