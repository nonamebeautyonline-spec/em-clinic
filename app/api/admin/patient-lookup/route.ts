// 患者クイック検索API
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  try {
    // 認証チェック（クッキーまたはBearerトークン）
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.trim() || "";
    const searchType = searchParams.get("type") || "id"; // "id", "name", "answerer_id", or "tracking"

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
    } else if (searchType === "answerer_id") {
      // answerer_id検索: LステップIDで検索
      const { data: foundIntake } = await supabaseAdmin
        .from("intake")
        .select("patient_id, patient_name, line_id, answerer_id")
        .eq("answerer_id", query)
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (foundIntake) {
        intakeData = foundIntake;
        patientId = foundIntake.patient_id;
        patientName = foundIntake.patient_name || "-";
      }
    } else if (searchType === "tracking") {
      // 追跡番号検索: ordersテーブルからpatient_idを取得
      const normalizedTracking = query.replace(/-/g, "");
      const { data: orderData } = await supabaseAdmin
        .from("orders")
        .select("patient_id")
        .or(`tracking_number.eq.${query},tracking_number.eq.${normalizedTracking}`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (orderData) {
        patientId = orderData.patient_id;
        // intakeから患者情報を取得
        const { data: foundIntake } = await supabaseAdmin
          .from("intake")
          .select("patient_id, patient_name, line_id, answerer_id")
          .eq("patient_id", patientId)
          .limit(1)
          .maybeSingle();

        if (foundIntake) {
          intakeData = foundIntake;
          patientName = foundIntake.patient_name || "-";
        }
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
      .select("id, product_code, amount, payment_method, shipping_date, tracking_number, created_at, postal_code, address, phone, email, refund_status")
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

    // 予約を取得（未診察の予約を優先、なければ最新の予約を表示）
    const { data: pendingReservation } = await supabaseAdmin
      .from("intake")
      .select("reserved_date, reserved_time, status")
      .eq("patient_id", patientId)
      .not("reserved_date", "is", null)
      .not("reserved_time", "is", null)
      .or("status.is.null,status.eq.")
      .order("reserved_date", { ascending: true })
      .order("reserved_time", { ascending: true })
      .limit(1)
      .maybeSingle();

    // 未診察の予約がなければ、最新の予約を取得（診察済み含む）
    const nextReservation = pendingReservation ?? (await supabaseAdmin
      .from("intake")
      .select("reserved_date, reserved_time, status")
      .eq("patient_id", patientId)
      .not("reserved_date", "is", null)
      .not("reserved_time", "is", null)
      .order("reserved_date", { ascending: false })
      .order("reserved_time", { ascending: false })
      .limit(1)
      .maybeSingle()
    ).data;

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
      refund_status: latestOrder.refund_status || null,
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
      refund_status: o.refund_status || null,
    }));

    // 次回予約フォーマット（診察済みの場合はステータス付き）
    let formattedReservation: string | null = null;
    if (nextReservation) {
      const base = `${nextReservation.reserved_date} ${nextReservation.reserved_time}`;
      const st = (nextReservation as { status?: string | null }).status;
      if (st === "OK") {
        formattedReservation = `${base}（診察済み）`;
      } else if (st === "NG") {
        formattedReservation = `${base}（NG）`;
      } else {
        formattedReservation = base;
      }
    }

    // 問診情報を取得（answers JSONBから）
    const { data: intakeRecord } = await supabaseAdmin
      .from("intake")
      .select("patient_kana, phone, email, answers, prescription_menu")
      .eq("patient_id", patientId)
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const answers = (intakeRecord?.answers as Record<string, any>) || {};

    // 問診未提出（answersが空 or 問診項目がない）場合は medicalInfo を null にして非表示
    const hasIntakeAnswers = answers && Object.keys(answers).length > 0
      && (answers.current_disease_yesno || answers.glp_history || answers.med_yesno || answers.allergy_yesno);

    const medicalInfo = hasIntakeAnswers ? {
      kana: intakeRecord?.patient_kana || answers?.カナ || answers?.name_kana || "",
      gender: answers?.性別 || answers?.sex || "",
      birthday: answers?.生年月日 || answers?.birth || "",
      medicalHistory: answers?.current_disease_yesno === "yes" ? (answers?.current_disease_detail || "") : "特記事項なし",
      glp1History: answers?.glp_history || "使用歴なし",
      medicationHistory: answers?.med_yesno === "yes" ? (answers?.med_detail || "") : "なし",
      allergies: answers?.allergy_yesno === "yes" ? (answers?.allergy_detail || "") : "アレルギーなし",
      prescriptionMenu: intakeRecord?.prescription_menu || "",
    } : null;

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
      nextReservation: formattedReservation,
      medicalInfo,
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
