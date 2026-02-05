import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateYamatoB2Csv } from "@/utils/yamato-b2-formatter";
import { verifyAdminAuth } from "@/lib/admin-auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    // 認証チェック（クッキーまたはBearerトークン）
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const orderIds = body.order_ids || [];

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json({ error: "order_ids required" }, { status: 400 });
    }

    // ordersテーブルから注文情報を取得
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("id, patient_id")
      .in("id", orderIds);

    if (ordersError) {
      console.error("Supabase orders error:", ordersError);
      return NextResponse.json(
        { error: "Database error", details: ordersError.message },
        { status: 500 }
      );
    }

    if (!orders || orders.length === 0) {
      return NextResponse.json({ error: "No orders found" }, { status: 404 });
    }

    // 患者IDを取得
    const patientIds = [...new Set(orders.map((o: any) => o.patient_id))];

    // 患者情報を取得（intakeテーブルから）
    const { data: patients, error: patientsError } = await supabase
      .from("intake")
      .select("patient_id, patient_name, postal_code, address, phone_number, email")
      .in("patient_id", patientIds);

    if (patientsError) {
      console.error("Supabase patients error:", patientsError);
      return NextResponse.json(
        { error: "Database error", details: patientsError.message },
        { status: 500 }
      );
    }

    // 患者情報のマップを作成
    const patientMap = new Map();
    (patients || []).forEach((p: any) => {
      patientMap.set(p.patient_id, {
        name: p.patient_name || "",
        postal: p.postal_code || "",
        address: p.address || "",
        phone: p.phone_number || "",
        email: p.email || "",
      });
    });

    // CSV用のデータを準備
    const csvData = orders.map((order: any) => {
      const patient = patientMap.get(order.patient_id) || {};
      return {
        payment_id: order.id,
        name: patient.name || "",
        postal: patient.postal || "",
        address: patient.address || "",
        email: patient.email || "",
        phone: patient.phone || "",
      };
    });

    // 出荷予定日（今日の日付 yyyy/MM/dd）
    const today = new Date();
    const shipDate = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, "0")}/${String(
      today.getDate()
    ).padStart(2, "0")}`;

    // CSV生成
    const csv = generateYamatoB2Csv(csvData, shipDate);

    // CSVをレスポンスとして返す
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="yamato_b2_${today.toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}
