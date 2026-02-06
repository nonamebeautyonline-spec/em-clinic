import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAdminAuth } from "@/lib/admin-auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest) {
  try {
    // 認証チェック（クッキーまたはBearerトークン）
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // クエリパラメータ取得: date=YYYY-MM-DD, month=YYYY-MM, or from=YYYY-MM-DD
    const searchParams = req.nextUrl.searchParams;
    const dateParam = searchParams.get("date");
    const monthParam = searchParams.get("month"); // 月指定（YYYY-MM）
    const fromParam = searchParams.get("from"); // 以降の予約を全て取得（YYYY-MM-DD）

    // from指定がある場合は、その日以降の予約を全て取得
    if (fromParam) {
      const { data: futureReservations, error: futureError } = await supabase
        .from("reservations")
        .select("*")
        .gte("reserved_date", fromParam)
        .neq("status", "canceled")
        .order("reserved_date", { ascending: true })
        .order("reserved_time", { ascending: true });

      if (futureError) {
        console.error("Supabase reservations error:", futureError);
        return NextResponse.json({ ok: false, error: "Database error" }, { status: 500 });
      }

      return NextResponse.json({
        ok: true,
        from: fromParam,
        reservations: (futureReservations || []).map((r: any) => ({
          id: r.id,
          reserve_id: r.reserve_id,
          patient_id: r.patient_id,
          patient_name: r.patient_name,
          reserved_date: r.reserved_date,
          reserved_time: r.reserved_time,
          status: r.status,
        })),
      });
    }

    // 月指定がある場合は、その月の予約を全て取得
    if (monthParam) {
      const [year, month] = monthParam.split("-").map(Number);
      if (!year || !month || month < 1 || month > 12) {
        return NextResponse.json({ ok: false, error: "Invalid month format. Use YYYY-MM" }, { status: 400 });
      }

      const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

      // reservationsテーブルから月の予約を取得
      const { data: monthReservations, error: monthError } = await supabase
        .from("reservations")
        .select("*")
        .gte("reserved_date", startDate)
        .lte("reserved_date", endDate)
        .order("reserved_date", { ascending: true })
        .order("reserved_time", { ascending: true });

      if (monthError) {
        console.error("Supabase reservations error:", monthError);
        return NextResponse.json({ ok: false, error: "Database error" }, { status: 500 });
      }

      return NextResponse.json({
        ok: true,
        month: monthParam,
        reservations: (monthReservations || []).map((r: any) => ({
          id: r.id,
          reserve_id: r.reserve_id,
          patient_id: r.patient_id,
          patient_name: r.patient_name,
          reserved_date: r.reserved_date,
          reserved_time: r.reserved_time,
          status: r.status,
        })),
      });
    }

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
      line_uid: row.line_id || "",
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
