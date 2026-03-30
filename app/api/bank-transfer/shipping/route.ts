// app/api/bank-transfer/shipping/route.ts
import { NextRequest, NextResponse } from "next/server";
import { forbidden, serverError, unauthorized } from "@/lib/api-error";
import { verifyPatientSession } from "@/lib/patient-session";
import { supabaseAdmin } from "@/lib/supabase";
import { invalidateDashboardCache } from "@/lib/redis";
import { normalizeJPPhone } from "@/lib/phone";
import { createReorderPaymentKarte } from "@/lib/reorder-karte";
import { getProductNamesMap, getProductPricesMap } from "@/lib/products";
import { resolveTenantId, withTenant, tenantPayload } from "@/lib/tenant";
import { getBusinessRules } from "@/lib/business-rules";
import { sendPaymentThankNotification } from "@/lib/payment-thank-flex";
import { pushMessage } from "@/lib/line-push";
import { parseBody } from "@/lib/validations/helpers";
import { bankTransferShippingSchema } from "@/lib/validations/payment";
import { hasAddressDuplication } from "@/lib/address-utils";


export async function POST(req: NextRequest) {
  try {
    const tenantId = resolveTenantId(req);

    // JWT患者セッション必須
    const session = await verifyPatientSession(req);
    if (!session) return unauthorized();
    const patientId = session.patientId;

    const parsed = await parseBody(req, bankTransferShippingSchema);
    if ("error" in parsed) return parsed.error;
    const { productCode, mode, reorderId, accountName, shippingName, phoneNumber, email, postalCode: rawPostal, address, addressDetail } = parsed.data;

    // 住所の都道府県重複チェック（最終防衛）
    if (address && hasAddressDuplication(address)) {
      return NextResponse.json(
        { ok: false, error: "住所に都道府県が重複しています。丁目・番地から入力してください。" },
        { status: 400 }
      );
    }

    // 郵便番号を XXX-XXXX 形式に正規化
    const postalDigits = rawPostal.replace(/[^0-9]/g, "");
    const postalCode = `${postalDigits.slice(0, 3)}-${postalDigits.slice(3)}`;

    // ★ NG患者は決済不可（statusがnullの再処方カルテを除外）
    {
      const { data: intakeRow } = await withTenant(
        supabaseAdmin
          .from("intake")
          .select("status")
          .eq("patient_id", patientId)
          .not("status", "is", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        tenantId
      );

      if (intakeRow?.status === "NG") {
        console.log(`[BankTransfer] NG患者の決済をブロック: patient_id=${patientId}`);
        return forbidden("処方不可と判定されているため、決済できません。再度診察予約をお取りください。");
      }
    }

    const now = new Date().toISOString();

    // ★ 同一患者・同一商品のpending_confirmation注文が既にある場合はブロック
    {
      const { data: existingPending } = await withTenant(
        supabaseAdmin
          .from("orders")
          .select("id")
          .eq("patient_id", patientId)
          .eq("product_code", productCode)
          .eq("status", "pending_confirmation")
          .eq("payment_method", "bank_transfer")
          .limit(1),
        tenantId
      );
      if (existingPending && existingPending.length > 0) {
        console.log(`[BankTransfer] 同一商品の振込待ち注文が既に存在: patient_id=${patientId}, product_code=${productCode}, existing=${existingPending[0].id}`);
        return NextResponse.json(
          { ok: false, error: "同じ商品の振込待ち注文がすでにあります。振込確認後に再度お申し込みください。" },
          { status: 409 }
        );
      }
    }

    // ★ Plan A完全版: ordersテーブルのみに保存（bank_transfer_orders不要）
    // 仮IDを生成（照合時に bt_XXX に更新される）
    const tempOrderId = `bt_pending_${Date.now()}`;

    // ★ 商品価格と商品名をDBから取得
    const PRODUCT_PRICES = await getProductPricesMap(tenantId ?? undefined);
    const PRODUCT_NAMES = await getProductNamesMap(tenantId ?? undefined);
    const amount = PRODUCT_PRICES[productCode] || 0;
    const productName = PRODUCT_NAMES[productCode] || productCode;

    const { data, error } = await supabaseAdmin.from("orders").insert({
      ...tenantPayload(tenantId),
      id: tempOrderId,
      patient_id: patientId,
      product_code: productCode,
      product_name: productName, // ★ 商品名を設定
      amount: amount, // ★ 正しい金額を設定
      paid_at: null, // ★ 照合完了時に設定する
      payment_method: "bank_transfer",
      payment_status: "PENDING", // 振込確認待ち
      status: "pending_confirmation", // ★ Plan A: 振込確認中
      shipping_status: "pending",
      // ★ 住所情報
      shipping_name: shippingName,
      postal_code: postalCode,
      address: address,
      address_detail: addressDetail || "",
      phone: normalizeJPPhone(phoneNumber),
      email: email,
      account_name: accountName, // 振込名義人
      created_at: now,
      updated_at: now,
    }).select();

    if (error) {
      console.error("[BankTransfer] orders insert error:", error);
      return serverError("配送先情報の保存に失敗しました");
    }

    console.log("[BankTransfer] ✅ ordersテーブルに登録完了:", tempOrderId);

    // ★ 再購入の場合、reorderステータスを "paid" に更新
    if (mode === "reorder" && reorderId) {
      // ★ Supabase DB 更新（reorder_number → id フォールバック）
      try {
        const idNum = Number(reorderId);
        if (Number.isFinite(idNum) && idNum >= 2) {
          const paidPayload = { status: "paid" as const, paid_at: new Date().toISOString() };

          const { data: updated, error: dbError } = await withTenant(
            supabaseAdmin
              .from("reorders")
              .update(paidPayload)
              .eq("reorder_number", idNum)
              .eq("status", "confirmed")
              .select("id"),
            tenantId
          );

          if (dbError) {
            console.error("[BankTransfer] Supabase reorder paid error:", dbError);
          } else if (updated && updated.length > 0) {
            console.log(`[BankTransfer] Supabase reorder paid success (reorder_number), row=${idNum}`);
          } else {
            // reorder_number でヒットしなかった場合、id でフォールバック
            console.warn(`[BankTransfer] reorder_number=${idNum} matched 0 rows, trying id fallback`);
            const { data: fb, error: fbErr } = await withTenant(
              supabaseAdmin
                .from("reorders")
                .update(paidPayload)
                .eq("id", idNum)
                .eq("status", "confirmed")
                .select("id"),
              tenantId
            );

            if (fbErr) {
              console.error("[BankTransfer] Supabase reorder paid fallback error:", fbErr);
            } else if (fb && fb.length > 0) {
              console.log(`[BankTransfer] Supabase reorder paid success (id fallback), id=${idNum}`);
            } else {
              console.warn(`[BankTransfer] Supabase reorder paid: no rows matched (reorder_num=${idNum}, id=${idNum})`);
            }
          }
        }
      } catch (dbErr) {
        console.error("[BankTransfer] Supabase reorder paid exception:", dbErr);
      }

      // ★ 決済時カルテ自動作成（用量比較付き）
      try {
        await createReorderPaymentKarte(patientId, productCode, new Date().toISOString(), undefined, tenantId ?? undefined);
      } catch (karteErr) {
        console.error("[BankTransfer] reorder payment karte error:", karteErr);
      }

    }

    // ★ 決済完了サンクスFlex送信（銀行振込 — 初回・再処方共通）
    try {
      const rules = await getBusinessRules(tenantId ?? undefined);
      if (rules.notifyReorderPaid && patientId) {
        const thankMsg = rules.paymentThankMessageBank || "お振込の確認が取れました。発送準備を進めてまいります。";
        const { data: pt } = await withTenant(
          supabaseAdmin.from("patients").select("line_id").eq("patient_id", patientId).maybeSingle(),
          tenantId
        );
        if (pt?.line_id) {
          await sendPaymentThankNotification({
            patientId, lineUid: pt.line_id,
            message: thankMsg,
            shipping: { shippingName, postalCode, address, phone: normalizeJPPhone(phoneNumber), email },
            paymentMethod: "bank_transfer",
            productName: productName || undefined,
            amount: amount || undefined,
            tenantId: tenantId ?? undefined,
          });
        }
      }
    } catch (thankErr) {
      console.error("[BankTransfer] payment thank message error:", thankErr);
    }

    // ★ マイページキャッシュを無効化（直接Redis削除）
    if (patientId) {
      await invalidateDashboardCache(patientId);
      console.log("[BankTransfer] Cache invalidated for patient:", patientId);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[BankTransfer] Error:", e);
    return serverError(e instanceof Error ? e.message : "サーバーエラーが発生しました");
  }
}
