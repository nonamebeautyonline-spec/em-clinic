// 銀行振込キャンセル・返金API
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { invalidateDashboardCache } from "@/lib/redis";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant } from "@/lib/tenant";
import { getSettingOrEnv } from "@/lib/settings";
import { logAudit } from "@/lib/audit";
import { parseBody } from "@/lib/validations/helpers";
import { bankTransferCancelSchema } from "@/lib/validations/admin-operations";

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
    console.error("[bank-transfer/cancel] LINE push error:", err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = await parseBody(req, bankTransferCancelSchema);
    if ("error" in parsed) return parsed.error;
    const { order_id, action, memo } = parsed.data;

    const tenantId = resolveTenantId(req);
    const lineToken = await getSettingOrEnv("line", "channel_access_token", "LINE_NOTIFY_CHANNEL_ACCESS_TOKEN", tenantId ?? undefined) || "";
    const lineGroupId = await getSettingOrEnv("line", "admin_group_id", "LINE_ADMIN_GROUP_ID", tenantId ?? undefined) || "";

    // 対象注文を取得
    const { data: order, error: fetchError } = await withTenant(
      supabaseAdmin
        .from("orders")
        .select("id, patient_id, product_code, amount, status, payment_method, shipping_name, account_name")
        .eq("id", order_id),
      tenantId
    ).single();

    if (fetchError || !order) {
      return NextResponse.json({ error: "注文が見つかりませんでした" }, { status: 404 });
    }

    if (order.payment_method !== "bank_transfer") {
      return NextResponse.json({ error: "銀行振込以外の注文です" }, { status: 400 });
    }

    // 冪等チェック
    if (order.status === "cancelled") {
      return NextResponse.json({
        ok: true,
        message: "既にキャンセル済みです",
      });
    }

    const now = new Date().toISOString();
    const actionLabel = action === "refund" ? "返金" : "キャンセル";
    const notesText = memo ? `${actionLabel}: ${memo}` : actionLabel;

    // DB更新
    const updateData: Record<string, unknown> = {
      status: "cancelled",
      updated_at: now,
    };

    if (action === "refund") {
      updateData.refund_status = "PENDING";
      updateData.refunded_amount = order.amount;
    }

    const { error: updateError } = await withTenant(
      supabaseAdmin
        .from("orders")
        .update(updateData)
        .eq("id", order_id),
      tenantId
    );

    if (updateError) {
      console.error("[bank-transfer/cancel] Update error:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    console.log(`[bank-transfer/cancel] ${actionLabel}: order=${order_id}, patient=${order.patient_id}`);

    // キャッシュ削除
    if (order.patient_id) {
      await invalidateDashboardCache(order.patient_id);
    }

    // LINE通知
    const name = order.shipping_name || order.account_name || "";
    const notifyText = action === "refund"
      ? `【銀行振込返金】管理画面から返金処理しました\n注文ID: ${order_id}\n患者ID: ${order.patient_id}\n氏名: ${name}\n金額: ¥${(order.amount || 0).toLocaleString()}\n${memo ? `メモ: ${memo}` : ""}`
      : `【銀行振込キャンセル】管理画面からキャンセルしました\n注文ID: ${order_id}\n患者ID: ${order.patient_id}\n氏名: ${name}\n${memo ? `メモ: ${memo}` : ""}`;

    pushToGroup(notifyText, lineToken, lineGroupId).catch(() => {});

    logAudit(req, `bank_transfer.${action}`, "order", order_id);

    return NextResponse.json({ ok: true, action, order_id });
  } catch (error) {
    console.error("[bank-transfer/cancel] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "サーバーエラー" },
      { status: 500 }
    );
  }
}
