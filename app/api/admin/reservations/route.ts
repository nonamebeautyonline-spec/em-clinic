import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest) {
  try {
    // 認証チェック
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // クエリパラメータ取得: date=YYYY-MM-DD
    const searchParams = req.nextUrl.searchParams;
    const dateParam = searchParams.get("date");

    // デフォルトは今日（JST）
    let targetDate: string;
    if (dateParam) {
      targetDate = dateParam;
    } else {
      const now = new Date();
      const jstOffset = 9 * 60 * 60 * 1000;
      const jstNow = new Date(now.getTime() + jstOffset);
      targetDate = jstNow.toISOString().slice(0, 10);
    }

    // ★ キャンセル除外のため、reservationsテーブルから有効なreserve_idを取得
    const { data: reservationsData } = await supabase
      .from("reservations")
      .select("reserve_id")
      .eq("reserved_date", targetDate)
      .neq("status", "canceled");

    const validReserveIds = reservationsData
      ? new Set(reservationsData.map((r: any) => r.reserve_id))
      : new Set();

    console.log(`[Admin Reservations] Valid (non-canceled) reservations for ${targetDate}: ${validReserveIds.size}`);

    // intakeテーブルから予約データを取得（reserved_dateで日付フィルタ）
    const { data, error } = await supabase
      .from("intake")
      .select("*")
      .eq("reserved_date", targetDate)
      .not("reserved_date", "is", null)
      .order("reserved_time", { ascending: true });

    if (error) {
      console.error("Supabase intake error:", error);
      return NextResponse.json({
        error: "Database error",
        details: error.message || String(error),
        hint: error.hint || null
      }, { status: 500 });
    }

    // ★ キャンセル済み予約を除外
    const filteredData = data.filter((row: any) => {
      // reserve_idがない場合は含める（予約なし問診）
      if (!row.reserve_id) return true;
      // reserve_idがある場合、有効な予約リストに含まれるかチェック
      return validReserveIds.has(row.reserve_id);
    });

    console.log(`[Admin Reservations] Filtered ${data.length} -> ${filteredData.length} (excluded canceled)`);

    // レスポンス用に整形
    const reservations = (filteredData || []).map((row: any) => ({
      id: row.id || row.reserve_id,
      reserve_id: row.reserve_id,
      patient_id: row.patient_id,
      patient_name: row.patient_name || row.name || "",
      reserved_date: row.reserved_date,
      reserved_time: row.reserved_time,
      status: row.status || "pending",
      phone: row.phone || "",
      lstep_uid: row.answerer_id || "",
      call_status: row.call_status || "",
      note: row.note || "",
      prescription_menu: row.prescription_menu || "",
    }));

    return NextResponse.json({ reservations });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}
