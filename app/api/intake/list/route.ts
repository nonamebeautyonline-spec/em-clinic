// app/api/intake/list/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const LIST_URL = process.env.GAS_INTAKE_LIST_URL as string;
const USE_SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function GET(req: Request) {
  try {
    // クエリパラメータを取得
    const { searchParams } = new URL(req.url);
    const fromDate = searchParams.get("from");
    const toDate = searchParams.get("to");

    // ★ Supabase優先（設定されている場合）
    if (USE_SUPABASE) {
      console.log("[intake/list] Using Supabase");

      // ★ キャンセル除外のため、reservationsテーブルから有効なreserve_idを取得
      let validReserveIds: Set<string> | null = null;

      if (fromDate && toDate) {
        const { data: reservationsData } = await supabase
          .from("reservations")
          .select("reserve_id")
          .gte("reserved_date", fromDate)
          .lte("reserved_date", toDate)
          .neq("status", "canceled")
          .limit(100000);

        if (reservationsData) {
          validReserveIds = new Set(reservationsData.map((r: any) => r.reserve_id));
          console.log(`[Supabase] Valid (non-canceled) reservations: ${validReserveIds.size}`);
        }
      }

      let query = supabase
        .from("intake")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100000);

      // 日付フィルタ（reserved_dateで絞り込み）
      if (fromDate && toDate) {
        query = query
          .gte("reserved_date", fromDate)
          .lte("reserved_date", toDate)
          .not("reserved_date", "is", null);  // reserved_dateがnullでないもののみ
      }

      const { data, error } = await query;

      if (error) {
        console.error("[Supabase] query error:", error);
        // Supabaseエラー時はGASにフォールバック
        console.log("[intake/list] Falling back to GAS");
      } else {
        // ★ キャンセル済み予約を除外
        let filteredData = data;
        if (validReserveIds) {
          filteredData = data.filter((row: any) => {
            // reserve_idがない場合は含める（予約なし問診）
            if (!row.reserve_id) return true;
            // reserve_idがある場合、有効な予約リストに含まれるかチェック
            return validReserveIds!.has(row.reserve_id);
          });
          console.log(`[Supabase] Filtered ${data.length} -> ${filteredData.length} (excluded canceled)`);
        }

        // Supabaseから取得成功
        const rows = filteredData.map((row: any) => ({
          reserveId: row.reserve_id || "",  // フロントエンド互換のためcamelCase
          reserve_id: row.reserve_id || "",
          patient_id: row.patient_id,
          reserved_date: row.reserved_date || "",
          reserved_time: row.reserved_time || "",
          予約時間: row.reserved_time || "",  // フロントエンド互換
          status: row.status || "",
          note: row.note || "",
          prescription_menu: row.prescription_menu || "",
          line_id: row.line_id,
          answerer_id: row.answerer_id,
          created_at: row.created_at,
          call_status: row.call_status || "",  // 不通フラグ
          call_status_updated_at: row.call_status_updated_at || "",
          ...(row.answers || {}),  // Spread answers JSONB to flatten structure
          // ★ answersのnameが空の場合があるので、patient_nameを最後に設定
          patient_name: row.patient_name,
          name: row.patient_name,  // フロントエンド互換（answersのnameを上書き）
        }));

        console.log(`[Supabase] Retrieved ${rows.length} rows`);
        return NextResponse.json({ ok: true, rows });
      }
    }

    // ★ GASにフォールバック（Supabase未設定 or エラー時）
    console.log("[intake/list] Using GAS");

    if (!LIST_URL) {
      console.error("GAS_INTAKE_LIST_URL is not set");
      return NextResponse.json(
        { ok: false, error: "LIST_URL not set" },
        { status: 500 }
      );
    }

    let gasUrl = LIST_URL;
    if (fromDate || toDate) {
      const params = new URLSearchParams();
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);
      gasUrl = `${LIST_URL}?${params.toString()}`;
    }

    const res = await fetch(gasUrl, {
      method: "GET",
    });

    const text = await res.text();
    console.log("intake list raw:", text.slice(0, 200));

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: "GAS error", detail: text },
        { status: 500 }
      );
    }

    let rows: any[] = [];
    try {
      rows = JSON.parse(text);
    } catch (e) {
      console.error("JSON parse error:", e);
      return NextResponse.json(
        { ok: false, error: "parse error", detail: String(e) },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, rows });
  } catch (err) {
    console.error("intake list API error:", err);
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}
