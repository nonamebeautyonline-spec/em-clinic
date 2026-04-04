// 日本郵便ゆうパックプリントR用CSVエクスポート
import { NextRequest, NextResponse } from "next/server";
import { notFound, serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { generateJapanPostCsvWithOptions } from "@/lib/shipping/japanpost";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow, strictWithTenant } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { exportYamatoB2Schema } from "@/lib/validations/shipping"; // order_ids共通スキーマ
import { getJapanPostConfig } from "@/lib/shipping/config";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) return unauthorized();

    const tenantId = resolveTenantIdOrThrow(req);

    const parsed = await parseBody(req, exportYamatoB2Schema);
    if ("error" in parsed) return parsed.error;
    const { order_ids: orderIds } = parsed.data;

    // 注文情報を取得
    const { data: orders, error: ordersError } = await strictWithTenant(
      supabaseAdmin.from("orders").select("id, patient_id, shipping_name, shipping_postal, shipping_address, shipping_phone, shipping_email, custom_sender_name, item_name_cosmetics, use_hexidin, post_office_hold, post_office_name").in("id", orderIds),
      tenantId
    );

    if (ordersError) {
      console.error("[export-japanpost] orders error:", ordersError);
      return serverError("Database error");
    }
    if (!orders || orders.length === 0) return notFound("No orders found");

    // 患者情報フォールバック（ordersに住所がない場合）
    const patientIds = [...new Set(orders.map((o) => o.patient_id))];
    const { data: patients } = await strictWithTenant(
      supabaseAdmin.from("patients").select("patient_id, name, tel").in("patient_id", patientIds),
      tenantId
    );
    const patientMap = new Map<string, { name: string; tel: string }>();
    (patients || []).forEach((p) => patientMap.set(p.patient_id, { name: p.name || "", tel: p.tel || "" }));

    // CSV用データ
    const csvData = orders.map((order) => {
      const pt = patientMap.get(order.patient_id);

      // 品名判定: 化粧品変更 → 「化粧品」、九州宛 → kyushuItemName、それ以外 → デフォルト
      const addr = order.shipping_address || "";
      const isKyushu = /^(福岡県|佐賀県|長崎県|熊本県|大分県|宮崎県|鹿児島県)/.test(addr);

      return {
        payment_id: order.id,
        name: order.shipping_name || pt?.name || "",
        postal: order.shipping_postal || "",
        address: order.shipping_address || "",
        email: order.shipping_email || "",
        phone: order.shipping_phone || pt?.tel || "",
        // 発送オプション
        customSenderName: order.custom_sender_name || null,
        itemNameCosmetics: order.item_name_cosmetics || false,
        useHexidin: order.use_hexidin || false,
        postOfficeHold: order.post_office_hold || false,
        postOfficeName: order.post_office_name || null,
        isKyushu,
      };
    });

    // 出荷予定日
    const today = new Date();
    const shipDate = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, "0")}/${String(today.getDate()).padStart(2, "0")}`;

    // 日本郵便設定を取得してCSV生成
    const jpConfig = await getJapanPostConfig(tenantId ?? undefined);
    const csv = generateJapanPostCsvWithOptions(csvData, jpConfig, shipDate);

    logAudit(req, "shipping.export_japanpost", "shipping", "export");
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="japanpost_${today.toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("[export-japanpost] error:", error);
    return serverError(error instanceof Error ? error.message : "Server error");
  }
}
