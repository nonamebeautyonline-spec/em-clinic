import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { generateYamatoB2Csv } from "@/utils/yamato-b2-formatter";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";

import { resolveTenantIdOrThrow, strictWithTenant } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { exportYamatoB2CustomSchema } from "@/lib/validations/shipping";
import { getYamatoConfig } from "@/lib/shipping/config";
import { logAudit } from "@/lib/audit";

interface CustomShippingItem {
  payment_id: string;
  name: string;
  postal: string;
  address: string;
  email: string;
  phone: string;
}

export async function POST(req: NextRequest) {
  try {
    // 認証チェック
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) {
      return unauthorized();
    }

    const tenantId = resolveTenantIdOrThrow(req);

    const parsed = await parseBody(req, exportYamatoB2CustomSchema);
    if ("error" in parsed) return parsed.error;
    const items: CustomShippingItem[] = parsed.data.items;
    const allPaymentIds: string[] = parsed.data.all_payment_ids || items.map((item) => item.payment_id);

    console.log(`[ExportYamatoB2Custom] Exporting ${items.length} items (marking ${allPaymentIds.length} orders)`);

    // 出荷予定日（今日の日付 yyyy/MM/dd）
    const today = new Date();
    const shipDate = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, "0")}/${String(
      today.getDate()
    ).padStart(2, "0")}`;

    // 管理画面の配送設定をDB→CSV生成に反映
    const yamatoConfig = await getYamatoConfig(tenantId ?? undefined);
    console.log(`[ExportYamatoB2Custom] tenantId=${tenantId}, coolType=${yamatoConfig.coolType}, itemName=${yamatoConfig.itemName}`);
    const csv = generateYamatoB2Csv(items, shipDate, yamatoConfig);

    // ★ CSV出力後、注文の shipping_list_created_at を更新（統合前を含む全payment_id）
    const now = new Date().toISOString();

    console.log(`[ExportYamatoB2Custom] Marking ${allPaymentIds.length} orders as list_created`);

    const { data: updatedOrders, error: updateError } = await strictWithTenant(
      supabaseAdmin.from("orders").update({
        shipping_list_created_at: now,
        updated_at: now,
      }).in("id", allPaymentIds).select("patient_id"),
      tenantId
    );

    if (updateError) {
      console.error("[ExportYamatoB2Custom] Failed to update orders:", updateError);
      // エラーでもCSVは返す（重要な操作ではない）
    } else if (updatedOrders && updatedOrders.length > 0) {
      console.log(`[ExportYamatoB2Custom] Updated ${updatedOrders.length} orders`);

      // ★ キャッシュ無効化
      const patientIds = Array.from(new Set(updatedOrders.map((o: { patient_id: string }) => o.patient_id)));
      console.log(`[ExportYamatoB2Custom] Invalidating cache for ${patientIds.length} patients`);

      const invalidateUrl = `${req.nextUrl.origin}/api/admin/invalidate-cache`;
      const invalidatePromises = patientIds.map((patientId) =>
        fetch(invalidateUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.ADMIN_TOKEN}`,
          },
          body: JSON.stringify({ patient_id: patientId }),
        }).catch((err) => {
          console.error(`[ExportYamatoB2Custom] Cache invalidation failed for ${patientId}:`, err);
        })
      );

      await Promise.allSettled(invalidatePromises);
    }

    // CSVをレスポンスとして返す
    logAudit(req, "shipping.export_b2_custom", "shipping", "export");
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=UTF-8",
        "Content-Disposition": `attachment; filename="yamato_b2_${today.toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("[ExportYamatoB2Custom] Error:", error);
    return serverError(error instanceof Error ? error.message : "Server error");
  }
}
