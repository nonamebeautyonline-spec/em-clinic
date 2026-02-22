import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  try {
    // 認証チェック（クッキーまたはBearerトークン）
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = resolveTenantId(req);

    // クエリパラメータ取得: date=YYYY-MM-DD, month=YYYY-MM, from=YYYY-MM-DD, created_date=YYYY-MM-DD
    const searchParams = req.nextUrl.searchParams;
    const dateParam = searchParams.get("date");
    const monthParam = searchParams.get("month"); // 月指定（YYYY-MM）
    const fromParam = searchParams.get("from"); // 以降の予約を全て取得（YYYY-MM-DD）
    const createdDateParam = searchParams.get("created_date"); // 予約取得日で絞り込み（YYYY-MM-DD）

    // created_date指定: その日に作成（取得）された予約を作成時刻順に表示
    if (createdDateParam && /^\d{4}-\d{2}-\d{2}$/.test(createdDateParam)) {
      const startOfDay = `${createdDateParam}T00:00:00+09:00`;
      const endOfDay = `${createdDateParam}T23:59:59+09:00`;

      const { data: createdReservations, error: createdError } = await withTenant(
        supabaseAdmin
          .from("reservations")
          .select("*")
          .gte("created_at", startOfDay)
          .lte("created_at", endOfDay)
          .neq("status", "canceled")
          .order("created_at", { ascending: false })
          .limit(200),
        tenantId
      );

      if (createdError) {
        console.error("Supabase reservations error:", createdError);
        return NextResponse.json({ ok: false, error: "Database error" }, { status: 500 });
      }

      // 患者情報を取得
      const pIds = [...new Set((createdReservations || []).map((r: any) => r.patient_id).filter(Boolean))];
      const pMap2 = new Map<string, { name: string; kana: string; sex: string; birthday: string }>();
      if (pIds.length > 0) {
        const { data: pData } = await withTenant(
          supabaseAdmin.from("patients").select("patient_id, name, name_kana, sex, birthday").in("patient_id", pIds),
          tenantId
        );
        for (const p of pData || []) {
          pMap2.set(p.patient_id, { name: p.name || "", kana: p.name_kana || "", sex: p.sex || "", birthday: p.birthday || "" });
        }
      }

      return NextResponse.json({
        ok: true,
        created_date: createdDateParam,
        reservations: (createdReservations || []).map((r: any) => {
          const patient = pMap2.get(r.patient_id);
          return {
            id: r.id || r.reserve_id,
            reserve_id: r.reserve_id,
            patient_id: r.patient_id,
            patient_name: r.patient_name || patient?.name || "",
            patient_kana: patient?.kana || "",
            patient_sex: patient?.sex || "",
            patient_birthday: patient?.birthday || "",
            reserved_date: r.reserved_date,
            reserved_time: r.reserved_time,
            status: r.status || "pending",
            prescription_menu: r.prescription_menu || "",
            created_at: r.created_at || "",
          };
        }),
      });
    }

    // from指定がある場合は、その日以降の予約を全て取得
    if (fromParam) {
      const { data: futureReservations, error: futureError } = await withTenant(
        supabaseAdmin
          .from("reservations")
          .select("*")
          .gte("reserved_date", fromParam)
          .neq("status", "canceled")
          .order("reserved_date", { ascending: true })
          .order("reserved_time", { ascending: true })
          .limit(100000),
        tenantId
      );

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
      const { data: monthReservations, error: monthError } = await withTenant(
        supabaseAdmin
          .from("reservations")
          .select("*")
          .gte("reserved_date", startDate)
          .lte("reserved_date", endDate)
          .order("reserved_date", { ascending: true })
          .order("reserved_time", { ascending: true })
          .limit(100000),
        tenantId
      );

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

    // reservationsテーブルから予約データを直接取得（キャンセル除外）
    const { data: resvData, error: resvError } = await withTenant(
      supabaseAdmin
        .from("reservations")
        .select("*")
        .eq("reserved_date", targetDate)
        .neq("status", "canceled")
        .order("reserved_time", { ascending: true })
        .limit(100000),
      tenantId
    );

    if (resvError) {
      console.error("Supabase reservations error:", resvError);
      return NextResponse.json({
        error: "Database error",
        details: resvError.message || String(resvError),
        hint: (resvError as any).hint || null
      }, { status: 500 });
    }

    // 患者IDリストからpatientsテーブルで名前・カナ・性別・生年月日・line_idを取得
    const patientIds = [...new Set((resvData || []).map((r: any) => r.patient_id).filter(Boolean))];
    const pMap = new Map<string, { name: string; kana: string; sex: string; birthday: string; line_id: string; tel: string }>();
    if (patientIds.length > 0) {
      const { data: pData } = await withTenant(
        supabaseAdmin
          .from("patients")
          .select("patient_id, name, name_kana, tel, sex, birthday, line_id")
          .in("patient_id", patientIds),
        tenantId
      );
      for (const p of pData || []) {
        pMap.set(p.patient_id, { name: p.name || "", kana: p.name_kana || "", sex: p.sex || "", birthday: p.birthday || "", line_id: p.line_id || "", tel: p.tel || "" });
      }
    }

    // intakeからcall_status, note, answerer_id, statusを取得（reserve_id で紐付け）
    const reserveIds = (resvData || []).map((r: any) => r.reserve_id).filter(Boolean);
    const intakeMap = new Map<string, { call_status: string; note: string; answerer_id: string; intake_status: string | null }>();
    if (reserveIds.length > 0) {
      const { data: intakeData } = await withTenant(
        supabaseAdmin
          .from("intake")
          .select("reserve_id, call_status, note, answerer_id, status")
          .in("reserve_id", reserveIds),
        tenantId
      );
      for (const row of intakeData || []) {
        if (row.reserve_id && !intakeMap.has(row.reserve_id)) {
          intakeMap.set(row.reserve_id, {
            call_status: row.call_status || "",
            note: row.note || "",
            answerer_id: row.answerer_id || "",
            intake_status: row.status || null,
          });
        }
      }
    }

    console.log(`[Admin Reservations] Reservations for ${targetDate}: ${(resvData || []).length}`);

    // レスポンス用に整形
    const reservations = (resvData || []).map((row: any) => {
      const patient = pMap.get(row.patient_id);
      const intake = intakeMap.get(row.reserve_id);
      return {
        id: row.id || row.reserve_id,
        reserve_id: row.reserve_id,
        patient_id: row.patient_id,
        patient_name: row.patient_name || patient?.name || "",
        patient_kana: patient?.kana || "",
        patient_sex: patient?.sex || "",
        patient_birthday: patient?.birthday || "",
        reserved_date: row.reserved_date,
        reserved_time: row.reserved_time,
        status: row.status || "pending",
        phone: patient?.tel || "",
        lstep_uid: intake?.answerer_id || "",
        line_uid: patient?.line_id || "",
        call_status: intake?.call_status || "",
        intake_status: intake?.intake_status || null,
        note: intake?.note || "",
        prescription_menu: row.prescription_menu || "",
      };
    });

    return NextResponse.json({ reservations });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}
