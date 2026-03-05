// 銀行振込商品変更API
import { NextRequest, NextResponse } from "next/server";
import { badRequest, notFound, serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { invalidateDashboardCache } from "@/lib/redis";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant } from "@/lib/tenant";
import { getSettingOrEnv } from "@/lib/settings";
import { logAudit } from "@/lib/audit";
import { parseBody } from "@/lib/validations/helpers";
import { bankTransferChangeProductSchema } from "@/lib/validations/admin-operations";
import { getProductByCode } from "@/lib/products";

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
    console.error("[bank-transfer/change-product] LINE push error:", err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) {
      return unauthorized();
    }

    const parsed = await parseBody(req, bankTransferChangeProductSchema);
    if ("error" in parsed) return parsed.error;
    const { order_id, new_product_code, memo } = parsed.data;

    const tenantId = resolveTenantId(req);
    const lineToken = await getSettingOrEnv("line", "channel_access_token", "LINE_NOTIFY_CHANNEL_ACCESS_TOKEN", tenantId ?? undefined) || "";
    const lineGroupId = await getSettingOrEnv("line", "admin_group_id", "LINE_ADMIN_GROUP_ID", tenantId ?? undefined) || "";

    // 対象注文を取得
    const { data: order, error: fetchError } = await withTenant(
      supabaseAdmin
        .from("orders")
        .select("id, patient_id, product_code, product_name, amount, status, payment_method, shipping_name, account_name")
        .eq("id", order_id),
      tenantId
    ).single();

    if (fetchError || !order) {
      return notFound("注文が見つかりませんでした");
    }

    if (order.payment_method !== "bank_transfer") {
      return badRequest("銀行振込以外の注文です");
    }

    if (order.status !== "pending_confirmation") {
      return badRequest("振込待ち状態の注文のみ変更可能です");
    }

    if (new_product_code === order.product_code) {
      return badRequest("同じ商品への変更はできません");
    }

    // 新商品情報を取得
    const newProduct = await getProductByCode(new_product_code, tenantId ?? undefined);
    if (!newProduct) {
      return badRequest("指定された商品が見つかりません");
    }

    const now = new Date().toISOString();
    const oldProductName = order.product_name || order.product_code;
    const oldAmount = order.amount || 0;

    // DB更新
    const { error: updateError } = await withTenant(
      supabaseAdmin
        .from("orders")
        .update({
          product_code: newProduct.code,
          product_name: newProduct.title,
          amount: newProduct.price,
          updated_at: now,
        })
        .eq("id", order_id),
      tenantId
    );

    if (updateError) {
      console.error("[bank-transfer/change-product] Update error:", updateError);
      return serverError(updateError.message);
    }

    console.log(`[bank-transfer/change-product] ${order.product_code} → ${newProduct.code}: order=${order_id}, patient=${order.patient_id}`);

    // キャッシュ削除
    if (order.patient_id) {
      await invalidateDashboardCache(order.patient_id);
    }

    // LINE通知
    const name = order.shipping_name || order.account_name || "";
    const notifyText = `【銀行振込商品変更】管理画面から商品を変更しました\n注文ID: ${order_id}\n患者ID: ${order.patient_id}\n氏名: ${name}\n変更前: ${oldProductName} (¥${oldAmount.toLocaleString()})\n変更後: ${newProduct.title} (¥${newProduct.price.toLocaleString()})${memo ? `\nメモ: ${memo}` : ""}`;

    pushToGroup(notifyText, lineToken, lineGroupId).catch(() => {});

    logAudit(req, "bank_transfer.change_product", "order", order_id);

    return NextResponse.json({
      ok: true,
      order_id,
      old_product_code: order.product_code,
      new_product_code: newProduct.code,
      old_amount: oldAmount,
      new_amount: newProduct.price,
    });
  } catch (error) {
    console.error("[bank-transfer/change-product] Error:", error);
    return serverError(error instanceof Error ? error.message : "サーバーエラー");
  }
}
