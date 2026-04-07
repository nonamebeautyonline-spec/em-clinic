// app/api/gmo/3ds-callback/route.ts — GMO 3Dセキュア認証後のコールバック
// GMOが3DS認証完了後にPOSTリダイレクトで呼び出す
import { NextRequest, NextResponse } from "next/server";
import { GmoPaymentProvider } from "@/lib/payment/gmo";
import { supabaseAdmin } from "@/lib/supabase";
import { withTenant, tenantPayload } from "@/lib/tenant";
import { normalizeJPPhone } from "@/lib/phone";
import { markReorderPaid, saveCardViaTradedCard } from "@/lib/payment/gmo-inline";
import { createReorderPaymentKarte } from "@/lib/reorder-karte";
import { invalidateDashboardCache } from "@/lib/redis";
import { getBusinessRules } from "@/lib/business-rules";
import { sendPaymentThankNotification } from "@/lib/payment-thank-flex";
import { evaluateTagAutoRules } from "@/lib/tag-auto-rules";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const params = new URLSearchParams(body);

    const accessId = params.get("AccessID") || "";

    if (!accessId) {
      console.error("[gmo/3ds-callback] Missing AccessID");
      return redirectToError(req, "missing_access_id");
    }

    // pending orderからデータ取得（AccessPassはGMOリダイレクトに含まれないためDBから取得）
    const { data: pending } = await supabaseAdmin
      .from("gmo_pending_orders")
      .select("*")
      .eq("access_id", accessId)
      .gte("expires_at", new Date().toISOString())
      .maybeSingle();

    if (!pending) {
      console.error("[gmo/3ds-callback] No pending order for accessId:", accessId);
      return redirectToError(req, "pending_not_found");
    }

    // SecureTran2 で3DS認証結果を確認（accessPassはDBから取得）
    const gmo = new GmoPaymentProvider(pending.tenant_id ?? undefined);
    const result = await gmo.secureTran2(accessId, pending.access_pass);

    if (result.ErrCode) {
      console.error("[gmo/3ds-callback] SecureTran2 failed:", result.ErrCode, result.ErrInfo);
      // pending削除
      await supabaseAdmin.from("gmo_pending_orders").delete().eq("order_id", pending.order_id);
      return redirectToError(req, "3ds_failed");
    }

    const orderId = pending.order_id;
    const tenantId = pending.tenant_id;
    const tid = tenantId ?? undefined;

    // TradedCard方式: 3DS認証成功後にカード保存（失敗しても決済に影響なし）
    if (pending.save_card) {
      try {
        await saveCardViaTradedCard(pending.patient_id, orderId, tenantId);
      } catch (e) {
        console.error("[gmo/3ds-callback] TradedCard failed (non-critical):", e);
      }
    }

    const shipping = pending.shipping as { name: string; postalCode: string; address: string; addressDetail: string; phone: string; email: string; shippingOptions?: { customSenderName?: string | null; itemNameCosmetics?: boolean; useHexidin?: boolean; postOfficeHold?: boolean; postOfficeName?: string | null } | null } | null;
    const sOpts = shipping?.shippingOptions;

    // orders INSERT
    const finalPhone = shipping ? normalizeJPPhone(shipping.phone) : "";
    const postalFormatted = (() => {
      if (!shipping?.postalCode) return "";
      const d = shipping.postalCode.replace(/[^0-9]/g, "");
      return d.length === 7 ? `${d.slice(0, 3)}-${d.slice(3)}` : shipping.postalCode;
    })();

    try {
      const { error: insertErr } = await supabaseAdmin.from("orders").insert({
        id: orderId,
        patient_id: pending.patient_id,
        product_code: pending.product_code,
        product_name: pending.product_name,
        amount: pending.amount,
        paid_at: new Date().toISOString(),
        shipping_status: "pending" as const,
        payment_status: "COMPLETED",
        payment_method: "credit_card",
        status: "confirmed" as const,
        shipping_name: shipping?.name || "",
        postal_code: postalFormatted,
        address: shipping?.address || "",
        address_detail: shipping?.addressDetail || "",
        phone: finalPhone,
        email: shipping?.email || "",
        custom_sender_name: sOpts?.customSenderName || null,
        item_name_cosmetics: sOpts?.itemNameCosmetics || false,
        use_hexidin: sOpts?.useHexidin || false,
        post_office_hold: sOpts?.postOfficeHold || false,
        post_office_name: sOpts?.postOfficeName || null,
        ...tenantPayload(tenantId),
      });
      if (insertErr) {
        if (insertErr.code === "23505") {
          console.warn("[gmo/3ds-callback] orders 23505, updating shipping");
          if (shipping) {
            await withTenant(
              supabaseAdmin.from("orders").update({
                shipping_name: shipping.name,
                postal_code: postalFormatted,
                address: shipping.address,
                address_detail: shipping.addressDetail || "",
                phone: finalPhone,
                email: shipping.email,
                custom_sender_name: sOpts?.customSenderName || null,
                item_name_cosmetics: sOpts?.itemNameCosmetics || false,
                use_hexidin: sOpts?.useHexidin || false,
                post_office_hold: sOpts?.postOfficeHold || false,
                post_office_name: sOpts?.postOfficeName || null,
              }).eq("id", orderId),
              tenantId,
            );
          }
        } else {
          console.error("[gmo/3ds-callback] orders insert error:", insertErr);
        }
      }
    } catch (dbErr) {
      console.error("[gmo/3ds-callback] orders insert exception:", dbErr);
    }

    // reorder paid化 + カルテ自動作成
    if (pending.reorder_id) {
      await markReorderPaid(pending.reorder_id, pending.patient_id, tenantId);
      try {
        await createReorderPaymentKarte(
          pending.patient_id, pending.product_code, new Date().toISOString(), undefined, tid,
        );
      } catch (e) {
        console.error("[gmo/3ds-callback] karte error:", e);
      }
    }

    // LINE Thanks通知
    try {
      const rules = await getBusinessRules(tid);
      if (rules.notifyReorderPaid && shipping) {
        const thankMsg = rules.paymentThankMessageCard || "お支払いありがとうございます。発送準備を進めてまいります。";
        const { data: pt } = await withTenant(
          supabaseAdmin.from("patients").select("line_id").eq("patient_id", pending.patient_id).maybeSingle(),
          tenantId,
        );
        if (pt?.line_id) {
          await sendPaymentThankNotification({
            patientId: pending.patient_id,
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
            productName: pending.product_name || "",
            amount: pending.amount,
            tenantId: tid,
          });
        }
      }
    } catch (thankErr) {
      console.error("[gmo/3ds-callback] thank message error:", thankErr);
    }

    // キャッシュ削除・タグ自動付与・メニュールール
    await invalidateDashboardCache(pending.patient_id);
    evaluateTagAutoRules(pending.patient_id, "checkout_completed", tid).catch(() => {});
    import("@/lib/menu-auto-rules").then(({ evaluateMenuRules }) =>
      evaluateMenuRules(pending.patient_id, tid).catch(() => {})
    );

    // ポイント自動付与
    try {
      const { processAutoGrant } = await import("@/lib/point-auto-grant");
      await processAutoGrant(tenantId || "", pending.patient_id, orderId, pending.amount);
    } catch (e) {
      console.error("[gmo/3ds-callback] point auto-grant failed:", e);
    }

    // pending order削除
    await supabaseAdmin.from("gmo_pending_orders").delete().eq("order_id", orderId);

    // 完了ページにリダイレクト
    return redirectToComplete(req, pending.product_code);
  } catch (err) {
    console.error("[gmo/3ds-callback] error:", err);
    return redirectToError(req, "server_error");
  }
}

// GETは決済検証できないためエラー扱い
export async function GET(req: NextRequest) {
  return redirectToError(req, "invalid_request");
}

function redirectToComplete(req: NextRequest, productCode: string) {
  const baseUrl = req.nextUrl.origin;
  const url = productCode
    ? `${baseUrl}/mypage/purchase/complete?code=${encodeURIComponent(productCode)}`
    : `${baseUrl}/mypage`;
  return NextResponse.redirect(url, { status: 303 });
}

function redirectToError(req: NextRequest, errorCode: string) {
  const baseUrl = req.nextUrl.origin;
  // XSS防止: ユーザー入力を埋め込まず、エラーコードのみクエリパラメータで渡す
  return NextResponse.redirect(
    `${baseUrl}/mypage?payment_error=${encodeURIComponent(errorCode)}`,
    { status: 303 },
  );
}
