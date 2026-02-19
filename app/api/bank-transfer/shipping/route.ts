// app/api/bank-transfer/shipping/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { invalidateDashboardCache } from "@/lib/redis";
import { normalizeJPPhone } from "@/lib/phone";
import { createReorderPaymentKarte } from "@/lib/reorder-karte";
import { getProductNamesMap, getProductPricesMap } from "@/lib/products";
import { resolveTenantId, withTenant, tenantPayload } from "@/lib/tenant";


export async function POST(req: NextRequest) {
  try {
    const tenantId = resolveTenantId(req);
    const body = await req.json();
    const { patientId, productCode, mode, reorderId, accountName, shippingName, phoneNumber, email, postalCode, address } = body;

    // バリデーション
    if (!patientId || !productCode || !accountName || !shippingName || !phoneNumber || !email || !postalCode || !address) {
      return NextResponse.json(
        { error: "必須項目が不足しています" },
        { status: 400 }
      );
    }

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
        return NextResponse.json(
          { error: "処方不可と判定されているため、決済できません。再度診察予約をお取りください。" },
          { status: 403 }
        );
      }
    }

    const now = new Date().toISOString();

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
      phone: normalizeJPPhone(phoneNumber),
      email: email,
      account_name: accountName, // 振込名義人
      created_at: now,
      updated_at: now,
    }).select();

    if (error) {
      console.error("[BankTransfer] orders insert error:", error);
      return NextResponse.json(
        { error: "配送先情報の保存に失敗しました" },
        { status: 500 }
      );
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

    // ★ マイページキャッシュを無効化（直接Redis削除）
    if (patientId) {
      await invalidateDashboardCache(patientId);
      console.log("[BankTransfer] Cache invalidated for patient:", patientId);
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[BankTransfer] Error:", e);
    return NextResponse.json(
      { error: e?.message || "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
