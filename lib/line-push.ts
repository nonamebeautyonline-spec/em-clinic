// lib/line-push.ts
// LINE Messaging API Push/Multicast 共通関数

import { getSettingOrEnv } from "@/lib/settings";

const LINE_API = "https://api.line.me/v2/bot/message";

// DB優先でトークンを取得（なければ環境変数にフォールバック）
async function getToken(tenantId?: string) {
  return (await getSettingOrEnv("line", "channel_access_token", "LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN", tenantId)) || "";
}

type LineMessage = {
  type: "text";
  text: string;
} | {
  type: "image";
  originalContentUrl: string;
  previewImageUrl: string;
} | {
  type: "flex";
  altText: string;
  contents: any;
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
    const text = await res.text().catch(() => "");
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
      const text = await res.text().catch(() => "");
      console.error(`[LINE Multicast] Error ${res.status}:`, text);
    }
    results.push(res);
  }

  return results;
}
