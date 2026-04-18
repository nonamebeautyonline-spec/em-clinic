import { NextRequest, NextResponse } from "next/server";
import { badRequest, unauthorized, serverError } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow, strictWithTenant, tenantPayload } from "@/lib/tenant";
import { pushMessage } from "@/lib/line-messaging";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const REDELIVERY_FEE = 1500;

// 再配送請求を作成 + LINE通知
export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);

  let body: { order_id?: string };
  try {
    body = await req.json();
  } catch {
    return badRequest("不正なリクエストです");
  }

  const orderId = body.order_id;
  if (!orderId) return badRequest("order_id は必須です");

  // 元注文の存在確認 + patient_id取得
  const { data: order } = await strictWithTenant(
    supabaseAdmin
      .from("orders")
      .select("id, patient_id, product_name")
      .eq("id", orderId)
      .maybeSingle(),
    tenantId
  );

  if (!order) return badRequest("注文が見つかりません");

  // 同一注文に対する未決済の再配送請求が既にないかチェック
  const { data: existing } = await strictWithTenant(
    supabaseAdmin
      .from("redeliveries")
      .select("id")
      .eq("original_order_id", orderId)
      .eq("status", "pending")
      .maybeSingle(),
    tenantId
  );

  if (existing) return badRequest("この注文に対する再配送請求が既にあります");

  // 再配送請求をINSERT
  const { data: redelivery, error } = await supabaseAdmin
    .from("redeliveries")
    .insert({
      ...tenantPayload(tenantId),
      patient_id: order.patient_id,
      original_order_id: orderId,
      amount: REDELIVERY_FEE,
      status: "pending",
    })
    .select("id")
    .single();

  if (error || !redelivery) {
    console.error("[redelivery] INSERT失敗:", error?.message);
    return serverError("再配送請求の作成に失敗しました");
  }

  // LINE通知（患者のline_idを取得して送信）
  try {
    const { data: patient } = await strictWithTenant(
      supabaseAdmin
        .from("patients")
        .select("line_id")
        .eq("patient_id", order.patient_id)
        .maybeSingle(),
      tenantId
    );

    if (patient?.line_id) {
      const productLabel = order.product_name || "ご注文商品";
      await pushMessage(patient.line_id, [{
        type: "flex",
        altText: "再配送料のお支払いのお願い",
        contents: {
          type: "bubble",
          body: {
            type: "box",
            layout: "vertical",
            spacing: "md",
            contents: [
              { type: "text", text: "再配送料のお支払い", weight: "bold", size: "lg", color: "#333333" },
              { type: "separator", margin: "lg" },
              { type: "text", text: productLabel, size: "sm", color: "#666666", margin: "lg", wrap: true },
              {
                type: "box", layout: "horizontal", margin: "lg", contents: [
                  { type: "text", text: "再配送料", size: "sm", color: "#666666", flex: 1 },
                  { type: "text", text: `¥${REDELIVERY_FEE.toLocaleString()}`, size: "sm", color: "#333333", weight: "bold", align: "end", flex: 1 },
                ],
              },
              { type: "separator", margin: "lg" },
              { type: "text", text: "マイページよりお支払い手続きをお願いいたします。", size: "xs", color: "#999999", margin: "lg", wrap: true },
            ],
          },
          footer: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "button",
                action: { type: "uri", label: "マイページで支払う", uri: "https://noname-beauty.l-ope.jp/mypage" },
                style: "primary",
                color: "#00B900",
              },
            ],
          },
        },
      }], tenantId ?? undefined);

      // message_log記録
      await supabaseAdmin.from("message_log").insert({
        ...tenantPayload(tenantId),
        patient_id: order.patient_id,
        line_uid: patient.line_id,
        direction: "outgoing",
        event_type: "message",
        message_type: "individual",
        content: `[再配送料請求] ${productLabel} ¥${REDELIVERY_FEE.toLocaleString()}`,
        status: "sent",
        sent_at: new Date().toISOString(),
      });
    }
  } catch (e) {
    console.error("[redelivery] LINE通知失敗:", e);
    // LINE通知失敗でも再配送請求自体は成功扱い
  }

  logAudit(req, "redelivery.create", "redelivery", String(redelivery.id));

  return NextResponse.json({
    ok: true,
    redelivery_id: redelivery.id,
    patient_id: order.patient_id,
    amount: REDELIVERY_FEE,
  });
}
