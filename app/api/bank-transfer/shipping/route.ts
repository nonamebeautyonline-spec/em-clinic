// app/api/bank-transfer/shipping/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { patientId, productCode, mode, reorderId, accountName, phoneNumber, email, postalCode, address } = body;

    // バリデーション
    if (!patientId || !productCode || !accountName || !phoneNumber || !email || !postalCode || !address) {
      return NextResponse.json(
        { error: "必須項目が不足しています" },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // bank_transfer_ordersテーブルに保存
    const now = new Date().toISOString();
    const { data, error } = await supabase.from("bank_transfer_orders").insert({
      patient_id: patientId,
      product_code: productCode,
      account_name: accountName,
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

    // ★ 銀行振込管理GASに記録
    const gasUrl = process.env.GAS_BANK_TRANSFER_URL;
    if (gasUrl) {
      try {
        const gasResponse = await fetch(gasUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "bank_transfer_order",
            order_id: String(data?.[0]?.id || ""), // Supabaseから返されたID
            patient_id: patientId,
            product_code: productCode,
            mode: mode || "first", // ★ 追加
            reorder_id: reorderId || null, // ★ 追加
            account_name: accountName,
            phone_number: phoneNumber,
            email: email,
            postal_code: postalCode,
            address: address,
            submitted_at: now,
          }),
        });

        if (!gasResponse.ok) {
          console.error("[BankTransfer] GAS call failed:", await gasResponse.text());
        } else {
          console.log("[BankTransfer] Successfully added to bank transfer management sheet");
        }
      } catch (e) {
        console.error("[BankTransfer] GAS call error:", e);
        // GAS呼び出しエラーでも処理は続行（Supabaseには保存済み）
      }
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
