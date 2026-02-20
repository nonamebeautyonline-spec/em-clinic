// AI返信処理前のフィルタリング

interface AiReplyFilterSettings {
  min_message_length?: number;
}

/** AI処理対象かどうかを判定 */
export function shouldProcessWithAI(
  message: string,
  messageType: string,
  settings: AiReplyFilterSettings
): { process: boolean; reason?: string } {
  // テキストメッセージ以外はスキップ
  if (messageType !== "text") return { process: false, reason: "not_text" };

  // 短すぎるメッセージはスキップ
  if (message.length < (settings.min_message_length || 5)) {
    return { process: false, reason: "too_short" };
  }

  // 明らかに応答不要なパターン
  const skipPatterns = [
    /^(はい|いいえ|OK|ok|了解|ありがとう|ありがとうございます|承知|分かりました|わかりました|大丈夫です|お願いします|よろしくお願いします)$/,
    /^[\p{Emoji_Presentation}\p{Extended_Pictographic}]+$/u, // 絵文字のみ
    /^\d+$/, // 数字のみ
  ];
  for (const pattern of skipPatterns) {
    if (pattern.test(message.trim())) {
      return { process: false, reason: "skip_pattern" };
    }
  }

  return { process: true };
}
