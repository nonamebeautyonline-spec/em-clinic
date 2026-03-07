// app/api/admin/bank-transfer/statements/link/route.ts
import { NextRequest, NextResponse } from "next/server";
import { badRequest, unauthorized, serverError } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { createClient } from "@supabase/supabase-js";
import { resolveTenantId, withTenant } from "@/lib/tenant";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * 入出金明細と注文を手動紐づけAPI
 * POST /api/admin/bank-transfer/statements/link
 * body: { statementId: number, orderId: string }
 */
export async function POST(req: NextRequest) {
  try {
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) return unauthorized();

    const tenantId = resolveTenantId(req);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { statementId, statementIds, orderId } = body;

    // 複数ID対応（statementIds優先、なければstatementIdを単体配列に）
    const ids: number[] = statementIds || (statementId ? [statementId] : []);

    if (ids.length === 0 || !orderId) {
      return badRequest("statementId(s)とorderIdが必要です");
    }

    // 注文の存在確認
    const { data: order } = await withTenant(
      supabase.from("orders").select("id, status, patient_id").eq("id", orderId),
      tenantId
    );

    if (!order || order.length === 0) {
      return badRequest("指定された注文が見つかりません");
    }

    // bank_statementsを一括更新
    const { error } = await withTenant(
      supabase
        .from("bank_statements")
        .update({ reconciled: true, matched_order_id: orderId })
        .in("id", ids),
      tenantId
    );

    if (error) {
      console.error("[Statements/link] update error:", error);
      return serverError(error.message);
    }

    // 注文がpending_confirmationの場合、confirmedに更新
    let newOrderId: string | null = null;
    if (order[0].status === "pending_confirmation") {
      // bt_XXX形式のIDを採番
      const { data: allBtOrders } = await withTenant(
        supabase.from("orders").select("id").like("id", "bt_%"),
        tenantId
      );
      let maxNum = 0;
      if (allBtOrders) {
        for (const o of allBtOrders) {
          const m = (o.id as string).match(/^bt_(\d+)$/);
          if (m) {
            const num = parseInt(m[1], 10);
            if (num > maxNum) maxNum = num;
          }
        }
      }
      const nextBtId = `bt_${maxNum + 1}`;
      const now = new Date().toISOString();

      const { error: updateError } = await withTenant(
        supabase
          .from("orders")
          .update({
            status: "confirmed",
            id: nextBtId,
            paid_at: now,
            payment_status: "COMPLETED",
            updated_at: now,
          })
          .eq("id", orderId),
        tenantId
      );

      if (updateError) {
        console.error("[Statements/link] order confirm error:", updateError);
      } else {
        newOrderId = nextBtId;
        console.log(`[Statements/link] Order ${orderId} → ${nextBtId} (confirmed)`);

        // bank_statementsのmatched_order_idも新IDに更新
        await withTenant(
          supabase
            .from("bank_statements")
            .update({ matched_order_id: nextBtId })
            .in("id", ids),
          tenantId
        );

        // キャッシュ無効化
        try {
          const adminToken = process.env.ADMIN_TOKEN;
          if (adminToken) {
            await fetch(`${req.nextUrl.origin}/api/admin/invalidate-cache`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
              body: JSON.stringify({ patient_id: order[0].patient_id }),
            });
          }
        } catch { /* サイレント */ }
      }
    }

    return NextResponse.json({ ok: true, linkedCount: ids.length, newOrderId });
  } catch (e) {
    console.error("[Statements/link] error:", e);
    return serverError(e instanceof Error ? e.message : "サーバーエラー");
  }
}
