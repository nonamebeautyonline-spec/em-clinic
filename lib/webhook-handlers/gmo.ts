// lib/webhook-handlers/gmo.ts — GMO PG Webhook業務ロジック（リプレイ対応）
import { supabaseAdmin } from "@/lib/supabase";
import { invalidateDashboardCache } from "@/lib/redis";
import { createReorderPaymentKarte } from "@/lib/reorder-karte";
import { withTenant, tenantPayload } from "@/lib/tenant";
import { evaluateMenuRules } from "@/lib/menu-auto-rules";
import { getBusinessRules } from "@/lib/business-rules";
import { pushMessage } from "@/lib/line-push";

/** 再処方を決済済みに更新 */
async function markReorderPaid(reorderId: string, patientId: string | undefined, tenantId: string | null) {
  const idNum = Number(String(reorderId).trim());
  if (!Number.isFinite(idNum) || idNum < 2) {
    console.error("[gmo/handler] invalid reorderId for paid:", reorderId);
    return;
  }

  try {
    const paidPayload = { status: "paid" as const, paid_at: new Date().toISOString() };

    let query = withTenant(
      supabaseAdmin
        .from("reorders")
        .update(paidPayload)
        .eq("reorder_number", idNum)
        .eq("status", "confirmed"),
      tenantId,
    );
    if (patientId) query = query.eq("patient_id", patientId);

    const { data: updated, error: dbError } = await query.select("id");

    if (dbError) {
      console.error("[gmo/handler] reorder paid error:", dbError);
    } else if (updated && updated.length > 0) {
      console.log(`[gmo/handler] reorder paid (reorder_number), row=${idNum}`);
    } else {
      let fallback = withTenant(
        supabaseAdmin
          .from("reorders")
          .update(paidPayload)
          .eq("id", idNum)
          .eq("status", "confirmed"),
        tenantId,
      );
      if (patientId) fallback = fallback.eq("patient_id", patientId);

      const { data: fb, error: fbErr } = await fallback.select("id");
      if (fbErr) {
        console.error("[gmo/handler] reorder paid fallback error:", fbErr);
      } else if (fb && fb.length > 0) {
        console.log(`[gmo/handler] reorder paid (id fallback), id=${idNum}`);
      } else {
        console.warn(`[gmo/handler] reorder paid: no rows matched (reorder_num=${idNum})`);
      }
    }
  } catch (dbErr) {
    console.error("[gmo/handler] reorder paid exception:", dbErr);
  }
}

export interface GmoHandlerParams {
  status: string;
  orderId: string;
  amount: string;
  accessId: string;
  patientId: string;
  productCode: string;
  productName: string; // ClientField2
  reorderId: string;
  tenantId: string | null;
}

/**
 * GMO Webhook業務ロジック（リプレイ可能）
 * 署名検証・冪等チェックの外側で呼ぶ純粋な業務処理
 */
export async function processGmoEvent(params: GmoHandlerParams): Promise<void> {
  const { status, orderId, amount, accessId, patientId, productCode, productName, reorderId, tenantId } = params;
  const paymentId = accessId || orderId;

  // ---- 決済完了（CAPTURE / SALES） ----
  if (status === "CAPTURE" || status === "SALES") {
    const amountNum = amount ? parseFloat(amount) : 0;
    const paidAt = new Date().toISOString();

    if (reorderId) {
      await markReorderPaid(reorderId, patientId, tenantId);
      if (patientId && productCode) {
        try {
          await createReorderPaymentKarte(patientId, productCode, paidAt, undefined, tenantId ?? undefined);
        } catch (karteErr) {
          console.error("[gmo/handler] reorder payment karte error:", karteErr);
        }
      }
      // 決済完了サンクスメッセージ送信
      if (patientId) {
        try {
          const rules = await getBusinessRules(tenantId ?? undefined);
          if (rules.paymentThankMessage) {
            const { data: pt } = await withTenant(
              supabaseAdmin.from("patients").select("line_id").eq("patient_id", patientId).maybeSingle(),
              tenantId
            );
            if (pt?.line_id) {
              const pushRes = await pushMessage(pt.line_id, [{ type: "text", text: rules.paymentThankMessage }], tenantId ?? undefined);
              if (pushRes?.ok) {
                await supabaseAdmin.from("message_log").insert({
                  ...tenantPayload(tenantId),
                  patient_id: patientId,
                  line_uid: pt.line_id,
                  direction: "outgoing",
                  event_type: "message",
                  message_type: "text",
                  content: rules.paymentThankMessage,
                  status: "sent",
                });
              }
            }
          }
        } catch (thankErr) {
          console.error("[gmo/handler] payment thank message error:", thankErr);
        }
      }
    }

    if (patientId) {
      try {
        const { data: existingOrder } = await withTenant(
          supabaseAdmin
            .from("orders")
            .select("id, tracking_number")
            .eq("id", paymentId)
            .maybeSingle(),
          tenantId,
        );

        if (existingOrder) {
          const { error } = await withTenant(
            supabaseAdmin
              .from("orders")
              .update({
                patient_id: patientId,
                product_code: productCode || null,
                product_name: productName || null,
                amount: amountNum,
                paid_at: paidAt,
                payment_status: "COMPLETED",
                payment_method: "credit_card",
                status: "confirmed",
              })
              .eq("id", paymentId),
            tenantId,
          );
          if (error) console.error("[gmo/handler] orders update failed:", error);
        } else {
          const { error } = await supabaseAdmin.from("orders").insert({
            ...tenantPayload(tenantId),
            id: paymentId,
            patient_id: patientId,
            product_code: productCode || null,
            product_name: productName || null,
            amount: amountNum,
            paid_at: paidAt,
            shipping_status: "pending",
            payment_status: "COMPLETED",
            payment_method: "credit_card",
            status: "confirmed",
          });
          if (error) console.error("[gmo/handler] orders insert failed:", error);
        }
      } catch (err) {
        console.error("[gmo/handler] orders Supabase error:", err);
      }

      await invalidateDashboardCache(patientId);
      evaluateMenuRules(patientId, tenantId ?? undefined).catch(() => {});
    }
    return;
  }

  // ---- 返金（RETURN / RETURNX） ----
  if (status === "RETURN" || status === "RETURNX") {
    const refundedAmount = amount ? parseFloat(amount) : null;
    try {
      const { error: updateErr } = await withTenant(
        supabaseAdmin
          .from("orders")
          .update({
            refund_status: "COMPLETED",
            refunded_amount: refundedAmount,
            refunded_at: new Date().toISOString(),
            status: "refunded",
          })
          .eq("id", paymentId),
        tenantId,
      );
      if (updateErr) console.error("[gmo/handler] refund update failed:", updateErr);
    } catch (e) {
      console.error("[gmo/handler] refund Supabase error:", e);
    }
    if (patientId) await invalidateDashboardCache(patientId);
    return;
  }

  // ---- キャンセル（CANCEL / VOID） ----
  if (status === "CANCEL" || status === "VOID") {
    try {
      const { error: updateErr } = await withTenant(
        supabaseAdmin
          .from("orders")
          .update({
            refund_status: "CANCELLED",
            refunded_at: new Date().toISOString(),
            status: "refunded",
          })
          .eq("id", paymentId),
        tenantId,
      );
      if (updateErr) console.error("[gmo/handler] cancel update failed:", updateErr);
    } catch (e) {
      console.error("[gmo/handler] cancel Supabase error:", e);
    }
    if (patientId) await invalidateDashboardCache(patientId);
    return;
  }

  console.warn("[gmo/handler] 未対応ステータス:", status, { orderId });
}
