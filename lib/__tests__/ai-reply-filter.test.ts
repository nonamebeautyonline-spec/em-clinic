// lib/__tests__/ai-reply-filter.test.ts — AI返信フィルタテスト

import { shouldProcessWithAI } from "@/lib/ai-reply-filter";

describe("shouldProcessWithAI", () => {
  // --- メッセージタイプ ---

  it("テキスト以外のメッセージ → スキップ", () => {
    const result = shouldProcessWithAI("こんにちは", "image", {});
    expect(result).toEqual({ process: false, reason: "not_text" });
  });

  it("sticker タイプ → スキップ", () => {
    const result = shouldProcessWithAI("test", "sticker", {});
    expect(result).toEqual({ process: false, reason: "not_text" });
  });

  // --- 短すぎるメッセージ ---

  it("4文字のメッセージ → too_short（デフォルト min_message_length=5）", () => {
    const result = shouldProcessWithAI("あいう", "text", {});
    expect(result).toEqual({ process: false, reason: "too_short" });
  });

  it("1文字のメッセージ → too_short", () => {
    const result = shouldProcessWithAI("あ", "text", {});
    expect(result).toEqual({ process: false, reason: "too_short" });
  });

  it("min_message_length カスタム値: 10文字未満 → too_short", () => {
    const result = shouldProcessWithAI("あいうえお", "text", { min_message_length: 10 });
    expect(result).toEqual({ process: false, reason: "too_short" });
  });

  it("min_message_length=3: 3文字以上 → 処理対象", () => {
    const result = shouldProcessWithAI("あいうえお", "text", { min_message_length: 3 });
    expect(result).toEqual({ process: true });
  });

  // --- skipPattern ---

  it.each([
    "はい",
    "いいえ",
    "OK",
    "ok",
    "了解",
    "ありがとう",
    "ありがとうございます",
    "承知",
    "分かりました",
    "わかりました",
    "大丈夫です",
    "お願いします",
    "よろしくお願いします",
  ])("定型応答「%s」→ skip_pattern", (msg) => {
    const result = shouldProcessWithAI(msg, "text", { min_message_length: 1 });
    expect(result).toEqual({ process: false, reason: "skip_pattern" });
  });

  it("絵文字のみ → skip_pattern", () => {
    const result = shouldProcessWithAI("😊😊😊", "text", { min_message_length: 1 });
    expect(result).toEqual({ process: false, reason: "skip_pattern" });
  });

  it("数字のみ → skip_pattern", () => {
    const result = shouldProcessWithAI("12345", "text", {});
    expect(result).toEqual({ process: false, reason: "skip_pattern" });
  });

  // --- 前後の空白トリム ---

  it("前後空白付き定型応答「 はい 」→ skip_pattern", () => {
    const result = shouldProcessWithAI(" はい ", "text", { min_message_length: 1 });
    expect(result).toEqual({ process: false, reason: "skip_pattern" });
  });

  // --- 正常処理対象 ---

  it("通常テキスト → process: true", () => {
    const result = shouldProcessWithAI("予約の変更をお願いしたいのですが", "text", {});
    expect(result).toEqual({ process: true });
  });

  it("質問形式のテキスト → process: true", () => {
    const result = shouldProcessWithAI("診察の予約はいつ空いていますか？", "text", {});
    expect(result).toEqual({ process: true });
  });

  it("定型応答を含む長文 → process: true（完全一致ではない）", () => {
    const result = shouldProcessWithAI("はい、お願いします。明日の予約を取りたいです", "text", {});
    expect(result).toEqual({ process: true });
  });

  it("数字を含む文 → process: true（数字のみではない）", () => {
    const result = shouldProcessWithAI("明日の14時に予約したいです", "text", {});
    expect(result).toEqual({ process: true });
  });
});
