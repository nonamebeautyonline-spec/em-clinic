// lib/payment-flex.ts
// 決済案内通知のLINE Flexメッセージビルダー + 送信関数
// 配色・文言は管理画面から設定可能（tenant_settings経由）

import { pushMessage } from "@/lib/line-push";
import { supabaseAdmin } from "@/lib/supabase";
import { getFlexConfig } from "@/lib/flex-message/config";
import { DEFAULT_FLEX_CONFIG, getColorsForTab } from "@/lib/flex-message/types";
import { tenantPayload } from "@/lib/tenant";

/** 決済案内 Flex メッセージ */
export async function buildPaymentFlex(tenantId?: string) {
  let cfg = DEFAULT_FLEX_CONFIG;
  try { cfg = await getFlexConfig(tenantId); } catch {}
  const colors = getColorsForTab(cfg, "payment");
  const { payment } = cfg;

  return {
    type: "flex" as const,
    altText: `【${payment.header}】${payment.body}`,
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          { type: "text", text: payment.header, weight: "bold", size: "lg", color: colors.headerText },
        ],
        backgroundColor: colors.headerBg,
        paddingAll: "16px",
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: payment.body,
            size: "sm",
            color: colors.bodyText,
            wrap: true,
          },
        ],
        paddingAll: "16px",
      },
    },
  };
}

/** LINE送信 + message_log 記録 */
export async function sendPaymentNotification(params: {
  patientId: string;
  lineUid: string;
  tenantId?: string;
}): Promise<{ ok: boolean }> {
  const { patientId, lineUid, tenantId } = params;
  const tid = tenantId ?? null;

  try {
    const flex = await buildPaymentFlex(tenantId);
    const res = await pushMessage(lineUid, [flex], tenantId ?? undefined);
    const status = res?.ok ? "sent" : "failed";

    await supabaseAdmin.from("message_log").insert({
      ...tenantPayload(tid),
      patient_id: patientId,
      line_uid: lineUid,
      direction: "outgoing",
      event_type: "message",
      message_type: "payment_notify",
      content: `[${flex.altText}]`,
      flex_json: flex.contents,
      status,
    });

    console.log(`[payment-flex] payment_notify: patient=${patientId}, status=${status}`);
    return { ok: status === "sent" };
  } catch (err) {
    console.error(`[payment-flex] payment_notify error:`, err);
    try {
      await supabaseAdmin.from("message_log").insert({
        ...tenantPayload(tid),
        patient_id: patientId,
        line_uid: lineUid,
        direction: "outgoing",
        event_type: "message",
        message_type: "payment_notify",
        content: "[決済案内通知]",
        status: "failed",
        error_message: String(err),
      });
    } catch {
      // ログ記録失敗は握りつぶす
    }
    return { ok: false };
  }
}
