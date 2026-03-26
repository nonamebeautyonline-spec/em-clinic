// app/api/admin/bank-transfer/reconcile/confirm/route.ts
import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { createClient } from "@supabase/supabase-js";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow, strictWithTenant } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { bankTransferReconcileConfirmSchema } from "@/lib/validations/admin-operations";
import { logAudit } from "@/lib/audit";

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
      return unauthorized();
    }

    const parsed = await parseBody(req, bankTransferReconcileConfirmSchema);
    if ("error" in parsed) return parsed.error;
    const matches: ConfirmMatch[] = parsed.data.matches;

    const tenantId = resolveTenantIdOrThrow(req);

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

    // 分割振込対応: 同一patient_idの重複処理を防ぐ
    const confirmedPatients = new Map<string, { newId: string }>();

    for (const match of matches) {
      const patientId = match.order.patient_id;

      // 同一バッチ内で既に確認済みの場合はスキップ（分割振込）
      if (confirmedPatients.has(patientId)) {
        const existing = confirmedPatients.get(patientId)!;
        console.log(`[Confirm] Skipping duplicate for patient ${patientId} (split payment, already confirmed as ${existing.newId})`);
        updateResults.push({
          orderId: patientId,
          newId: existing.newId,
          success: true,
        });
        continue;
      }

      // patient_idでpending_confirmationの注文を検索
      const { data: pendingOrders, error: fetchError } = await strictWithTenant(
        supabase
          .from("orders")
          .select("id, patient_id, product_code, amount")
          .eq("patient_id", patientId)
          .eq("status", "pending_confirmation")
          .eq("payment_method", "bank_transfer")
          .limit(1),
        tenantId
      );

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
      const { data: allBtOrders } = await strictWithTenant(
        supabase
          .from("orders")
          .select("id")
          .like("id", "bt_%"),
        tenantId
      );

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
      const { error: updateError } = await strictWithTenant(
        supabase
          .from("orders")
          .update({
            status: "confirmed",
            id: nextBtId,
            paid_at: now, // ★ 照合完了時に決済日時を設定
            payment_status: "COMPLETED",
            updated_at: now,
          })
          .eq("id", orderId),
        tenantId
      );

      if (updateError) {
        console.error(`[Confirm] Update error for order ${orderId}:`, updateError);
        updateResults.push({
          orderId,
          success: false,
          error: updateError.message,
        });
      } else {
        console.log(`[Confirm] Updated ${orderId} → ${nextBtId} (confirmed)`);
        confirmedPatients.set(patientId, { newId: nextBtId });
        updateResults.push({
          orderId,
          newId: nextBtId,
          success: true,
        });

        // ★ bank_statementsを照合済みに更新（matched_order_idまたは振込情報で特定）
        // 1) matched_order_idが旧IDの行を更新
        const { data: updatedByOrderId } = await strictWithTenant(
          supabase
            .from("bank_statements")
            .update({ reconciled: true, matched_order_id: nextBtId })
            .eq("matched_order_id", orderId)
            .select("id"),
          tenantId
        );

        // 2) まだ更新できていない場合、振込日・摘要・金額で特定して更新
        if (!updatedByOrderId || updatedByOrderId.length === 0) {
          const transferDate = match.transfer.date.replace(/\//g, "-");
          await strictWithTenant(
            supabase
              .from("bank_statements")
              .update({ reconciled: true, matched_order_id: nextBtId })
              .eq("transaction_date", transferDate)
              .eq("description", match.transfer.description)
              .eq("deposit", match.transfer.amount)
              .eq("reconciled", false),
            tenantId
          );
        }

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

    logAudit(req, "bank_transfer_reconcile.confirm", "order", "reconcile");
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
  } catch (e) {
    console.error("[Confirm] Error:", e);
    return serverError(e instanceof Error ? e.message : "サーバーエラー");
  }
}
