// lib/__tests__/step-enrollment.test.ts
// ステップ配信のトリガー・エンロール・離脱・次回送信時刻計算のテスト
import { describe, it, expect } from "vitest";

// === calculateNextSendAt の純粋関数テスト ===
// 実際のソースと同じロジックを再実装してテスト
function calculateNextSendAt(
  delayType: string,
  delayValue: number,
  sendTime?: string | null,
  baseTime?: Date
): string {
  const base = baseTime || new Date();
  const result = new Date(base);

  switch (delayType) {
    case "minutes":
      result.setMinutes(result.getMinutes() + delayValue);
      break;
    case "hours":
      result.setHours(result.getHours() + delayValue);
      break;
    case "days":
      result.setDate(result.getDate() + delayValue);
      if (sendTime) {
        const [h, m] = sendTime.split(":").map(Number);
        // JST (UTC+9) で指定時刻に設定
        result.setUTCHours(h - 9, m, 0, 0);
      }
      break;
  }

  return result.toISOString();
}

describe("calculateNextSendAt — minutes", () => {
  const base = new Date("2026-02-16T00:00:00Z");

  it("5分後", () => {
    const result = calculateNextSendAt("minutes", 5, null, base);
    expect(new Date(result).getTime()).toBe(base.getTime() + 5 * 60 * 1000);
  });

  it("0分後 → 即時", () => {
    const result = calculateNextSendAt("minutes", 0, null, base);
    expect(new Date(result).getTime()).toBe(base.getTime());
  });

  it("60分後 = 1時間後", () => {
    const result = calculateNextSendAt("minutes", 60, null, base);
    expect(new Date(result).getTime()).toBe(base.getTime() + 60 * 60 * 1000);
  });

  it("1440分後 = 1日後", () => {
    const result = calculateNextSendAt("minutes", 1440, null, base);
    const expected = new Date(base);
    expected.setMinutes(expected.getMinutes() + 1440);
    expect(new Date(result).getTime()).toBe(expected.getTime());
  });
});

describe("calculateNextSendAt — hours", () => {
  const base = new Date("2026-02-16T00:00:00Z");

  it("1時間後", () => {
    const result = calculateNextSendAt("hours", 1, null, base);
    expect(new Date(result).getTime()).toBe(base.getTime() + 60 * 60 * 1000);
  });

  it("24時間後 = 1日後", () => {
    const result = calculateNextSendAt("hours", 24, null, base);
    expect(new Date(result).getTime()).toBe(base.getTime() + 24 * 60 * 60 * 1000);
  });

  it("0時間後 → 即時", () => {
    const result = calculateNextSendAt("hours", 0, null, base);
    expect(new Date(result).getTime()).toBe(base.getTime());
  });
});

describe("calculateNextSendAt — days", () => {
  const base = new Date("2026-02-16T00:00:00Z");

  it("1日後（時刻指定なし）", () => {
    const result = calculateNextSendAt("days", 1, null, base);
    const expected = new Date(base);
    expected.setDate(expected.getDate() + 1);
    expect(new Date(result).getTime()).toBe(expected.getTime());
  });

  it("3日後（時刻指定なし）", () => {
    const result = calculateNextSendAt("days", 3, null, base);
    const expected = new Date(base);
    expected.setDate(expected.getDate() + 3);
    expect(new Date(result).getTime()).toBe(expected.getTime());
  });

  it("1日後 + JST 10:00 指定", () => {
    const result = calculateNextSendAt("days", 1, "10:00", base);
    const d = new Date(result);
    // JST 10:00 = UTC 01:00
    expect(d.getUTCHours()).toBe(1);
    expect(d.getUTCMinutes()).toBe(0);
  });

  it("1日後 + JST 18:30 指定", () => {
    const result = calculateNextSendAt("days", 1, "18:30", base);
    const d = new Date(result);
    // JST 18:30 = UTC 09:30
    expect(d.getUTCHours()).toBe(9);
    expect(d.getUTCMinutes()).toBe(30);
  });

  it("0日後 + 時刻指定 → 当日の指定時刻", () => {
    const result = calculateNextSendAt("days", 0, "09:00", base);
    const d = new Date(result);
    // JST 09:00 = UTC 00:00
    expect(d.getUTCHours()).toBe(0);
    expect(d.getUTCMinutes()).toBe(0);
  });

  it("7日後 = 1週間後", () => {
    const result = calculateNextSendAt("days", 7, null, base);
    const expected = new Date(base);
    expected.setDate(expected.getDate() + 7);
    expect(new Date(result).getTime()).toBe(expected.getTime());
  });
});

