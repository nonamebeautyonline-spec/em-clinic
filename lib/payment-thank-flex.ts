// lib/payment-thank-flex.ts — 決済完了サンクス Flex Message ビルダー + 送信関数
// クレカ / 銀行振込 で異なるメッセージを送信。配送先情報を表示。

import { pushMessage } from "@/lib/line-push";
import { supabaseAdmin } from "@/lib/supabase";
import { getFlexConfig } from "@/lib/flex-message/config";
import { DEFAULT_FLEX_CONFIG, getColorsForTab } from "@/lib/flex-message/types";
import { tenantPayload } from "@/lib/tenant";
import type { ShippingInfo } from "@/lib/business-rules";

/** 決済完了サンクス Flex（クレカ / 銀行振込 共通） */
export async function buildPaymentThankFlex(params: {
  message: string;
  shipping?: ShippingInfo;
  paymentMethod: "credit_card" | "bank_transfer";
  productName?: string;
  amount?: number;
  tenantId?: string;
}) {
  const { message, shipping, paymentMethod, productName, amount, tenantId } = params;
  let cfg = DEFAULT_FLEX_CONFIG;
  try { cfg = await getFlexConfig(tenantId); } catch {}
  const colors = getColorsForTab(cfg, "payment");

  const headerText = paymentMethod === "bank_transfer" ? "お振込確認完了" : "決済完了";

  // 配送情報の行
  const shippingRows: Record<string, unknown>[] = [];
  if (shipping) {
    const items: [string, string | undefined][] = [
      ["配送名義", shipping.shippingName],
      ["郵便番号", shipping.postalCode],
      ["住所", shipping.address],
      ["電話番号", shipping.phone],
      ["メールアドレス", shipping.email],
    ];
    for (const [label, value] of items) {
      if (!value) continue;
      shippingRows.push({
        type: "box",
        layout: "horizontal",
        contents: [
          { type: "text", text: label, size: "xs", color: "#999999", flex: 0, wrap: false },
          { type: "text", text: value, size: "xs", color: colors.bodyText, flex: 1, wrap: true, align: "end" },
        ],
        margin: "sm",
      });
    }
  }

  const paymentMethodLabel = paymentMethod === "bank_transfer" ? "銀行振込" : "クレジットカード";

  const bodyContents: Record<string, unknown>[] = [];

  // 注文情報ブロック
  const orderRows: [string, string][] = [];
  if (productName) orderRows.push(["商品", productName]);
  if (amount != null && amount > 0) orderRows.push(["金額", `¥${amount.toLocaleString()}`]);
  orderRows.push(["決済方法", paymentMethodLabel]);

  bodyContents.push({
    type: "text",
    text: "ご注文内容",
    size: "sm",
    weight: "bold",
    color: colors.accentColor,
  });
  for (const [label, value] of orderRows) {
    bodyContents.push({
      type: "box",
      layout: "horizontal",
      contents: [
        { type: "text", text: label, size: "xs", color: "#999999", flex: 0, wrap: false },
        { type: "text", text: value, size: "xs", color: colors.bodyText, flex: 1, wrap: true, align: "end" },
      ],
      margin: "sm",
    });
  }
  bodyContents.push({ type: "separator", margin: "lg" });

  // 配送先情報ブロック
  if (shippingRows.length > 0) {
    bodyContents.push({
      type: "text",
      text: "配送先情報",
      size: "sm",
      weight: "bold",
      color: colors.accentColor,
    });
    bodyContents.push(...shippingRows);
    bodyContents.push({
      type: "text",
      text: "配送名義・郵便番号・住所に変更がある場合はマイページから変更が可能です。",
      size: "xxs",
      color: "#999999",
      wrap: true,
      margin: "md",
    });
    bodyContents.push({ type: "separator", margin: "lg" });
  }

  // カスタムメッセージ
  bodyContents.push({
    type: "text",
    text: message,
    size: "sm",
    color: colors.bodyText,
    wrap: true,
    margin: shippingRows.length > 0 ? "lg" : "none",
  });

  return {
    type: "flex" as const,
    altText: `【${headerText}】${message.slice(0, 40)}`,
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          { type: "text", text: headerText, weight: "bold", size: "lg", color: colors.headerText },
        ],
        backgroundColor: colors.headerBg,
        paddingAll: "16px",
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: bodyContents,
        paddingAll: "16px",
      },
    },
  };
}

/** 決済完了サンクス送信 + message_log 記録 */
export async function sendPaymentThankNotification(params: {
  patientId: string;
  lineUid: string;
  message: string;
  shipping?: ShippingInfo;
  paymentMethod: "credit_card" | "bank_transfer";
  productName?: string;
  amount?: number;
  tenantId?: string;
}): Promise<{ ok: boolean }> {
  const { patientId, lineUid, message, shipping, paymentMethod, productName, amount, tenantId } = params;
  const tid = tenantId ?? null;

  try {
    const flex = await buildPaymentThankFlex({ message, shipping, paymentMethod, productName, amount, tenantId });
    const res = await pushMessage(lineUid, [flex], tenantId ?? undefined);
    const status = res?.ok ? "sent" : "failed";

    await supabaseAdmin.from("message_log").insert({
      ...tenantPayload(tid),
      patient_id: patientId,
      line_uid: lineUid,
      direction: "outgoing",
      event_type: "message",
      message_type: "payment_thank",
      content: `[${flex.altText}]`,
      flex_json: flex.contents,
      status,
    });

    console.log(`[payment-thank-flex] ${paymentMethod}: patient=${patientId}, status=${status}`);
    return { ok: status === "sent" };
  } catch (err) {
    console.error(`[payment-thank-flex] error:`, err);
    try {
      await supabaseAdmin.from("message_log").insert({
        ...tenantPayload(tid),
        patient_id: patientId,
        line_uid: lineUid,
        direction: "outgoing",
        event_type: "message",
        message_type: "payment_thank",
        content: "[決済完了サンクス]",
        status: "failed",
        error_message: String(err),
      });
    } catch { /* ignore */ }
    return { ok: false };
  }
}
