// app/api/intake/list/route.ts
// intake正規化: reserved_date/time/prescription_menu→reservations、patient_name/line_id→patients
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant } from "@/lib/tenant";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchAll(buildQuery: () => any, pageSize = 5000) {
  const all: any[] = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await buildQuery().range(offset, offset + pageSize - 1);
    if (error) return { data: all, error };
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < pageSize) break;
    offset += pageSize;
  }
  return { data: all, error: null };
}

export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);

  try {
    const { searchParams } = new URL(req.url);
    const fromDate = searchParams.get("from");
    const toDate = searchParams.get("to");

    // ★ reservationsテーブルから日付範囲の有効予約を取得
    let reservationsMap = new Map<string, any>();

    if (fromDate && toDate) {
      const { data: reservationsData } = await fetchAll(() =>
        withTenant(
          supabaseAdmin
            .from("reservations")
            .select("reserve_id, reserved_date, reserved_time, prescription_menu, patient_id, status")
            .gte("reserved_date", fromDate)
            .lte("reserved_date", toDate)
            .neq("status", "canceled"),
          tenantId
        )
      );

      if (reservationsData) {
        for (const r of reservationsData) {
          reservationsMap.set(r.reserve_id, r);
        }
        console.log(`[Supabase] Valid (non-canceled) reservations: ${reservationsMap.size}`);
      }
    }

    // intakeデータ取得（日付フィルタは reservations ベースで適用）
    let intakeData: any[];

    if (fromDate && toDate) {
      // 有効な予約のreserve_idでintakeを取得
      const validReserveIds = [...reservationsMap.keys()];
      if (validReserveIds.length === 0) {
        return NextResponse.json({ ok: true, rows: [] });
      }

      // reserve_idのリストが大きい場合はバッチで取得
      const allIntake: any[] = [];
      for (let i = 0; i < validReserveIds.length; i += 500) {
        const batch = validReserveIds.slice(i, i + 500);
        const { data, error } = await fetchAll(() =>
          withTenant(
            supabaseAdmin
              .from("intake")
              .select("id, patient_id, reserve_id, answerer_id, status, note, answers, created_at, call_status, call_status_updated_at")
              .in("reserve_id", batch)
              .order("created_at", { ascending: false }),
            tenantId
          )
        );
        if (error) {
          console.error("[intake/list] query error:", error);
          return NextResponse.json(
            { ok: false, error: "DB_ERROR", detail: error.message },
            { status: 500 }
          );
        }
        allIntake.push(...(data || []));
      }
      intakeData = allIntake;
    } else {
      // 日付指定なし: 全件取得
      const { data, error } = await fetchAll(() =>
        withTenant(
          supabaseAdmin
            .from("intake")
            .select("id, patient_id, reserve_id, answerer_id, status, note, answers, created_at, call_status, call_status_updated_at")
            .order("created_at", { ascending: false }),
          tenantId
        )
      );

      if (error) {
        console.error("[intake/list] query error:", error);
        return NextResponse.json(
          { ok: false, error: "DB_ERROR", detail: error.message },
          { status: 500 }
        );
      }
      intakeData = data || [];

      // 日付指定なしの場合は reservations マップを構築
      const reserveIds = [...new Set(intakeData.map((i: any) => i.reserve_id).filter(Boolean))];
      if (reserveIds.length > 0) {
        for (let i = 0; i < reserveIds.length; i += 500) {
          const batch = reserveIds.slice(i, i + 500);
          const { data: resData } = await fetchAll(() =>
            withTenant(
              supabaseAdmin
                .from("reservations")
                .select("reserve_id, reserved_date, reserved_time, prescription_menu, status")
                .in("reserve_id", batch),
              tenantId
            )
          );
          for (const r of resData || []) {
            reservationsMap.set(r.reserve_id, r);
          }
        }
      }
    }

    // ★ patients テーブルから患者名・line_id を取得
    const patientIds = [...new Set(intakeData.map((i: any) => i.patient_id).filter(Boolean))];
    const patientsMap = new Map<string, any>();
    if (patientIds.length > 0) {
      for (let i = 0; i < patientIds.length; i += 500) {
        const batch = patientIds.slice(i, i + 500);
        const { data: pData } = await fetchAll(() =>
          withTenant(
            supabaseAdmin
              .from("patients")
              .select("patient_id, name, line_id")
              .in("patient_id", batch),
            tenantId
          )
        );
        for (const p of pData || []) {
          patientsMap.set(p.patient_id, p);
        }
      }
    }

    // ★ 結合してレスポンス構築
    const rows = intakeData.map((row: any) => {
      const res = row.reserve_id ? reservationsMap.get(row.reserve_id) : null;
      const pat = row.patient_id ? patientsMap.get(row.patient_id) : null;
      const patientName = pat?.name || "";

      return {
        reserveId: row.reserve_id || "",
        reserve_id: row.reserve_id || "",
        patient_id: row.patient_id,
        reserved_date: res?.reserved_date || "",
        reserved_time: res?.reserved_time || "",
        予約時間: res?.reserved_time || "",
        status: row.status || "",
        note: row.note || "",
        prescription_menu: res?.prescription_menu || "",
        line_id: pat?.line_id || null,
        answerer_id: row.answerer_id,
        created_at: row.created_at,
        call_status: row.call_status || "",
        call_status_updated_at: row.call_status_updated_at || "",
        ...(row.answers || {}),
        // ★ answersのnameが空の場合があるので、patient_nameを最後に設定
        patient_name: patientName,
        name: patientName,
      };
    });

    console.log(`[intake/list] Retrieved ${rows.length} rows`);
    return NextResponse.json({ ok: true, rows });
  } catch (err) {
    console.error("intake list API error:", err);
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}
