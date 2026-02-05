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
    const searchType = searchParams.get("type") || "id"; // "id" or "name"

    if (!query) {
      return NextResponse.json({ error: "検索キーワードを入力してください" }, { status: 400 });
    }

    let patientId = "";
    let patientName = "";
    let intakeData: { patient_id: string; patient_name: string | null; line_id: string | null; answerer_id: string | null } | null = null;

    // 氏名検索の場合: スペース無視で部分一致、候補リストを返す
    if (searchType === "name") {
      // スペースを除去した検索クエリ
      const normalizedQuery = query.replace(/[\s　]/g, "").toLowerCase();

      // まずilike検索で絞り込み（効率化）
      const searchPattern = `%${query.replace(/[\s　]/g, "%")}%`;
      const { data: candidates } = await supabaseAdmin
        .from("intake")
        .select("patient_id, patient_name, line_id, answerer_id")
        .not("patient_name", "is", null)
        .ilike("patient_name", searchPattern)
        .order("id", { ascending: false })
        .limit(50);

      // スペース無視で部分一致フィルタリング（DB検索で漏れがあった場合のため）
      let matchedCandidates = (candidates || [])
        .filter(c => {
          if (!c.patient_name) return false;
          const normalizedName = c.patient_name.replace(/[\s　]/g, "").toLowerCase();
          return normalizedName.includes(normalizedQuery);
        })
        .slice(0, 10);

      // 候補が見つからない場合、より広範囲に検索
      if (matchedCandidates.length === 0) {
        const { data: allCandidates } = await supabaseAdmin
          .from("intake")
          .select("patient_id, patient_name, line_id, answerer_id")
          .not("patient_name", "is", null)
          .order("id", { ascending: false })
          .limit(1000);

        matchedCandidates = (allCandidates || [])
          .filter(c => {
            if (!c.patient_name) return false;
            const normalizedName = c.patient_name.replace(/[\s　]/g, "").toLowerCase();
            return normalizedName.includes(normalizedQuery);
          })
          .slice(0, 10);
      }

      // 候補が複数ある場合は候補リストを返す
      if (matchedCandidates.length > 1) {
        return NextResponse.json({
          found: false,
          candidates: matchedCandidates.map(c => ({
            id: c.patient_id,
            name: c.patient_name,
          })),
        });
      }

      // 候補が1件の場合はその患者を選択
      if (matchedCandidates.length === 1) {
        intakeData = matchedCandidates[0];
        patientId = intakeData.patient_id;
        patientName = intakeData.patient_name || "-";
      }
    } else {
      // ID検索: 従来通り
      const { data: foundIntake } = await supabaseAdmin
        .from("intake")
        .select("patient_id, patient_name, line_id, answerer_id")
        .ilike("patient_id", `%${query}%`)
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (foundIntake) {
        intakeData = foundIntake;
        patientId = foundIntake.patient_id;
        patientName = foundIntake.patient_name || "-";
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
    }

    if (!patientId) {
      return NextResponse.json({
        found: false,
        candidates: [],
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

    // 銀行振込申請中（未照合）を確認 - ordersテーブルでstatus=pending_confirmationのもの
    const { data: pendingBankTransfer } = await supabaseAdmin
      .from("orders")
      .select("id, product_code, created_at")
      .eq("patient_id", patientId)
      .eq("payment_method", "bank_transfer")
      .eq("status", "pending_confirmation")
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
