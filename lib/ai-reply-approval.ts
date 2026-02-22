// AI返信の承認Flex Message生成・管理グループ送信

import { getSettingOrEnv } from "@/lib/settings";
import { buildEditUrl } from "@/lib/ai-reply-sign";

const CATEGORY_LABELS: Record<string, string> = {
  operational: "手続き系",
  medical: "医学系",
  other: "その他",
};

/** 時刻付きメッセージ */
export interface TimedMessage {
  content: string;
  sent_at: string;
}

/** 送信時刻ごとに仕切りを入れた患者メッセージのFlex要素を生成 */
function buildPatientMessageContents(
  timedMessages: TimedMessage[]
): Array<Record<string, unknown>> {
  if (timedMessages.length === 0) return [];

  const contents: Array<Record<string, unknown>> = [];
  let lastTimeLabel = "";
  let totalChars = 0;
  const MAX_CHARS = 300;

  for (const msg of timedMessages) {
    // 時刻ラベル生成（HH:mm 形式）
    const timeLabel = formatTimeLabel(msg.sent_at);

    // 前の時刻と異なる場合に仕切りを挿入
    if (timeLabel !== lastTimeLabel) {
      if (contents.length > 0) {
        contents.push({ type: "separator", margin: "sm" });
      }
      contents.push({
        type: "text",
        text: `── ${timeLabel} ──`,
        size: "xxs",
        color: "#999999",
        align: "center",
        margin: contents.length > 0 ? "sm" : "none",
      });
      lastTimeLabel = timeLabel;
    }

    // 文字数上限チェック
    const remaining = MAX_CHARS - totalChars;
    if (remaining <= 0) {
      contents.push({
        type: "text",
        text: "...",
        size: "sm",
        wrap: true,
        margin: "xs",
      });
      break;
    }

    const text = msg.content.length > remaining
      ? msg.content.slice(0, remaining) + "..."
      : msg.content;
    totalChars += msg.content.length;

    contents.push({
      type: "text",
      text,
      size: "sm",
      wrap: true,
      margin: "xs",
    });
  }

  return contents;
}

/** sent_at文字列をHH:mm形式に変換 */
function formatTimeLabel(sentAt: string): string {
  try {
    const d = new Date(sentAt);
    if (isNaN(d.getTime())) return "";
    // 日本時間 (UTC+9)
    const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
    const hh = String(jst.getUTCHours()).padStart(2, "0");
    const mm = String(jst.getUTCMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  } catch {
    return "";
  }
}

/** 管理グループにAI返信案の承認Flex Messageを送信 */
export async function sendApprovalFlexMessage(
  draftId: number,
  patientId: string,
  patientName: string,
  originalMessage: string,
  draftReply: string,
  confidence: number,
  category: string,
  tenantId?: string,
  origin?: string,
  timedMessages?: TimedMessage[]
): Promise<void> {
  const notifyToken = (await getSettingOrEnv(
    "line", "notify_channel_access_token",
    "LINE_NOTIFY_CHANNEL_ACCESS_TOKEN", tenantId
  )) || "";
  const adminGroupId = (await getSettingOrEnv(
    "line", "admin_group_id",
    "LINE_ADMIN_GROUP_ID", tenantId
  )) || "";

  if (!notifyToken || !adminGroupId) {
    console.log("[AI Reply] 承認通知スキップ（設定不足）");
    return;
  }

  // 信頼度を星表示
  const stars = Math.round(confidence * 5);
  const confidenceStars = "★".repeat(stars) + "☆".repeat(5 - stars);
  const categoryLabel = CATEGORY_LABELS[category] || category;

  // 患者メッセージ部分の生成（時刻付きデータがあれば仕切り入り、なければ従来通り）
  const patientMsgContents = timedMessages && timedMessages.length > 0
    ? buildPatientMessageContents(timedMessages)
    : [{
        type: "text",
        text: originalMessage.length > 200
          ? originalMessage.slice(0, 200) + "..."
          : originalMessage,
        size: "sm",
        wrap: true,
        margin: "sm",
      }];

  const flexMessage = {
    type: "flex",
    altText: `【AI返信案】${patientName}`,
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "horizontal",
        contents: [
          {
            type: "text",
            text: "AI返信案",
            weight: "bold",
            size: "lg",
            color: "#7C3AED",
            flex: 1,
          },
          {
            type: "text",
            text: categoryLabel,
            size: "sm",
            color: category === "medical" ? "#DC2626" : "#7C3AED",
            weight: "bold",
            align: "end",
            gravity: "center",
          },
        ],
        backgroundColor: "#F3E8FF",
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: `${patientName} (${patientId})`,
            size: "md",
            weight: "bold",
            wrap: true,
          },
          { type: "separator", margin: "md" },
          {
            type: "text",
            text: "患者メッセージ:",
            size: "sm",
            color: "#666666",
            margin: "md",
          },
          ...patientMsgContents,
          { type: "separator", margin: "md" },
          {
            type: "text",
            text: "AI返信案:",
            size: "sm",
            color: "#7C3AED",
            margin: "md",
            weight: "bold",
          },
          {
            type: "text",
            text: draftReply.length > 300
              ? draftReply.slice(0, 300) + "..."
              : draftReply,
            size: "sm",
            wrap: true,
            margin: "sm",
          },
          {
            type: "text",
            text: `信頼度: ${confidenceStars}`,
            size: "xs",
            color: "#999999",
            margin: "md",
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#7C3AED",
            action: {
              type: "postback",
              label: "承認して送信",
              data: `ai_reply_action=approve&draft_id=${draftId}`,
            },
          },
          ...(origin ? [{
            type: "button" as const,
            style: "primary" as const,
            color: "#2563EB",
            action: {
              type: "uri" as const,
              label: "修正する",
              uri: buildEditUrl(draftId, origin),
            },
          }] : []),
          {
            type: "button",
            style: "secondary",
            action: {
              type: "postback",
              label: "却下",
              data: `ai_reply_action=reject&draft_id=${draftId}`,
            },
          },
        ],
      },
    },
  };

  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${notifyToken}`,
    },
    body: JSON.stringify({
      to: adminGroupId,
      messages: [flexMessage],
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[AI Reply] 承認通知送信失敗:", res.status, body);
  }
}