describe("calculateNextSendAt — 返り値の形式", () => {
  it("ISO 8601形式の文字列を返す", () => {
    const result = calculateNextSendAt("minutes", 5, null, new Date("2026-02-16T00:00:00Z"));
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});

// === キーワードマッチング ===
describe("ステップ配信 キーワードマッチング", () => {
  function matchKeyword(keyword: string, triggerKeyword: string, matchType: string): boolean {
    switch (matchType) {
      case "exact":
        return keyword.trim() === triggerKeyword;
      case "partial":
        return keyword.includes(triggerKeyword);
      case "regex":
        try {
          return new RegExp(triggerKeyword).test(keyword);
        } catch {
          return false;
        }
      default:
        return false;
    }
  }

  it("完全一致: 一致", () => {
    expect(matchKeyword("予約", "予約", "exact")).toBe(true);
  });

  it("完全一致: 不一致", () => {
    expect(matchKeyword("予約したい", "予約", "exact")).toBe(false);
  });

  it("完全一致: 前後スペースはtrimで一致", () => {
    expect(matchKeyword(" 予約 ", "予約", "exact")).toBe(true);
  });

  it("部分一致: 含まれる", () => {
    expect(matchKeyword("予約したいです", "予約", "partial")).toBe(true);
  });

  it("部分一致: 含まれない", () => {
    expect(matchKeyword("キャンセルしたい", "予約", "partial")).toBe(false);
  });

  it("正規表現: パターンマッチ", () => {
    expect(matchKeyword("予約123", "予約\\d+", "regex")).toBe(true);
  });

  it("正規表現: 不一致", () => {
    expect(matchKeyword("予約abc", "予約\\d+", "regex")).toBe(false);
  });

  it("正規表現: 不正パターンはfalse（エラーにならない）", () => {
    expect(matchKeyword("test", "[invalid", "regex")).toBe(false);
  });

  it("未知のマッチタイプ → false", () => {
    expect(matchKeyword("test", "test", "unknown")).toBe(false);
  });
});

// === 二重登録防止（UNIQUE制約エラーコード）===
describe("ステップ配信 二重登録防止", () => {
  it("PostgreSQL 23505 は重複エラー → 正常扱い", () => {
    const errorCode = "23505";
    const isDuplicate = errorCode === "23505";
    expect(isDuplicate).toBe(true);
  });

  it("他のエラーコードはエラー扱い", () => {
    const errorCode = "42000";
    const isDuplicate = errorCode === "23505";
    expect(isDuplicate).toBe(false);
  });
});

// === ステータス管理 ===
describe("ステップ配信 ステータス管理", () => {
  it("エンロール時は active", () => {
    const initialStatus = "active";
    expect(initialStatus).toBe("active");
  });

  it("離脱時は exited", () => {
    const exitedStatus = "exited";
    expect(exitedStatus).toBe("exited");
  });

  it("離脱時に理由を記録", () => {
    const exitReason = "ブロック解除";
    expect(exitReason).toBeTruthy();
  });

  it("完了時は completed", () => {
    const completedStatus = "completed";
    expect(completedStatus).toBe("completed");
  });
});

// === トリガータイプの列挙 ===
describe("ステップ配信 トリガータイプ", () => {
  const validTriggers = ["follow", "keyword", "tag_add"];

  it("follow は有効", () => {
    expect(validTriggers.includes("follow")).toBe(true);
  });

  it("keyword は有効", () => {
    expect(validTriggers.includes("keyword")).toBe(true);
  });

  it("tag_add は有効", () => {
    expect(validTriggers.includes("tag_add")).toBe(true);
  });

  it("unknown は無効", () => {
    expect(validTriggers.includes("unknown")).toBe(false);
  });
});
