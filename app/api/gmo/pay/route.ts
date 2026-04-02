// app/api/gmo/pay/route.ts — GMOインライン決済（トークン型）
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { badRequest, conflict, forbidden, serverError, tooManyRequests } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { getProductByCode } from "@/lib/products";
import { resolveTenantId, withTenant, tenantPayload } from "@/lib/tenant";
import { normalizeJPPhone } from "@/lib/phone";
import { parseBody } from "@/lib/validations/helpers";
import { gmoInlinePaySchema } from "@/lib/validations/gmo-pay";
import { createReorderPaymentKarte } from "@/lib/reorder-karte";
import { invalidateDashboardCache } from "@/lib/redis";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { acquireLock } from "@/lib/distributed-lock";
import { verifyPatientSession } from "@/lib/patient-session";
import { isMultiFieldEnabled } from "@/lib/medical-fields";
import {
  createGmoPayment,
  createGmoPaymentWithSavedCard,
  ensureGmoMember,
  saveGmoCard,
  getGmoSavedCard,
  markReorderPaid,
} from "@/lib/payment/gmo-inline";
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

    const parsed = await parseBody(req, gmoInlinePaySchema);
    if ("error" in parsed) return parsed.error;
    const { token, useSavedCard, productCode, mode, patientId, reorderId, saveCard, shipping } = parsed.data;

    // トークンか保存カードのいずれかが必要
    if (!useSavedCard && !token) {
      return badRequest("カード情報が不足しています");
    }

    // 住所の都道府県重複チェック
    if (shipping?.address && hasAddressDuplication(shipping.address)) {
      return badRequest("住所に都道府県が重複しています。丁目・番地から入力してください。");
    }

    // body の patientId とJWTの patientId の一致を検証
    if (patientId && cookiePatientId !== patientId) {
      return forbidden("認証情報が一致しません");
    }

    // レート制限
    const ip = getClientIp(req);
    const [patientLimit, ipLimit] = await Promise.all([
      checkRateLimit(`gmo-pay:patient:${patientId}`, 5, 300),
      checkRateLimit(`gmo-pay:ip:${ip}`, 10, 300),
    ]);
    if (patientLimit.limited || ipLimit.limited) {
      return tooManyRequests("決済リクエストが多すぎます。しばらくしてから再度お試しください。");
    }

    // 分散ロック
    const lock = await acquireLock(`gmo-pay:${patientId}:${productCode}`, 120);
    if (!lock.acquired) {
      return conflict("決済処理中です。しばらくお待ちください。");
    }

    try {
    // 二重決済防止
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

    // NG患者チェック
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

    // 3DS認証後の戻りURL
    const origin = req.headers.get("origin") || req.nextUrl.origin;
    const tdsRetUrl = `${origin}/api/gmo/3ds-callback`;

    // GMO決済実行
    let payResult;
    if (useSavedCard) {
      // 保存済みカードで決済
      const savedCard = await getGmoSavedCard(patientId, tenantId);
      if (!savedCard.hasCard || !savedCard.cardSeq) {
        return badRequest("保存済みカードが見つかりません");
      }
      const memberId = await ensureGmoMember(patientId, tenantId);
      payResult = await createGmoPaymentWithSavedCard({
        memberId,
        cardSeq: savedCard.cardSeq,
        amount: product.price,
        patientId,
        productCode,
        mode,
        reorderId: reorderId ?? undefined,
        tenantId,
        retUrl: tdsRetUrl,
      });
    } else {
      // 新規トークンで決済
      // GMOトークンは1回限りなので、カード保存する場合は先にSaveCardしてから保存済みカードで決済
      if (saveCard && token) {
        try {
          const cardSeq = await saveGmoCard(patientId, token, tenantId);
          if (cardSeq) {
            // 保存成功 → 保存済みカードで決済実行
            const memberId = await ensureGmoMember(patientId, tenantId);
            payResult = await createGmoPaymentWithSavedCard({
              memberId,
              cardSeq,
              amount: product.price,
              patientId,
              productCode,
              mode,
              reorderId: reorderId ?? undefined,
              tenantId,
              retUrl: tdsRetUrl,
            });
          } else {
            // カード保存失敗 → トークンで直接決済（カード保存は諦める）
            payResult = await createGmoPayment({
              token: token!,
              amount: product.price,
              patientId,
              productCode,
              mode,
              reorderId: reorderId ?? undefined,
              tenantId,
              retUrl: tdsRetUrl,
            });
          }
        } catch (e) {
          console.error("[gmo/pay] saveCard before payment failed, fallback to token:", e);
          payResult = await createGmoPayment({
            token: token!,
            amount: product.price,
            patientId,
            productCode,
            mode,
            reorderId: reorderId ?? undefined,
            tenantId,
            retUrl: tdsRetUrl,
          });
        }
      } else {
        // カード保存不要 → トークンで直接決済
        payResult = await createGmoPayment({
          token: token!,
          amount: product.price,
          patientId,
          productCode,
          mode,
          reorderId: reorderId ?? undefined,
          tenantId,
          retUrl: tdsRetUrl,
        });
      }
    }

    if (!payResult.ok) {
      // 3DS認証が必要な場合 → pending orderを保存してからリダイレクトURLを返す
      if (payResult.needs3ds && payResult.acsUrl) {
        const pendingNonce = crypto.randomBytes(16).toString("hex");
        const { error: pendingErr } = await supabaseAdmin.from("gmo_pending_orders").insert({
          order_id: payResult.orderId,
          access_id: payResult.accessId,
          access_pass: payResult.accessPass,
          patient_id: patientId,
          product_code: productCode,
          product_name: product.title,
          amount: product.price,
          mode: mode || null,
          reorder_id: reorderId || null,
          nonce: pendingNonce,
          shipping: {
            name: shipping.name,
            postalCode: shipping.postalCode,
            address: shipping.address,
            addressDetail: shipping.addressDetail || "",
            phone: shipping.phone,
            email: shipping.email,
          },
          ...tenantPayload(tenantId),
        });
        if (pendingErr) {
          console.error("[gmo/pay] pending order save error:", pendingErr);
          return serverError("決済の一時保存に失敗しました。再度お試しください。");
        }
        return NextResponse.json({
          success: false,
          needs3ds: true,
          acsUrl: payResult.acsUrl,
          orderId: payResult.orderId,
        });
      }
      return badRequest(payResult.error || "決済に失敗しました");
    }

    const orderId = payResult.orderId!;

    // orders INSERT
    const finalPhone = normalizeJPPhone(shipping.phone);
    const postalFormatted = (() => { const d = shipping.postalCode.replace(/[^0-9]/g, ""); return d.length === 7 ? `${d.slice(0, 3)}-${d.slice(3)}` : shipping.postalCode; })();
    try {
      const { error: insertErr } = await supabaseAdmin.from("orders").insert({
        id: orderId,
        patient_id: patientId,
        product_code: productCode,
        product_name: product.title,
        amount: product.price,
        paid_at: new Date().toISOString(),
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
        ...tenantPayload(tenantId),
      });
      if (insertErr) {
        if (insertErr.code === "23505") {
          console.warn("[gmo/pay] orders insert 23505, updating shipping info");
          await withTenant(
            supabaseAdmin.from("orders").update({
              shipping_name: shipping.name,
              postal_code: postalFormatted,
              address: shipping.address,
              address_detail: shipping.addressDetail || "",
              phone: finalPhone,
              email: shipping.email,
            }).eq("id", orderId),
            tenantId,
          );
        } else {
          console.error("[gmo/pay] orders insert error:", insertErr);
        }
      }
    } catch (dbErr) {
      console.error("[gmo/pay] orders insert exception:", dbErr);
    }

    // reorder paidマーク + カルテ自動作成
    if (reorderId) {
      await markReorderPaid(reorderId, patientId, tenantId);
      if (patientId && productCode) {
        try {
          await createReorderPaymentKarte(patientId, productCode, new Date().toISOString(), undefined, tid);
        } catch (e) {
          console.error("[gmo/pay] karte error:", e);
        }
      }
    }

    // 決済完了サンクスFlex送信
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
      console.error("[gmo/pay] payment thank message error:", thankErr);
    }

    // キャッシュ削除
    await invalidateDashboardCache(patientId);

    // タグ自動付与
    evaluateTagAutoRules(patientId, "checkout_completed", tid).catch(() => {});

    // リッチメニュー自動切り替え
    import("@/lib/menu-auto-rules").then(({ evaluateMenuRules }) =>
      evaluateMenuRules(patientId, tid).catch(() => {})
    );

    // ポイント自動付与
    try {
      const { processAutoGrant } = await import("@/lib/point-auto-grant");
      await processAutoGrant(tenantId || "", patientId, orderId, product.price);
    } catch (e) {
      console.error("[gmo/pay] point auto-grant failed:", e);
    }

    return NextResponse.json({ success: true, orderId });
    } finally {
      await lock.release();
    }
  } catch (err) {
    console.error("[gmo/pay] error:", err);
    return serverError("決済処理中にエラーが発生しました。時間をおいて再度お試しください。");
  }
}
