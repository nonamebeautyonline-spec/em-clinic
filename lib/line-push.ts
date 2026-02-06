// lib/line-push.ts
// LINE Messaging API Push/Multicast 共通関数

const LINE_API = "https://api.line.me/v2/bot/message";
const TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || process.env.LINE_NOTIFY_CHANNEL_ACCESS_TOKEN || "";

type LineMessage = {
  type: "text";
  text: string;
} | {
  type: "flex";
  altText: string;
  contents: any;
};

/**
 * 1人にPush送信
 */
export async function pushMessage(lineUserId: string, messages: LineMessage[]) {
  if (!TOKEN || !lineUserId) {
    console.warn("[LINE Push] Missing token or lineUserId");
    return null;
  }

  const res = await fetch(`${LINE_API}/push`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TOKEN}`,
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
export async function multicastMessage(lineUserIds: string[], messages: LineMessage[]) {
  if (!TOKEN || lineUserIds.length === 0) {
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
        Authorization: `Bearer ${TOKEN}`,
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
