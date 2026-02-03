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

    // クエリパラメータ: include_all=true で全件取得、デフォルトはpendingのみ
    const searchParams = req.nextUrl.searchParams;
    const includeAll = searchParams.get("include_all") === "true";

    // Supabase DBから取得
    let query = supabaseAdmin
      .from("reorders")
      .select("*")
      .order("timestamp", { ascending: false });

    if (!includeAll) {
      query = query.eq("status", "pending");
    }

    const { data: reordersData, error: reordersError } = await query;

    if (reordersError) {
      console.error("Reorders fetch error:", reordersError);
      return NextResponse.json(
        { error: "DB error: " + reordersError.message },
        { status: 500 }
      );
    }

    // 患者名を取得するために、patient_idのリストを作成
    const patientIds = [...new Set((reordersData || []).map((r) => r.patient_id))];

    // patientsテーブルから患者名を取得
    let patientNameMap: Record<string, string> = {};
    if (patientIds.length > 0) {
      const { data: patientsData, error: patientsError } = await supabaseAdmin
        .from("patients")
        .select("patient_id, name")
        .in("patient_id", patientIds);

      if (!patientsError && patientsData) {
        patientNameMap = Object.fromEntries(
          patientsData.map((p) => [p.patient_id, p.name])
        );
      }
    }

    // レスポンス形式に整形（フロントエンドの期待するフォーマット）
    const reorders = (reordersData || []).map((r) => {
      // ステータスの逆マッピング（DB → GAS互換表示）
      let displayStatus = r.status;
      if (displayStatus === "approved") displayStatus = "confirmed";
      if (displayStatus === "cancelled") displayStatus = "canceled";

      return {
        id: String(r.gas_row_number), // フロントエンドはidをgas_row_numberとして使用
        timestamp: formatTimestamp(r.timestamp),
        patient_id: r.patient_id,
        patient_name: patientNameMap[r.patient_id] || "-",
        product_code: r.product_code,
        status: displayStatus,
        note: r.note || "",
        line_uid: r.line_uid || "",
        lstep_uid: r.lstep_uid || "",
      };
    });

    return NextResponse.json({ reorders });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}

// タイムスタンプを見やすい形式に変換
function formatTimestamp(ts: string | null): string {
  if (!ts) return "-";
  try {
    const d = new Date(ts);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${year}/${month}/${day} ${hours}:${minutes}`;
  } catch {
    return ts;
  }
}
