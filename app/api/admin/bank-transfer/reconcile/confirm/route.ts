// app/api/admin/bank-transfer/reconcile/confirm/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAdminAuth } from "@/lib/admin-auth";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface ConfirmMatch {
  transfer: {
    date: string;
    description: string;
    amount: number;
  };
  order: {
    patient_id: string;
    product_code: string;
    amount: number;
  };
}

/**
 * 銀行CSV照合確定API
 * 照合候補を受け取り、ordersテーブルを更新してstatus='confirmed'にする
 */
export async function POST(req: NextRequest) {
  try {
    // 認証チェック（クッキーまたはBearerトークン）
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const matches: ConfirmMatch[] = body.matches || [];

    if (matches.length === 0) {
      return NextResponse.json(
        { error: "確定する照合データがありません" },
        { status: 400 }
      );
    }

    console.log(`[Confirm] Processing ${matches.length} matches`);

    // Supabase接続
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // マッチした注文をstatus='confirmed'に更新
    const updateResults: Array<{
      orderId: string;
      success: boolean;
      newId?: string;
      error?: string;
    }> = [];

    for (const match of matches) {
      const patientId = match.order.patient_id;

      // patient_idでpending_confirmationの注文を検索
      const { data: pendingOrders, error: fetchError } = await supabase
        .from("orders")
        .select("id, patient_id, product_code, amount")
        .eq("patient_id", patientId)
        .eq("status", "pending_confirmation")
        .eq("payment_method", "bank_transfer")
        .limit(1);

      if (fetchError || !pendingOrders || pendingOrders.length === 0) {
        console.error(`[Confirm] Order not found for patient ${patientId}`);
        updateResults.push({
          orderId: patientId,
          success: false,
          error: "注文が見つかりませんでした",
        });
        continue;
      }

      const orderId = pendingOrders[0].id;

      // payment_idを採番（bt_XXX形式）
      const { data: allBtOrders } = await supabase
        .from("orders")
        .select("id")
        .like("id", "bt_%");

      let maxNum = 0;
      if (allBtOrders && allBtOrders.length > 0) {
        for (const order of allBtOrders) {
          const match = order.id.match(/^bt_(\d+)$/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNum) {
              maxNum = num;
            }
          }
        }
      }

      const nextBtId = `bt_${maxNum + 1}`;

      // 更新
      const now = new Date().toISOString();
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          status: "confirmed",
          id: nextBtId,
          paid_at: now, // ★ 照合完了時に決済日時を設定
          payment_status: "COMPLETED",
          updated_at: now,
        })
        .eq("id", orderId);

      if (updateError) {
        console.error(`[Confirm] Update error for order ${orderId}:`, updateError);
        updateResults.push({
          orderId,
          success: false,
          error: updateError.message,
        });
      } else {
        console.log(`[Confirm] Updated ${orderId} → ${nextBtId} (confirmed)`);
        updateResults.push({
          orderId,
          newId: nextBtId,
          success: true,
        });

        // ★ キャッシュ無効化（決済確認後）
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
              console.log(`[Confirm] Cache invalidated for patient: ${patientId}`);
            } else {
              console.error(`[Confirm] Cache invalidation failed: ${await invalidateResponse.text()}`);
            }
          }
        } catch (e) {
          console.error(`[Confirm] Cache invalidation error:`, e);
          // エラーでも処理は続行
        }
      }
    }

    const successCount = updateResults.filter((r) => r.success).length;

    return NextResponse.json({
      matched: matches.map((m, i) => ({
        transfer: m.transfer,
        order: m.order,
        newPaymentId: updateResults[i]?.newId || null,
        updateSuccess: updateResults[i]?.success || false,
      })),
      unmatched: [],
      summary: {
        total: matches.length,
        matched: matches.length,
        unmatched: 0,
        updated: successCount,
      },
    });
  } catch (e: any) {
    console.error("[Confirm] Error:", e);
    return NextResponse.json(
      { error: e?.message || "サーバーエラー" },
      { status: 500 }
    );
  }
}
