// app/api/admin/bank-transfer/manual-confirm/route.ts
// 銀行振込手動確認API - 自動照合で紐付けできなかった場合に手動で確認する
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { bankTransferManualConfirmSchema } from "@/lib/validations/admin-operations";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
  try {
    // 認証チェック（クッキーまたはBearerトークン）
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = await parseBody(req, bankTransferManualConfirmSchema);
    if ("error" in parsed) return parsed.error;
    const { order_id, memo } = parsed.data;

    const tenantId = resolveTenantId(req);

    console.log(`[ManualConfirm] Processing order: ${order_id}`);

    // Supabase接続
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 対象の注文を取得
    const { data: order, error: fetchError } = await withTenant(
      supabase
        .from("orders")
        .select("id, patient_id, product_code, amount, status, payment_method")
        .eq("id", order_id),
      tenantId
    ).single();

    if (fetchError || !order) {
      console.error(`[ManualConfirm] Order not found: ${order_id}`);
      return NextResponse.json(
        { error: "注文が見つかりませんでした" },
        { status: 404 }
      );
    }

    // pending_confirmationかつbank_transferであることを確認
    if (order.status !== "pending_confirmation") {
      return NextResponse.json(
        { error: "この注文は既に処理済みです" },
        { status: 400 }
      );
    }

    if (order.payment_method !== "bank_transfer") {
      return NextResponse.json(
        { error: "銀行振込以外の注文です" },
        { status: 400 }
      );
    }

    // payment_idを採番（bt_XXX形式）
    const { data: allBtOrders } = await withTenant(
      supabase
        .from("orders")
        .select("id")
        .like("id", "bt_%"),
      tenantId
    );

    let maxNum = 0;
    if (allBtOrders && allBtOrders.length > 0) {
      for (const o of allBtOrders) {
        const match = o.id.match(/^bt_(\d+)$/);
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
    const { error: updateError } = await withTenant(
      supabase
        .from("orders")
        .update({
          status: "confirmed",
          id: nextBtId,
          paid_at: now,
          payment_status: "COMPLETED",
          updated_at: now,
          // メモがあれば notes に追記
          ...(memo ? { notes: `手動確認: ${memo}` } : {}),
        })
        .eq("id", order_id),
      tenantId
    );

    if (updateError) {
      console.error(`[ManualConfirm] Update error:`, updateError);
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    console.log(`[ManualConfirm] Updated ${order_id} → ${nextBtId} (confirmed)`);

    // キャッシュ無効化
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
          body: JSON.stringify({ patient_id: order.patient_id }),
        });

        if (invalidateResponse.ok) {
          console.log(`[ManualConfirm] Cache invalidated for patient: ${order.patient_id}`);
        }
      }
    } catch (e) {
      console.error(`[ManualConfirm] Cache invalidation error:`, e);
    }

    return NextResponse.json({
      success: true,
      old_id: order_id,
      new_id: nextBtId,
      patient_id: order.patient_id,
    });
  } catch (e: any) {
    console.error("[ManualConfirm] Error:", e);
    return NextResponse.json(
      { error: e?.message || "サーバーエラー" },
      { status: 500 }
    );
  }
}
