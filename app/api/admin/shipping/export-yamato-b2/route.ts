import { NextRequest, NextResponse } from "next/server";
import { notFound, serverError, unauthorized } from "@/lib/api-error";
import { createClient } from "@supabase/supabase-js";
import { generateYamatoB2Csv } from "@/utils/yamato-b2-formatter";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow, strictWithTenant } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { exportYamatoB2Schema } from "@/lib/validations/shipping";
import { getYamatoConfig } from "@/lib/shipping/config";
import { logAudit } from "@/lib/audit";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    // 認証チェック（クッキーまたはBearerトークン）
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) {
      return unauthorized();
    }

    const tenantId = resolveTenantIdOrThrow(req);

    const parsed = await parseBody(req, exportYamatoB2Schema);
    if ("error" in parsed) return parsed.error;
    const { order_ids: orderIds } = parsed.data;

    // ordersテーブルから注文情報を取得
    const { data: orders, error: ordersError } = await strictWithTenant(
      supabase.from("orders").select("id, patient_id, shipping_name, shipping_postal, shipping_address, shipping_phone, shipping_email, custom_sender_name, item_name_cosmetics, use_hexidin").in("id", orderIds),
      tenantId
    );

    if (ordersError) {
      console.error("Supabase orders error:", ordersError);
      return NextResponse.json({ ok: false, error: "Database error", details: ordersError.message }, { status: 500 });
    }

    if (!orders || orders.length === 0) {
      return notFound("No orders found");
    }

    // 患者IDを取得
    const patientIds = [...new Set(orders.map((o) => o.patient_id))];

    // 患者情報を取得（patientsテーブルから）
    const { data: patients, error: patientsError } = await strictWithTenant(
      supabase.from("patients").select("patient_id, name, tel").in("patient_id", patientIds),
      tenantId
    );

    if (patientsError) {
      console.error("Supabase patients error:", patientsError);
      return NextResponse.json({ ok: false, error: "Database error", details: patientsError.message }, { status: 500 });
    }

    // 患者情報のマップを作成（住所等は orders テーブルから取得するため最小限）
    const patientMap = new Map();
    (patients || []).forEach((p) => {
      patientMap.set(p.patient_id, {
        name: p.name || "",
        postal: "",
        address: "",
        phone: p.tel || "",
        email: "",
      });
    });

    // CSV用のデータを準備（orders + patients フォールバック）
    const csvData = orders.map((order) => {
      const pt = patientMap.get(order.patient_id) || {};
      return {
        payment_id: order.id,
        name: order.shipping_name || pt.name || "",
        postal: order.shipping_postal || pt.postal || "",
        address: order.shipping_address || pt.address || "",
        email: order.shipping_email || pt.email || "",
        phone: order.shipping_phone || pt.phone || "",
        // 発送オプション
        customSenderName: order.custom_sender_name || null,
        useHexidin: order.use_hexidin || false,
      };
    });

    // 出荷予定日（今日の日付 yyyy/MM/dd）
    const today = new Date();
    const shipDate = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, "0")}/${String(
      today.getDate()
    ).padStart(2, "0")}`;

    // 管理画面の配送設定をDB→CSV生成に反映
    const yamatoConfig = await getYamatoConfig(tenantId ?? undefined);
    // 注文ごとの差出人名・ヘキシジン情報を摘要欄に反映
    const csv = generateYamatoB2Csv(
      csvData.map(d => ({
        payment_id: d.payment_id,
        name: d.name,
        postal: d.postal,
        address: d.address,
        email: d.email,
        phone: d.phone,
      })),
      shipDate,
      yamatoConfig,
    );

    // CSVをレスポンスとして返す
    logAudit(req, "shipping.export_b2", "shipping", "export");
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="yamato_b2_${today.toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("API error:", error);
    return serverError(error instanceof Error ? error.message : "Server error");
  }
}
