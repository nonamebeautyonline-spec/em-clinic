// 再配送料の決済API（Square/GMO対応）
import { NextRequest, NextResponse } from "next/server";
import { badRequest, unauthorized, serverError, forbidden, conflict } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyPatientSession } from "@/lib/patient-session";
import { resolveTenantId, withTenant, tenantPayload } from "@/lib/tenant";
import { getSettingOrEnv } from "@/lib/settings";
import { pushMessage } from "@/lib/line-push";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // 患者認証
  const session = await verifyPatientSession(req);
  if (!session) return unauthorized();
  const { patientId } = session;

  const tenantId = resolveTenantId(req);
  const tid = tenantId ?? undefined;

  let body: { redeliveryId?: number; sourceId?: string; token?: string; useSavedCard?: boolean };
  try {
    body = await req.json();
  } catch {
    return badRequest("不正なリクエストです");
  }

  const { redeliveryId, sourceId, token, useSavedCard } = body;
  if (!redeliveryId) return badRequest("redeliveryId は必須です");

  // 再配送請求の存在・所有者確認
  const { data: rd } = await withTenant(
    supabaseAdmin
      .from("redeliveries")
      .select("id, patient_id, original_order_id, amount, status")
      .eq("id", redeliveryId)
      .maybeSingle(),
    tenantId
  );

  if (!rd) return badRequest("再配送請求が見つかりません");
  if (rd.patient_id !== patientId) return forbidden("この請求へのアクセス権がありません");
  if (rd.status !== "pending") return conflict("この再配送料は既に決済済みです");

  const amount = rd.amount;

  // 決済プロバイダー判定
  const provider = await getSettingOrEnv("payment", "provider", "PAYMENT_PROVIDER", tid) || "square";

  try {
    let paymentId = "";

    if (provider === "gmo") {
      // GMO決済
      const { createGmoPayment, createGmoPaymentWithSavedCard, getGmoSavedCard } = await import("@/lib/payment/gmo-inline");

      let gmoResult: { ok: boolean; orderId?: string; error?: string; needs3ds?: boolean; acsUrl?: string };

      if (useSavedCard) {
        const saved = await getGmoSavedCard(patientId, tenantId);
        if (!saved.hasCard || !saved.cardSeq) {
          return serverError("保存済みカードが見つかりません");
        }
        gmoResult = await createGmoPaymentWithSavedCard({
          memberId: patientId,
          cardSeq: saved.cardSeq,
          amount,
          patientId,
          productCode: "REDELIVERY_FEE",
          mode: "redelivery",
          reorderId: String(redeliveryId),
          tenantId,
        });
      } else {
        gmoResult = await createGmoPayment({
          token: token || sourceId || "",
          amount,
          patientId,
          productCode: "REDELIVERY_FEE",
          mode: "redelivery",
          reorderId: String(redeliveryId),
          tenantId,
        });
      }

      if (!gmoResult.ok) {
        if (gmoResult.needs3ds && gmoResult.acsUrl) {
          return NextResponse.json({ needs3ds: true, acsUrl: gmoResult.acsUrl });
        }
        return serverError(gmoResult.error || "GMO決済に失敗しました");
      }
      paymentId = gmoResult.orderId || "";
    } else {
      // Square決済
      const { getActiveSquareAccount } = await import("@/lib/square-account-server");
      const { ensureSquareCustomer } = await import("@/lib/payment/square-inline");
      const sqConfig = await getActiveSquareAccount(tid);
      if (!sqConfig?.accessToken || !sqConfig?.locationId) {
        return serverError("Square設定が不足しています");
      }

      const nonce = sourceId || token || "";
      const customerId = (await ensureSquareCustomer(sqConfig.baseUrl, sqConfig.accessToken, patientId, tenantId)) ?? undefined;

      const idempotencyKey = `redelivery-${redeliveryId}-${Date.now()}`;
      const payRes = await fetch(`${sqConfig.baseUrl}/v2/payments`, {
        method: "POST",
        headers: {
          "Square-Version": "2024-01-18",
          Authorization: `Bearer ${sqConfig.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source_id: nonce,
          idempotency_key: idempotencyKey,
          amount_money: { amount: amount, currency: "JPY" },
          location_id: sqConfig.locationId,
          ...(customerId ? { customer_id: customerId } : {}),
          note: `PID:${patientId};Product:REDELIVERY_FEE;Redelivery:${redeliveryId}`,
          autocomplete: true,
        }),
      });

      const payData = await payRes.json();
      if (!payRes.ok || payData.errors) {
        console.error("[redelivery/pay] Square error:", JSON.stringify(payData.errors));
        return serverError("カード決済に失敗しました。別のカードをお試しください。");
      }
      paymentId = payData.payment?.id || "";
    }

    // 決済成功 → ordersにINSERT + redeliveries更新
    const orderId = `redelivery-${redeliveryId}-${Date.now()}`;
    const now = new Date().toISOString();

    await supabaseAdmin.from("orders").insert({
      ...tenantPayload(tenantId),
      id: orderId,
      patient_id: patientId,
      product_code: "REDELIVERY_FEE",
      product_name: "再配送料",
      amount,
      payment_method: "credit_card",
      payment_status: "paid",
      paid_at: now,
      status: "confirmed",
      shipping_status: "pending",
      created_at: now,
    });

    await withTenant(
      supabaseAdmin
        .from("redeliveries")
        .update({ status: "paid", paid_order_id: orderId, paid_at: now })
        .eq("id", redeliveryId),
      tenantId
    );

    // LINE通知（決済完了）
    try {
      const { data: patient } = await withTenant(
        supabaseAdmin.from("patients").select("line_id").eq("patient_id", patientId).maybeSingle(),
        tenantId
      );
      if (patient?.line_id) {
        await pushMessage(patient.line_id, [{
          type: "text",
          text: `再配送料 ¥${amount.toLocaleString()} のお支払いが完了しました。再配送の手配を進めさせていただきます。`,
        }], tid);
      }
    } catch (e) {
      console.error("[redelivery/pay] LINE通知失敗:", e);
    }

    return NextResponse.json({ ok: true, orderId, paymentId });
  } catch (e) {
    console.error("[redelivery/pay] error:", e);
    return serverError("決済処理中にエラーが発生しました");
  }
}
