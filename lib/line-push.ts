// lib/line-push.ts
// LINE Messaging API Push/Multicast 共通関数

import { getSettingOrEnv } from "@/lib/settings";

const LINE_API = "https://api.line.me/v2/bot/message";

// DB優先でトークンを取得（なければ環境変数にフォールバック）
async function getToken(tenantId?: string) {
  return (await getSettingOrEnv("line", "channel_access_token", "LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN", tenantId)) || "";
}

export type LineMessage = {
  type: "text";
  text: string;
} | {
  type: "image";
  originalContentUrl: string;
  previewImageUrl: string;
} | {
  type: "flex";
  altText: string;
  contents: Record<string, unknown>;
} | {
  type: "imagemap";
  baseUrl: string;
  altText: string;
  baseSize: { width: number; height: number };
  actions: Record<string, unknown>[];
};

/**
 * 1人にPush送信
 */
export async function pushMessage(lineUserId: string, messages: LineMessage[], tenantId?: string) {
  const token = await getToken(tenantId);
  if (!token || !lineUserId) {
    console.warn("[LINE Push] Missing token or lineUserId");
    return null;
  }

  const res = await fetch(`${LINE_API}/push`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ to: lineUserId, messages }),
  });

  if (!res.ok) {
    // clone()でボディを保持（呼び出し元でもres.text()できるように）
    const cloned = res.clone();
    const text = await cloned.text().catch(() => "");
    console.error(`[LINE Push] Error ${res.status}:`, text);
  }

  return res;
}

/**
 * 複数人にMulticast送信（最大500人/回）
 */
export async function multicastMessage(lineUserIds: string[], messages: LineMessage[], tenantId?: string) {
  const token = await getToken(tenantId);
  if (!token || lineUserIds.length === 0) {
    console.warn("[LINE Multicast] Missing token or empty recipients");
    return null;
  }

  // 500人ずつ分割
  const results = [];
  for (let i = 0; i < lineUserIds.length; i += 500) {
    const batch = lineUserIds.slice(i, i + 500);
    const res = await fetch(`${LINE_API}/multicast`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ to: batch, messages }),
    });

    if (!res.ok) {
      const cloned = res.clone();
      const text = await cloned.text().catch(() => "");
      console.error(`[LINE Multicast] Error ${res.status}:`, text);
    }
    results.push(res);
  }

  return results;
}

/**
 * タイピングインジケーター（Loading Animation）を表示
 * AI返信生成中やオペレーター入力中に「入力中...」を表示する
 * @param seconds 表示秒数（5〜60、デフォルト20）
 */
export async function showLoadingAnimation(lineUserId: string, seconds = 20, tenantId?: string) {
  const token = await getToken(tenantId);
  if (!token || !lineUserId) return;

  const clampedSeconds = Math.max(5, Math.min(60, seconds));

  const res = await fetch("https://api.line.me/v2/bot/chat/loading/start", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ chatId: lineUserId, loadingSeconds: clampedSeconds }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(`[LINE Loading] Error ${res.status}:`, text);
  }

  return res;
}
