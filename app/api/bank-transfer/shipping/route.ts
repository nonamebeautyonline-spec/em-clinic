// app/api/bank-transfer/shipping/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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

    // bank_transfer_ordersテーブルに保存
    const { data, error } = await supabase.from("bank_transfer_orders").insert({
      patient_id: patientId,
      product_code: productCode,
      account_name: accountName,
      shipping_name: shippingName, // ★ 追加: 配送先氏名（漢字）
      phone_number: phoneNumber,
      email: email,
      postal_code: postalCode,
      address: address,
      status: "confirmed", // 住所入力完了 = 決済完了とみなす
      created_at: now,
      submitted_at: now, // 住所入力完了時刻
      confirmed_at: now, // 決済完了時刻
      mode: mode || null, // ★ 追加: 初回/再購入の区別
      reorder_id: reorderId || null, // ★ 追加: 再購入申請ID
    }).select();

    if (error) {
      console.error("[BankTransfer] Supabase insert error:", error);
      return NextResponse.json(
        { error: "配送先情報の保存に失敗しました" },
        { status: 500 }
      );
    }

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
            console.log("[BankTransfer] Reorder status updated to paid");
          }
        } catch (e) {
          console.error("[BankTransfer] Reorder status update error:", e);
        }
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

    // ★ マイページキャッシュを無効化（最新の注文状況を表示するため）
    try {
      const invalidateUrl = `${req.nextUrl.origin}/api/admin/invalidate-cache`;
      const adminToken = process.env.ADMIN_TOKEN;

      if (adminToken) {
        const invalidateResponse = await fetch(invalidateUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({ patient_id: patientId }),
        });

        if (invalidateResponse.ok) {
          console.log("[BankTransfer] Cache invalidated for patient:", patientId);
        } else {
          console.error("[BankTransfer] Cache invalidation failed:", await invalidateResponse.text());
        }
      } else {
        console.warn("[BankTransfer] ADMIN_TOKEN not set, skipping cache invalidation");
      }
    } catch (e) {
      console.error("[BankTransfer] Cache invalidation error:", e);
      // エラーでも処理は続行
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
