// app/api/square/pay/route.ts — アプリ内決済（Web Payments SDK）
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { badRequest, conflict, forbidden, serverError, tooManyRequests } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { getActiveSquareAccount } from "@/lib/square-account-server";
import { getProductByCode } from "@/lib/products";
import { resolveTenantId, withTenant, tenantPayload } from "@/lib/tenant";
import { normalizeJPPhone } from "@/lib/phone";
import { parseBody } from "@/lib/validations/helpers";
import { inlinePaySchema } from "@/lib/validations/square-pay";
import { createReorderPaymentKarte } from "@/lib/reorder-karte";
import { invalidateDashboardCache } from "@/lib/redis";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { acquireLock } from "@/lib/distributed-lock";
import { verifyPatientSession } from "@/lib/patient-session";
import { isMultiFieldEnabled } from "@/lib/medical-fields";
import {
  ensureSquareCustomer,
  saveCardOnFile,
  createSquarePayment,
  markReorderPaid,
} from "@/lib/payment/square-inline";
import { getBusinessRules } from "@/lib/business-rules";
import { sendPaymentThankNotification } from "@/lib/payment-thank-flex";
import { evaluateTagAutoRules } from "@/lib/tag-auto-rules";
import { hasAddressDuplication } from "@/lib/address-utils";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const tenantId = resolveTenantId(req);
    const tid = tenantId ?? undefined;

    // セッション検証（JWT）
    const session = await verifyPatientSession(req);
    if (!session) return forbidden("認証情報が一致しません");
    const cookiePatientId = session.patientId;

    const parsed = await parseBody(req, inlinePaySchema);
    if ("error" in parsed) return parsed.error;
    const { sourceId, productCode, mode, patientId, reorderId, saveCard, shipping } = parsed.data;

    // 住所の都道府県重複チェック（最終防衛）
    if (shipping?.address && hasAddressDuplication(shipping.address)) {
      return badRequest("住所に都道府県が重複しています。丁目・番地から入力してください。");
    }

    // body の patientId とJWTの patientId の一致を検証（多重防御）
    if (patientId && cookiePatientId !== patientId) {
      return forbidden("認証情報が一致しません");
    }

    // レート制限（同一患者: 5分に5回、同一IP: 5分に10回）
    const ip = getClientIp(req);
    const [patientLimit, ipLimit] = await Promise.all([
      checkRateLimit(`square-pay:patient:${patientId}`, 5, 300),
      checkRateLimit(`square-pay:ip:${ip}`, 10, 300),
    ]);
    if (patientLimit.limited || ipLimit.limited) {
      return tooManyRequests("決済リクエストが多すぎます。しばらくしてから再度お試しください。");
    }

    // 分散ロック: 同一患者・同一商品の同時決済を防止（120秒TTL）
    const lock = await acquireLock(`square-pay:${patientId}:${productCode}`, 120);
    if (!lock.acquired) {
      return conflict("決済処理中です。しばらくお待ちください。");
    }

    try {
    // 二重決済防止: 直近5分以内の同一患者・同一商品の注文チェック
    const { data: recentOrder } = await withTenant(
      supabaseAdmin
        .from("orders")
        .select("id")
        .eq("patient_id", patientId)
        .eq("product_code", productCode)
        .gte("paid_at", new Date(Date.now() - 300_000).toISOString())
        .limit(1),
      tenantId,
    ).maybeSingle();
    if (recentOrder) {
      return conflict("直前に同じ決済が処理されています。マイページで注文状況をご確認ください。");
    }

    // NG患者チェック（既存 checkout と同じロジック）
    // マルチ分野モード: 商品の field_id で NG 判定を分離
    let ngQuery = withTenant(
      supabaseAdmin
        .from("intake")
        .select("status")
        .eq("patient_id", patientId)
        .not("status", "is", null)
        .order("created_at", { ascending: false })
        .limit(1),
      tenantId,
    );
    const multiField = tenantId ? await isMultiFieldEnabled(tenantId) : false;
    if (multiField) {
      const productForField = await getProductByCode(productCode, tid);
      if (productForField?.field_id) {
        ngQuery = ngQuery.eq("field_id", productForField.field_id);
      }
    }
    const { data: intakeRow } = await ngQuery.maybeSingle();
    if (intakeRow?.status === "NG") {
      return forbidden("処方不可と判定されているため、決済できません。再度診察予約をお取りください。");
    }

    // 商品取得
    const product = await getProductByCode(productCode, tid);
    if (!product) {
      return badRequest("無効な商品コードです");
    }

    // Square設定取得
    const sqConfig = await getActiveSquareAccount(tid);
    const accessToken = sqConfig?.accessToken;
    const locationId = sqConfig?.locationId;

    if (!accessToken || !locationId) {
      return serverError("Square設定が不足しています");
    }

    const baseUrl = sqConfig.baseUrl;

    // payment_note（既存webhook互換）
    const noteParts: string[] = [`PID:${patientId}`];
    let productPart = `Product:${productCode}`;
    if (mode) productPart += ` (${mode})`;
    noteParts.push(productPart);
    if (reorderId) noteParts.push(`Reorder:${reorderId}`);
    const paymentNote = noteParts.join(";");

    // sourceId がカードnonce (cnon:) か保存済みcard_id (ccof:) かで分岐
    const isNonce = sourceId.startsWith("cnon:");
    let paySourceId = sourceId;
    let customerId: string | undefined;

    if (isNonce) {
      customerId = (await ensureSquareCustomer(baseUrl, accessToken, patientId, tenantId)) ?? undefined;

      // nonceは1回限り使用可 → 決済を最優先（nonceで決済）
      // カード保存は決済成功後に payment_id から行う（後述）
    } else {
      // 2回目以降: card_id で直接決済
      // customer_id 取得 + カードID所有権検証
      const { data: patient } = await withTenant(
        supabaseAdmin
          .from("patients")
          .select("square_customer_id, square_card_id")
          .eq("patient_id", patientId),
        tenantId,
      ).maybeSingle();
      customerId = patient?.square_customer_id ?? undefined;
      // 保存済みカードIDが当該患者のものか検証
      if (patient?.square_card_id !== sourceId) {
        return forbidden("無効なカード情報です");
      }
    }

    // 冪等性キー: 患者+商品+分単位で生成（Square側の最終防御）
    // 主防御はRedisロック+DB5分チェック。冪等キーは短めにして正当な再試行を許容
    const idempotencyKey = crypto
      .createHash("sha256")
      .update(`${patientId}:${productCode}:${Math.floor(Date.now() / 60000)}`)
      .digest("base64url")
      .substring(0, 45);

    // Payments API 実行
    const payResult = await createSquarePayment(baseUrl, accessToken, {
      sourceId: paySourceId,
      amount: product.price,
      locationId,
      note: paymentNote,
      customerId,
      idempotencyKey,
    });

    if (!payResult.ok) {
      return badRequest(payResult.error || "決済に失敗しました");
    }

    const payment = payResult.payment!;
    const paymentId = payment.id as string;

    // orders INSERT を最優先（webhookが先にINSERTすると配送情報が消失するため）
    const finalPhone = normalizeJPPhone(shipping.phone);
    const postalFormatted = (() => { const d = shipping.postalCode.replace(/[^0-9]/g, ""); return d.length === 7 ? `${d.slice(0, 3)}-${d.slice(3)}` : shipping.postalCode; })();
    const orderData = {
      patient_id: patientId,
      product_code: productCode,
      product_name: product.title,
      amount: product.price,
      paid_at: payment.created_at || new Date().toISOString(),
      shipping_status: "pending" as const,
      payment_status: "COMPLETED",
      payment_method: "credit_card",
      status: "confirmed" as const,
      shipping_name: shipping.name,
      postal_code: postalFormatted,
      address: shipping.address,
      address_detail: shipping.addressDetail || "",
      phone: finalPhone,
      email: shipping.email,
    };
    try {
      const { error: insertErr } = await supabaseAdmin.from("orders").insert({
        id: paymentId,
        ...orderData,
        ...tenantPayload(tenantId),
      });
      if (insertErr) {
        // webhookが先にINSERT済み（23505）→ 配送情報をUPDATEで補完
        if (insertErr.code === "23505") {
          console.warn("[square/pay] orders insert 23505, updating shipping info");
          await withTenant(
            supabaseAdmin.from("orders").update({
              shipping_name: shipping.name,
              postal_code: postalFormatted,
              address: shipping.address,
              address_detail: shipping.addressDetail || "",
              phone: finalPhone,
              email: shipping.email,
            }).eq("id", paymentId),
            tenantId,
          );
        } else {
          console.error("[square/pay] orders insert error:", insertErr);
        }
      }
    } catch (dbErr) {
      console.error("[square/pay] orders insert exception:", dbErr);
    }

    // 決済成功後にカード保存（nonceは決済で消費済みなので payment_id を使う）
    if (isNonce && saveCard && customerId) {
      try {
        const savedCardId = await saveCardOnFile(baseUrl, accessToken, patientId, paymentId, tenantId);
        if (savedCardId) {
          console.log(`[square/pay] card saved after payment: ${savedCardId}`);
        }
      } catch (e) {
        console.error("[square/pay] post-payment card save error (non-fatal):", e);
      }
    }

    // reorder paidマーク + カルテ自動作成
    if (reorderId) {
      await markReorderPaid(reorderId, patientId, tenantId);
      if (patientId && productCode) {
        try {
          await createReorderPaymentKarte(
            patientId,
            productCode,
            new Date().toISOString(),
            undefined,
            tid,
          );
        } catch (e) {
          console.error("[square/pay] karte error:", e);
        }
      }
    }


    // 決済完了サンクスFlex送信（分散ロックで webhook との二重送信を防止）
    const thankLock = await acquireLock(`payment-thank:${paymentId}`, 60);
    if (thankLock.acquired) {
      try {
        const rules = await getBusinessRules(tid);
        if (rules.notifyReorderPaid) {
          const thankMsg = rules.paymentThankMessageCard || "お支払いありがとうございます。発送準備を進めてまいります。";
          const { data: pt } = await withTenant(
            supabaseAdmin.from("patients").select("line_id").eq("patient_id", patientId).maybeSingle(),
            tenantId
          );
          if (pt?.line_id) {
            await sendPaymentThankNotification({
              patientId,
              lineUid: pt.line_id,
              message: thankMsg,
              shipping: {
                shippingName: shipping.name,
                postalCode: shipping.postalCode,
                address: shipping.address,
                phone: finalPhone,
                email: shipping.email,
              },
              paymentMethod: "credit_card",
              productName: product.title,
              amount: product.price,
              tenantId: tid,
            });
          }
        }
      } catch (thankErr) {
        console.error("[square/pay] payment thank message error:", thankErr);
      } finally {
        await thankLock.release();
      }
    }

    // キャッシュ削除
    await invalidateDashboardCache(patientId);

    // タグ自動付与（fire-and-forget）
    evaluateTagAutoRules(patientId, "checkout_completed", tid).catch(() => {});

    return NextResponse.json({
      success: true,
      paymentId,
      receiptUrl: payment.receipt_url,
    });
    } finally {
      await lock.release();
    }
  } catch (err) {
    console.error("[square/pay] error:", err);
    return serverError("決済処理中にエラーが発生しました。時間をおいて再度お試しください。");
  }
}
