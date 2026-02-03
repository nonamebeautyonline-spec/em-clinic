// app/api/bank-transfer/shipping/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase";
import { invalidateDashboardCache } from "@/lib/redis";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// ★ 商品価格マッピング
const PRODUCT_PRICES: Record<string, number> = {
  "MJL_2.5mg_1m": 13000,
  "MJL_2.5mg_2m": 25500,
  "MJL_2.5mg_3m": 35000,
  "MJL_5mg_1m": 22850,
  "MJL_5mg_2m": 45500,
  "MJL_5mg_3m": 63000,
  "MJL_7.5mg_1m": 34000,
  "MJL_7.5mg_2m": 65000,
  "MJL_7.5mg_3m": 94000,
  "MJL_10mg_1m": 35000,
  "MJL_10mg_2m": 70000,
  "MJL_10mg_3m": 105000,
};

const PRODUCT_NAMES: Record<string, string> = {
  "MJL_2.5mg_1m": "マンジャロ 2.5mg 1ヶ月",
  "MJL_2.5mg_2m": "マンジャロ 2.5mg 2ヶ月",
  "MJL_2.5mg_3m": "マンジャロ 2.5mg 3ヶ月",
  "MJL_5mg_1m": "マンジャロ 5mg 1ヶ月",
  "MJL_5mg_2m": "マンジャロ 5mg 2ヶ月",
  "MJL_5mg_3m": "マンジャロ 5mg 3ヶ月",
  "MJL_7.5mg_1m": "マンジャロ 7.5mg 1ヶ月",
  "MJL_7.5mg_2m": "マンジャロ 7.5mg 2ヶ月",
  "MJL_7.5mg_3m": "マンジャロ 7.5mg 3ヶ月",
  "MJL_10mg_1m": "マンジャロ 10mg 1ヶ月",
  "MJL_10mg_2m": "マンジャロ 10mg 2ヶ月",
  "MJL_10mg_3m": "マンジャロ 10mg 3ヶ月",
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { patientId, productCode, mode, reorderId, accountName, shippingName, phoneNumber, email, postalCode, address } = body;

    // バリデーション
    if (!patientId || !productCode || !accountName || !shippingName || !phoneNumber || !email || !postalCode || !address) {
      return NextResponse.json(
        { error: "必須項目が不足しています" },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const now = new Date().toISOString();

    // ★ Plan A完全版: ordersテーブルのみに保存（bank_transfer_orders不要）
    // 仮IDを生成（照合時に bt_XXX に更新される）
    const tempOrderId = `bt_pending_${Date.now()}`;

    // ★ 商品価格と商品名を取得
    const amount = PRODUCT_PRICES[productCode] || 0;
    const productName = PRODUCT_NAMES[productCode] || productCode;

    const { data, error } = await supabase.from("orders").insert({
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
      phone: phoneNumber,
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
      const gasReorderUrl = process.env.GAS_REORDER_URL;
      if (gasReorderUrl) {
        try {
          const reorderResponse = await fetch(gasReorderUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "paid",
              id: reorderId,
            }),
          });

          if (!reorderResponse.ok) {
            console.error("[BankTransfer] Reorder status update failed:", await reorderResponse.text());
          } else {
            console.log("[BankTransfer] Reorder status updated to paid (GAS)");
          }
        } catch (e) {
          console.error("[BankTransfer] Reorder status update error:", e);
        }
      }

      // ★ Supabase DB も更新（gas_row_numberでマッチング）
      try {
        const idNum = Number(reorderId);
        if (Number.isFinite(idNum) && idNum >= 2) {
          const { error: dbError } = await supabaseAdmin
            .from("reorders")
            .update({
              status: "paid",
              paid_at: new Date().toISOString(),
            })
            .eq("gas_row_number", idNum);

          if (dbError) {
            console.error("[BankTransfer] Supabase reorder paid error:", dbError);
          } else {
            console.log(`[BankTransfer] Supabase reorder paid success, row=${idNum}`);
          }
        }
      } catch (dbErr) {
        console.error("[BankTransfer] Supabase reorder paid exception:", dbErr);
      }
    }

    // ★ 銀行振込管理GASに記録（リトライ機能付き）
    const gasUrl = process.env.GAS_BANK_TRANSFER_URL;
    console.log("[BankTransfer] GAS_BANK_TRANSFER_URL:", gasUrl);
    if (gasUrl) {
      const gasPayload = {
        type: "bank_transfer_order",
        order_id: String(data?.[0]?.id || ""), // Supabaseから返されたID
        patient_id: patientId,
        product_code: productCode,
        mode: mode || "first",
        reorder_id: reorderId || null,
        account_name: accountName,
        shipping_name: shippingName, // ★ 追加: 配送先氏名（漢字）
        phone_number: phoneNumber,
        email: email,
        postal_code: postalCode,
        address: address,
        submitted_at: now,
      };

      const MAX_RETRIES = 3;
      const TIMEOUT_MS = 10000; // 10秒タイムアウト
      let lastError: any = null;
      let success = false;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          console.log(`[BankTransfer] GAS call attempt ${attempt}/${MAX_RETRIES}`);
          if (attempt === 1) {
            console.log("[BankTransfer] Payload:", JSON.stringify(gasPayload));
          }

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

          const gasResponse = await fetch(gasUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(gasPayload),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          const gasResponseText = await gasResponse.text();
          console.log(`[BankTransfer] GAS response status: ${gasResponse.status}`);
          console.log(`[BankTransfer] GAS response body: ${gasResponseText}`);

          if (gasResponse.ok) {
            console.log("[BankTransfer] ✅ Successfully added to bank transfer management sheet");
            success = true;
            break; // 成功したらループ終了
          } else {
            lastError = new Error(`HTTP ${gasResponse.status}: ${gasResponseText}`);
            console.error(`[BankTransfer] ❌ Attempt ${attempt} failed:`, lastError.message);

            if (attempt < MAX_RETRIES) {
              const delayMs = Math.pow(2, attempt - 1) * 1000; // 指数バックオフ: 1s, 2s, 4s
              console.log(`[BankTransfer] Retrying in ${delayMs}ms...`);
              await new Promise(resolve => setTimeout(resolve, delayMs));
            }
          }
        } catch (e: any) {
          lastError = e;
          const errorMsg = e.name === 'AbortError' ? 'Timeout (10s)' : e.message;
          console.error(`[BankTransfer] ❌ Attempt ${attempt} error:`, errorMsg);

          if (attempt < MAX_RETRIES) {
            const delayMs = Math.pow(2, attempt - 1) * 1000;
            console.log(`[BankTransfer] Retrying in ${delayMs}ms...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
        }
      }

      // 全てのリトライ失敗
      if (!success) {
        console.error("[BankTransfer] ⚠️ CRITICAL: All retry attempts failed for patient_id:", patientId, "order_id:", data?.[0]?.id);
        console.error("[BankTransfer] Last error:", lastError);
        // GAS呼び出しエラーでも処理は続行（Supabaseには保存済み）
        // TODO: 後でDBとGASを同期するバックフィル処理が必要
      }
    } else {
      console.error("[BankTransfer] GAS_BANK_TRANSFER_URL is not set");
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
