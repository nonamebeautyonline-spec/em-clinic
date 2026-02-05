// 患者クイック検索API
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

export async function GET(req: NextRequest) {
  try {
    // 認証チェック
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.trim() || "";

    if (!query) {
      return NextResponse.json({ error: "検索キーワードを入力してください" }, { status: 400 });
    }

    // PIDで検索（完全一致または前方一致）
    let patientId = "";
    let patientName = "";

    // まずintakeテーブルで検索
    const { data: intakeData } = await supabaseAdmin
      .from("intake")
      .select("patient_id, patient_name, line_id, answerer_id")
      .or(`patient_id.ilike.%${query}%,patient_name.ilike.%${query}%`)
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (intakeData) {
      patientId = intakeData.patient_id;
      patientName = intakeData.patient_name || "-";
    } else {
      // ordersテーブルでも検索
      const { data: orderData } = await supabaseAdmin
        .from("orders")
        .select("patient_id")
        .ilike("patient_id", `%${query}%`)
        .limit(1)
        .maybeSingle();

      if (orderData) {
        patientId = orderData.patient_id;
      }
    }

    if (!patientId) {
      return NextResponse.json({
        found: false,
        message: "患者が見つかりませんでした"
      });
    }

    // 注文履歴を取得（最新10件）
    const { data: orders } = await supabaseAdmin
      .from("orders")
      .select("id, product_code, amount, payment_method, shipping_date, tracking_number, created_at")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })
      .limit(10);

    // 再処方履歴を取得（最新5件）
    const { data: reorders } = await supabaseAdmin
      .from("reorders")
      .select("id, gas_row_number, product_code, status, created_at, approved_at")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })
      .limit(5);

    // 処方サマリーを計算
    const prescriptionSummary: Record<string, number> = {};
    for (const order of orders || []) {
      const code = order.product_code || "unknown";
      prescriptionSummary[code] = (prescriptionSummary[code] || 0) + 1;
    }

    // フォーマット
    const formattedOrders = (orders || []).map(o => ({
      date: o.shipping_date || o.created_at?.slice(0, 10) || "-",
      product: formatProductCode(o.product_code),
      amount: o.amount ? `¥${o.amount.toLocaleString()}` : "-",
      payment: formatPaymentMethod(o.payment_method),
      tracking: o.tracking_number || "-",
    }));

    const formattedReorders = (reorders || []).map(r => ({
      id: r.gas_row_number,
      date: formatDateJST(r.created_at),
      product: formatProductCode(r.product_code),
      status: formatStatus(r.status),
    }));

    return NextResponse.json({
      found: true,
      patient: {
        id: patientId,
        name: patientName,
        lstep_uid: intakeData?.answerer_id || "",
      },
      orders: formattedOrders,
      reorders: formattedReorders,
      summary: Object.entries(prescriptionSummary).map(([code, count]) => ({
        product: formatProductCode(code),
        count,
      })),
      totalOrders: orders?.length || 0,
    });
  } catch (error) {
    console.error("Patient lookup error:", error);
    return NextResponse.json(
      { error: "検索中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

function formatProductCode(code: string | null): string {
  if (!code) return "-";
  return code
    .replace("MJL_", "マンジャロ ")
    .replace("_", " ")
    .replace("1m", "1ヶ月")
    .replace("2m", "2ヶ月")
    .replace("3m", "3ヶ月");
}

function formatPaymentMethod(method: string | null): string {
  if (!method) return "-";
  if (method === "card" || method === "CARD") return "カード";
  if (method === "bank" || method === "BANK_TRANSFER") return "銀行振込";
  return method;
}

function formatStatus(status: string | null): string {
  if (!status) return "-";
  const map: Record<string, string> = {
    pending: "承認待ち",
    confirmed: "承認済み",
    paid: "決済済み",
    rejected: "却下",
    canceled: "キャンセル",
  };
  return map[status] || status;
}

function formatDateJST(dateStr: string | null): string {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
    const month = String(jst.getUTCMonth() + 1).padStart(2, "0");
    const day = String(jst.getUTCDate()).padStart(2, "0");
    const hours = String(jst.getUTCHours()).padStart(2, "0");
    const minutes = String(jst.getUTCMinutes()).padStart(2, "0");
    return `${month}/${day} ${hours}:${minutes}`;
  } catch {
    return dateStr.slice(0, 10);
  }
}
