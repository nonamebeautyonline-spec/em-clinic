// 決済マスター返金API（クレカ・銀行振込統一）
import { NextRequest, NextResponse } from "next/server";
import { badRequest, forbidden, notFound, serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { invalidateDashboardCache } from "@/lib/redis";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant } from "@/lib/tenant";
import { getSettingOrEnv } from "@/lib/settings";
import { logAudit } from "@/lib/audit";
import { parseBody } from "@/lib/validations/helpers";
import { nonameMasterRefundSchema } from "@/lib/validations/admin-operations";
import { SquarePaymentProvider } from "@/lib/payment/square";

async function pushToGroup(text: string, token: string, groupId: string) {
  if (!token || !groupId) return;
  try {
    await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to: groupId,
        messages: [{ type: "text", text }],
      }),
      cache: "no-store",
    });
  } catch (err) {
    console.error("[noname-master/refund] LINE push error:", err);
  }
}

export async function POST(req: NextRequest) {
  try {
    // 1. セッション認証
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) {
      return unauthorized();
    }

    // 2. Zodバリデーション
    const parsed = await parseBody(req, nonameMasterRefundSchema);
    if ("error" in parsed) return parsed.error;
    const { order_id, admin_token, memo } = parsed.data;

    // 3. admin_token 二重検証（誤操作防止）
    if (admin_token !== process.env.ADMIN_TOKEN) {
      return forbidden("管理者トークンが正しくありません");
    }

    const tenantId = resolveTenantId(req);

    // 4. 対象注文を取得
    const { data: order, error: fetchError } = await withTenant(
      supabaseAdmin
        .from("orders")
        .select("id, patient_id, product_code, amount, status, payment_method, shipping_name, refund_status")
        .eq("id", order_id),
      tenantId
    ).single();

    if (fetchError || !order) {
      return notFound("注文が見つかりませんでした");
    }

    // 5. 冪等チェック（既に返金済み）
    if (order.refund_status === "COMPLETED" || order.refund_status === "PENDING") {
      return NextResponse.json({
        ok: true,
        message: "既に返金処理済みです",
      });
    }

    // 6. ステータスチェック
    if (order.status === "cancelled") {
      return badRequest("キャンセル済みの注文です");
    }

    const now = new Date().toISOString();

    // 7. 決済方法別の返金処理
    if (order.payment_method === "credit_card") {
      // クレジットカード: Square Refunds API
      // reason: 元の決済noteと同じフォーマットで情報を付与
      const reasonParts: string[] = [];
      if (order.patient_id) reasonParts.push(`PID:${order.patient_id}`);
      if (order.product_code) reasonParts.push(`Product:${order.product_code}`);
      const refundReason = reasonParts.length > 0
        ? `${reasonParts.join(";")}の払戻し`
        : "管理画面からの払戻し";

      const square = new SquarePaymentProvider();
      const result = await square.processRefund(order.id, order.amount, refundReason);

      if (!result.success) {
        console.error("[noname-master/refund] Square refund failed:", result.status);
        return serverError(`Square返金に失敗しました: ${result.status}`);
      }

      // DB更新: COMPLETED（Squareが処理済み）
      const { error: updateError } = await withTenant(
        supabaseAdmin
          .from("orders")
          .update({
            status: "cancelled",
            refund_status: "COMPLETED",
            refunded_at: now,
            refunded_amount: order.amount,
            updated_at: now,
          })
          .eq("id", order_id),
        tenantId
      );

      if (updateError) {
        console.error("[noname-master/refund] DB update error:", updateError);
        return serverError(updateError.message);
      }
    } else if (order.payment_method === "bank_transfer") {
      // 銀行振込: DB更新のみ（手動返金待ち）
      const { error: updateError } = await withTenant(
        supabaseAdmin
          .from("orders")
          .update({
            status: "cancelled",
            refund_status: "PENDING",
            refunded_amount: order.amount,
            updated_at: now,
          })
          .eq("id", order_id),
        tenantId
      );

      if (updateError) {
        console.error("[noname-master/refund] DB update error:", updateError);
        return serverError(updateError.message);
      }
    } else {
      return badRequest("対応していない決済方法です");
    }

    console.log(`[noname-master/refund] 返金処理完了: order=${order_id}, method=${order.payment_method}, patient=${order.patient_id}`);

    // 8. キャッシュ無効化
    if (order.patient_id) {
      await invalidateDashboardCache(order.patient_id);
    }

    // 9. LINE通知
    const lineToken = await getSettingOrEnv("line", "channel_access_token", "LINE_NOTIFY_CHANNEL_ACCESS_TOKEN", tenantId ?? undefined) || "";
    const lineGroupId = await getSettingOrEnv("line", "admin_group_id", "LINE_ADMIN_GROUP_ID", tenantId ?? undefined) || "";

    const methodLabel = order.payment_method === "credit_card" ? "クレカ" : "銀行振込";
    const notifyText = `【返金処理】決済マスターから返金しました\n決済方法: ${methodLabel}\n注文ID: ${order_id}\n患者ID: ${order.patient_id}\n氏名: ${order.shipping_name || ""}\n金額: ¥${(order.amount || 0).toLocaleString()}${memo ? `\nメモ: ${memo}` : ""}`;

    pushToGroup(notifyText, lineToken, lineGroupId).catch(() => {});

    // 10. 監査ログ
    logAudit(req, "order.refund", "order", order_id, {
      payment_method: order.payment_method,
      amount: order.amount,
      memo: memo || null,
    });

    return NextResponse.json({
      ok: true,
      order_id,
      payment_method: order.payment_method,
      refund_status: order.payment_method === "credit_card" ? "COMPLETED" : "PENDING",
    });
  } catch (error) {
    console.error("[noname-master/refund] Error:", error);
    return serverError(error instanceof Error ? error.message : "サーバーエラー");
  }
}
