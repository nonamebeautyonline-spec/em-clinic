// app/api/square/pay/route.ts — アプリ内決済（Web Payments SDK）
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSettingOrEnv } from "@/lib/settings";
import { getProductByCode } from "@/lib/products";
import { resolveTenantId, withTenant, tenantPayload } from "@/lib/tenant";
import { normalizeJPPhone } from "@/lib/phone";
import { parseBody } from "@/lib/validations/helpers";
import { inlinePaySchema } from "@/lib/validations/square-pay";
import { createReorderPaymentKarte } from "@/lib/reorder-karte";
import { invalidateDashboardCache } from "@/lib/redis";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import {
  ensureSquareCustomer,
  saveCardOnFile,
  createSquarePayment,
  markReorderPaid,
} from "@/lib/payment/square-inline";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const tenantId = resolveTenantId(req);
    const tid = tenantId ?? undefined;

    // セッション検証
    const cookiePatientId =
      req.cookies.get("__Host-patient_id")?.value ||
      req.cookies.get("patient_id")?.value ||
      "";

    const parsed = await parseBody(req, inlinePaySchema);
    if ("error" in parsed) return parsed.error;
    const { sourceId, productCode, mode, patientId, reorderId, saveCard, shipping } = parsed.data;

    if (!cookiePatientId || cookiePatientId !== patientId) {
      return NextResponse.json({ error: "認証情報が一致しません" }, { status: 403 });
    }

    // レート制限（同一患者: 5分に5回、同一IP: 5分に10回）
    const ip = getClientIp(req);
    const [patientLimit, ipLimit] = await Promise.all([
      checkRateLimit(`square-pay:patient:${patientId}`, 5, 300),
      checkRateLimit(`square-pay:ip:${ip}`, 10, 300),
    ]);
    if (patientLimit.limited || ipLimit.limited) {
      return NextResponse.json(
        { error: "決済リクエストが多すぎます。しばらくしてから再度お試しください。" },
        { status: 429 },
      );
    }

    // 二重決済防止: 直近60秒以内の同一患者・同一商品の注文チェック
    const { data: recentOrder } = await withTenant(
      supabaseAdmin
        .from("orders")
        .select("id")
        .eq("patient_id", patientId)
        .eq("product_code", productCode)
        .gte("paid_at", new Date(Date.now() - 60_000).toISOString())
        .limit(1),
      tenantId,
    ).maybeSingle();
    if (recentOrder) {
      return NextResponse.json(
        { error: "直前に同じ決済が処理されています。マイページで注文状況をご確認ください。" },
        { status: 409 },
      );
    }

    // NG患者チェック（既存 checkout と同じロジック）
    const { data: intakeRow } = await withTenant(
      supabaseAdmin
        .from("intake")
        .select("status")
        .eq("patient_id", patientId)
        .not("status", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      tenantId,
    );
    if (intakeRow?.status === "NG") {
      return NextResponse.json(
        { error: "処方不可と判定されているため、決済できません。再度診察予約をお取りください。" },
        { status: 403 },
      );
    }

    // 商品取得
    const product = await getProductByCode(productCode, tid);
    if (!product) {
      return NextResponse.json({ error: "無効な商品コードです" }, { status: 400 });
    }

    // Square設定取得
    const accessToken = await getSettingOrEnv("square", "access_token", "SQUARE_ACCESS_TOKEN", tid);
    const locationId = await getSettingOrEnv("square", "location_id", "SQUARE_LOCATION_ID", tid);
    const env = (await getSettingOrEnv("square", "env", "SQUARE_ENV", tid)) || "production";

    if (!accessToken || !locationId) {
      return NextResponse.json({ error: "Square設定が不足しています" }, { status: 500 });
    }

    const baseUrl =
      env === "sandbox"
        ? "https://connect.squareupsandbox.com"
        : "https://connect.squareup.com";

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

    if (isNonce && saveCard) {
      // 初回: nonce → Customer作成 → Card保存 → card_id で決済
      customerId = (await ensureSquareCustomer(baseUrl, accessToken, patientId, tenantId)) ?? undefined;
      const cardId = await saveCardOnFile(baseUrl, accessToken, patientId, sourceId, tenantId);
      if (cardId) {
        paySourceId = cardId;
      }
      // カード保存失敗時はnonceで直接決済（フォールバック）
    } else if (!isNonce) {
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
        return NextResponse.json({ error: "無効なカード情報です" }, { status: 403 });
      }
    }

    // 冪等性キー: 患者+商品+分単位で決定的に生成（二重クリック防止）
    const idempotencyKey = crypto
      .createHash("sha256")
      .update(`${patientId}:${productCode}:${Math.floor(Date.now() / 60000)}`)
      .digest("hex");

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
      return NextResponse.json({ error: payResult.error || "決済に失敗しました" }, { status: 400 });
    }

    const payment = payResult.payment;
    const paymentId = payment.id;

    // orders INSERT（配送先は自前フォームから取得）
    const finalPhone = normalizeJPPhone(shipping.phone);
    try {
      await supabaseAdmin.from("orders").insert({
        id: paymentId,
        patient_id: patientId,
        product_code: productCode,
        product_name: product.title,
        amount: product.price,
        paid_at: payment.created_at || new Date().toISOString(),
        shipping_status: "pending",
        payment_status: "COMPLETED",
        payment_method: "credit_card",
        status: "confirmed",
        shipping_name: shipping.name,
        postal_code: shipping.postalCode,
        address: shipping.address,
        phone: finalPhone,
        email: shipping.email,
        ...tenantPayload(tenantId),
      });
    } catch (dbErr) {
      console.error("[square/pay] orders insert error:", dbErr);
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

    // キャッシュ削除
    await invalidateDashboardCache(patientId);

    return NextResponse.json({
      success: true,
      paymentId,
      receiptUrl: payment.receipt_url,
    });
  } catch (err: any) {
    console.error("[square/pay] error:", err);
    return NextResponse.json(
      { error: "決済処理中にエラーが発生しました。時間をおいて再度お試しください。" },
      { status: 500 },
    );
  }
}
