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

    // 全注文履歴を取得（処方履歴）
    const { data: allOrders } = await supabaseAdmin
      .from("orders")
      .select("id, product_code, amount, payment_method, shipping_date, tracking_number, created_at, postal_code, address, phone, email")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })
      .limit(10);

    // 最新注文（配送情報表示用）
    const latestOrder = allOrders?.[0] || null;

    // 再処方履歴を取得（最新5件）
    const { data: reorders } = await supabaseAdmin
      .from("reorders")
      .select("id, gas_row_number, product_code, status, created_at, approved_at")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })
      .limit(5);

    // 銀行振込申請中（未確認）を確認
    const { data: pendingBankTransfer } = await supabaseAdmin
      .from("bank_transfer_orders")
      .select("id, product_code, created_at, confirmed_at")
      .eq("patient_id", patientId)
      .is("confirmed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // フォーマット
    const formattedLatestOrder = latestOrder ? {
      date: latestOrder.shipping_date || latestOrder.created_at?.slice(0, 10) || "-",
      product: formatProductCode(latestOrder.product_code),
      amount: latestOrder.amount ? `¥${latestOrder.amount.toLocaleString()}` : "-",
      payment: formatPaymentMethod(latestOrder.payment_method),
      tracking: latestOrder.tracking_number || "-",
      postal_code: latestOrder.postal_code || "",
      address: latestOrder.address || "",
      phone: latestOrder.phone || "",
      email: latestOrder.email || "",
    } : null;

    const formattedReorders = (reorders || []).map(r => ({
      id: r.gas_row_number,
      date: formatDateJST(r.created_at),
      product: formatProductCode(r.product_code),
      status: formatStatus(r.status),
    }));

    // 銀行振込申請中情報
    const pendingBankInfo = pendingBankTransfer ? {
      product: formatProductCode(pendingBankTransfer.product_code),
      date: formatDateJST(pendingBankTransfer.created_at),
    } : null;

    // 処方履歴（日付とメニューのみ）
    const orderHistory = (allOrders || []).map(o => ({
      date: o.shipping_date || o.created_at?.slice(0, 10) || "-",
      product: formatProductCode(o.product_code),
    }));

    return NextResponse.json({
      found: true,
      patient: {
        id: patientId,
        name: patientName,
        lstep_uid: intakeData?.answerer_id || "",
      },
      latestOrder: formattedLatestOrder,
      orderHistory,
      reorders: formattedReorders,
      pendingBankTransfer: pendingBankInfo,
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
  if (method === "card" || method === "CARD" || method === "credit_card") return "カード";
  if (method === "bank" || method === "BANK_TRANSFER" || method === "bank_transfer") return "銀行振込";
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
