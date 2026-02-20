// AI返信の承認Flex Message生成・管理グループ送信

import { getSettingOrEnv } from "@/lib/settings";

const CATEGORY_LABELS: Record<string, string> = {
  operational: "手続き系",
  medical: "医学系",
  other: "その他",
};

/** 管理グループにAI返信案の承認Flex Messageを送信 */
export async function sendApprovalFlexMessage(
  draftId: number,
  patientId: string,
  patientName: string,
  originalMessage: string,
  draftReply: string,
  confidence: number,
  category: string,
  tenantId?: string
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
          {
            type: "text",
            text: originalMessage.length > 200
              ? originalMessage.slice(0, 200) + "..."
              : originalMessage,
            size: "sm",
            wrap: true,
            margin: "sm",
          },
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
        layout: "horizontal",
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
