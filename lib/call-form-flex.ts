// lib/call-form-flex.ts — LINE通話フォーム Flex Message ビルダー
import { getFlexConfig } from "@/lib/flex-message/config";
import { DEFAULT_FLEX_CONFIG } from "@/lib/flex-message/types";

/**
 * LINE通話フォーム Flex Message を構築
 * LINEコールURL（lin.ee 短縮URL等）をボタンにセットして送信する
 */
export async function buildCallFormFlex(
  lineCallUrl: string,
  tenantId?: string
): Promise<{ type: "flex"; altText: string; contents: any }> {
  let cfg = DEFAULT_FLEX_CONFIG;
  try {
    cfg = await getFlexConfig(tenantId);
  } catch {}
  const { colors } = cfg;

  return {
    type: "flex" as const,
    altText: "通話リクエスト",
    contents: {
      type: "bubble",
      size: "kilo",
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            contents: [
              {
                type: "box",
                layout: "vertical",
                contents: [
                  {
                    type: "text",
                    text: "📞",
                    size: "lg",
                    align: "center",
                  },
                ],
                width: "36px",
                height: "36px",
                backgroundColor: "#EBF5FF",
                cornerRadius: "18px",
                justifyContent: "center",
                alignItems: "center",
              },
              {
                type: "box",
                layout: "vertical",
                contents: [
                  {
                    type: "text",
                    text: "通話リクエスト",
                    weight: "bold",
                    size: "md",
                    color: "#1a1a1a",
                  },
                  {
                    type: "text",
                    text: "タップして通話を開始できます",
                    size: "xs",
                    color: "#888888",
                    margin: "xs",
                  },
                ],
                flex: 1,
                paddingStart: "12px",
              },
            ],
            alignItems: "center",
          },
        ],
        paddingAll: "16px",
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "button",
            action: {
              type: "uri",
              label: "通話を開始する",
              uri: lineCallUrl,
            },
            style: "primary",
            color: colors.buttonColor || "#06C755",
            height: "sm",
          },
        ],
        paddingAll: "12px",
        paddingTop: "0px",
      },
    },
  };
}
