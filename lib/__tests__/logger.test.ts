// lib/__tests__/logger.test.ts — ロガーテスト
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Sentryモック
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

import { logger } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";

describe("logger", () => {
  let consoleSpy: {
    log: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    consoleSpy = {
      log: vi.spyOn(console, "log").mockImplementation(() => {}),
      warn: vi.spyOn(console, "warn").mockImplementation(() => {}),
      error: vi.spyOn(console, "error").mockImplementation(() => {}),
    };
    vi.clearAllMocks();
  });

  afterEach(() => {
    consoleSpy.log.mockRestore();
    consoleSpy.warn.mockRestore();
    consoleSpy.error.mockRestore();
  });

  describe("logger.info", () => {
    it("メッセージをログ出力", () => {
      logger.info("テストメッセージ");
      expect(consoleSpy.log).toHaveBeenCalledOnce();
      const output = consoleSpy.log.mock.calls[0][0];
      expect(output).toContain("INFO");
      expect(output).toContain("テストメッセージ");
    });

    it("コンテキスト付きでログ出力", () => {
      logger.info("操作実行", { route: "/api/test", action: "create" });
      const output = consoleSpy.log.mock.calls[0][0];
      expect(output).toContain("route=");
      expect(output).toContain("action=");
    });
  });

  describe("logger.warn", () => {
    it("警告メッセージをログ出力", () => {
      logger.warn("警告テスト");
      expect(consoleSpy.warn).toHaveBeenCalledOnce();
      const output = consoleSpy.warn.mock.calls[0][0];
      expect(output).toContain("WARN");
    });
  });

  describe("logger.error", () => {
    it("エラーメッセージをログ出力", () => {
      logger.error("エラーテスト");
      expect(consoleSpy.error).toHaveBeenCalledOnce();
      const output = consoleSpy.error.mock.calls[0][0];
      expect(output).toContain("ERROR");
    });

    it("Errorオブジェクト付きでSentryに送信", () => {
      const err = new Error("テストエラー");
      logger.error("エラー発生", err);
      expect(Sentry.captureException).toHaveBeenCalledWith(
        err,
        expect.objectContaining({ extra: expect.any(Object) })
      );
    });

    it("文字列エラーでSentryにメッセージ送信", () => {
      logger.error("エラー発生", "文字列エラー");
      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        expect.stringContaining("文字列エラー"),
        expect.objectContaining({ level: "error" })
      );
    });

    it("エラーなし（undefined）の場合はSentryに送信しない", () => {
      logger.error("単純エラー");
      expect(Sentry.captureException).not.toHaveBeenCalled();
      expect(Sentry.captureMessage).not.toHaveBeenCalled();
    });

    it("コンテキスト付きエラー", () => {
      logger.error("DB接続エラー", new Error("timeout"), {
        route: "/api/test",
        tenantId: "t1",
      });
      expect(consoleSpy.error).toHaveBeenCalledOnce();
      expect(Sentry.captureException).toHaveBeenCalled();
    });
  });

  describe("本番環境フォーマット", () => {
    const origEnv = process.env.NODE_ENV;

    afterEach(() => {
      // @ts-expect-error NODE_ENV書き換え
      process.env.NODE_ENV = origEnv;
    });

    it("本番環境ではJSON形式で出力", () => {
      // @ts-expect-error NODE_ENV書き換え
      process.env.NODE_ENV = "production";
      logger.info("本番テスト", { route: "/api/test" });
      const output = consoleSpy.log.mock.calls[0][0];
      const parsed = JSON.parse(output);
      expect(parsed.level).toBe("info");
      expect(parsed.message).toBe("本番テスト");
      expect(parsed.route).toBe("/api/test");
      expect(parsed.timestamp).toBeTruthy();
    });
  });
});
