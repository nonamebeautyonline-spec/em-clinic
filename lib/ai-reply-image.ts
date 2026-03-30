// AI返信 Multimodal対応（Phase 3-2）
// LINE画像メッセージのURL取得・Claude Vision対応

import Anthropic from "@anthropic-ai/sdk";

/**
 * LINE画像メッセージのコンテンツURLを生成
 * LINE Messaging APIの /content エンドポイント
 */
export function getLineImageUrl(messageId: string): string {
  return `https://api-data.line.me/v2/bot/message/${messageId}/content`;
}

/**
 * LINE APIから画像をBase64で取得
 */
export async function fetchLineImage(
  messageId: string,
  channelAccessToken: string
): Promise<{ base64: string; mediaType: string } | null> {
  try {
    const url = getLineImageUrl(messageId);
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${channelAccessToken}` },
    });

    if (!res.ok) {
      console.error(`[AI Image] 画像取得失敗: ${res.status}`);
      return null;
    }

    const buffer = await res.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const contentType = res.headers.get("content-type") || "image/jpeg";

    return { base64, mediaType: contentType };
  } catch (err) {
    console.error("[AI Image] 画像取得エラー:", err);
    return null;
  }
}

/**
 * Claude Vision用のマルチモーダルコンテンツを構築
 */
export function buildMultimodalContent(
  textContent: string,
  images: Array<{ base64: string; mediaType: string }>
): Anthropic.ContentBlockParam[] {
  const blocks: Anthropic.ContentBlockParam[] = [];

  // 画像を先に配置
  for (const img of images) {
    blocks.push({
      type: "image",
      source: {
        type: "base64",
        media_type: img.mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
        data: img.base64,
      },
    });
  }

  // テキストコンテンツ
  blocks.push({ type: "text", text: textContent });

  return blocks;
}

/**
 * メッセージから画像URLを抽出（message_log内のimage messageId）
 */
export function extractImageMessageIds(
  messages: Array<{ message_type?: string; content?: string; metadata?: Record<string, unknown> }>
): string[] {
  return messages
    .filter(m => m.message_type === "image" && m.metadata && (m.metadata as Record<string, unknown>).messageId)
    .map(m => (m.metadata as Record<string, string>).messageId);
}
