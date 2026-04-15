// app/api/doctor/intake-list/route.ts — Doctor用intake一覧API
// intake正規化: reserved_date/time/prescription_menu→reservations、patient_name/line_id→patients
import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyDoctorAuth } from "@/lib/admin-auth";
import { resolveTenantId, strictWithTenant } from "@/lib/tenant";
import { getSetting } from "@/lib/settings";

interface SupabasePaginatedQuery {
  range(from: number, to: number): PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>;
}

async function fetchAll(buildQuery: () => SupabasePaginatedQuery, pageSize = 5000) {
  const all: unknown[] = [];
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

interface ReservationRow {
  reserve_id: string;
  reserved_date: string | null;
  reserved_time: string | null;
  prescription_menu: string | null;
  patient_id?: string;
  status: string | null;
}

interface IntakeRow {
  id: string;
  patient_id: string;
  reserve_id: string | null;
  answerer_id: string | null;
  status: string | null;
  note: string | null;
  answers: Record<string, unknown> | null;
  created_at: string | null;
  call_status: string | null;
  call_status_updated_at: string | null;
}

interface PatientRow {
  patient_id: string;
  name: string | null;
  line_id: string | null;
  tel: string | null;
}

export async function GET(req: NextRequest) {
  const isAuthorized = await verifyDoctorAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantId(req);
  if (!tenantId) {
    return NextResponse.json({ ok: false, error: "テナントIDが特定できません" }, { status: 400 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const fromDate = searchParams.get("from");
    const toDate = searchParams.get("to");

    // カルテモード取得
    const karteMode = (await getSetting("consultation", "karte_mode", tenantId)) || "reservation";

    if (karteMode === "intake_completion") {
      return handleIntakeCompletionMode(tenantId, fromDate, toDate);
    }

    // reservation モード
    let reservationsMap = new Map<string, ReservationRow>();

    if (fromDate && toDate) {
      const { data: reservationsData } = await fetchAll(() =>
        strictWithTenant(
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
        for (const r of reservationsData as unknown as ReservationRow[]) {
          reservationsMap.set(r.reserve_id, r);
        }
      }
    }

    let intakeData: IntakeRow[];

    if (fromDate && toDate) {
      const validReserveIds = [...reservationsMap.keys()];
      if (validReserveIds.length === 0) {
        return NextResponse.json({ ok: true, rows: [] });
      }

      const allIntake: IntakeRow[] = [];
      for (let i = 0; i < validReserveIds.length; i += 500) {
        const batch = validReserveIds.slice(i, i + 500);
        const { data, error } = await fetchAll(() =>
          strictWithTenant(
            supabaseAdmin
              .from("intake")
              .select("id, patient_id, reserve_id, answerer_id, status, note, answers, created_at, call_status, call_status_updated_at")
              .in("reserve_id", batch)
              .order("created_at", { ascending: false }),
            tenantId
          )
        );
        if (error) {
          console.error("[doctor/intake-list] query error:", error);
          return NextResponse.json({ ok: false, error: "DB_ERROR", detail: error.message }, { status: 500 });
        }
        allIntake.push(...(data || []) as unknown as IntakeRow[]);
      }
      intakeData = allIntake;
    } else {
      const { data, error } = await fetchAll(() =>
        strictWithTenant(
          supabaseAdmin
            .from("intake")
            .select("id, patient_id, reserve_id, answerer_id, status, note, answers, created_at, call_status, call_status_updated_at")
            .order("created_at", { ascending: false }),
          tenantId
        )
      );

      if (error) {
        console.error("[doctor/intake-list] query error:", error);
        return NextResponse.json({ ok: false, error: "DB_ERROR", detail: error.message }, { status: 500 });
      }
      intakeData = (data || []) as unknown as IntakeRow[];

      const reserveIds = [...new Set(intakeData.map((i: IntakeRow) => i.reserve_id).filter(Boolean))] as string[];
      if (reserveIds.length > 0) {
        for (let i = 0; i < reserveIds.length; i += 500) {
          const batch = reserveIds.slice(i, i + 500);
          const { data: resData } = await fetchAll(() =>
            strictWithTenant(
              supabaseAdmin
                .from("reservations")
                .select("reserve_id, reserved_date, reserved_time, prescription_menu, status")
                .in("reserve_id", batch),
              tenantId
            )
          );
          for (const r of (resData || []) as unknown as ReservationRow[]) {
            reservationsMap.set(r.reserve_id, r);
          }
        }
      }
    }

    // patients テーブルから患者名・line_id を取得
    const patientIds = [...new Set(intakeData.map((i: IntakeRow) => i.patient_id).filter(Boolean))];
    const patientsMap = new Map<string, PatientRow>();
    if (patientIds.length > 0) {
      for (let i = 0; i < patientIds.length; i += 500) {
        const batch = patientIds.slice(i, i + 500);
        const { data: pData } = await fetchAll(() =>
          strictWithTenant(
            supabaseAdmin
              .from("patients")
              .select("patient_id, name, line_id, tel")
              .in("patient_id", batch),
            tenantId
          )
        );
        for (const p of (pData || []) as unknown as PatientRow[]) {
          patientsMap.set(p.patient_id, p);
        }
      }
    }

    const rows = intakeData.map((row: IntakeRow) => {
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
        tel: pat?.tel || "",
        line_id: pat?.line_id || null,
        answerer_id: row.answerer_id,
        created_at: row.created_at,
        call_status: row.call_status || "",
        call_status_updated_at: row.call_status_updated_at || "",
        ...(row.answers || {}),
        patient_name: patientName,
        name: patientName,
      };
    });

    return NextResponse.json({ ok: true, rows });
  } catch (err) {
    console.error("doctor/intake-list API error:", err);
    return serverError(String(err));
  }
}

// intake_completion モード
async function handleIntakeCompletionMode(tenantId: string, fromDate: string | null, toDate: string | null) {
  try {
    let intakeData: IntakeRow[];

    if (fromDate && toDate) {
      const { data, error } = await fetchAll(() =>
        strictWithTenant(
          supabaseAdmin
            .from("intake")
            .select("id, patient_id, reserve_id, answerer_id, status, note, answers, created_at, call_status, call_status_updated_at")
            .not("answers", "is", null)
            .gte("created_at", `${fromDate}T00:00:00+09:00`)
            .lte("created_at", `${toDate}T23:59:59+09:00`)
            .order("created_at", { ascending: false }),
          tenantId
        )
      );
      if (error) {
        console.error("[doctor/intake-list:intake_completion] query error:", error);
        return NextResponse.json({ ok: false, error: "DB_ERROR", detail: error.message }, { status: 500 });
      }
      intakeData = ((data || []) as unknown as IntakeRow[]).filter(
        (r) => r.answers && Object.keys(r.answers).length > 0
      );
    } else {
      const { data, error } = await fetchAll(() =>
        strictWithTenant(
          supabaseAdmin
            .from("intake")
            .select("id, patient_id, reserve_id, answerer_id, status, note, answers, created_at, call_status, call_status_updated_at")
            .not("answers", "is", null)
            .order("created_at", { ascending: false }),
          tenantId
        )
      );
      if (error) {
        console.error("[doctor/intake-list:intake_completion] query error:", error);
        return NextResponse.json({ ok: false, error: "DB_ERROR", detail: error.message }, { status: 500 });
      }
      intakeData = ((data || []) as unknown as IntakeRow[]).filter(
        (r) => r.answers && Object.keys(r.answers).length > 0
      );
    }

    const patientIds = [...new Set(intakeData.map((i) => i.patient_id).filter(Boolean))];
    const patientsMap = new Map<string, PatientRow>();
    if (patientIds.length > 0) {
      for (let i = 0; i < patientIds.length; i += 500) {
        const batch = patientIds.slice(i, i + 500);
        const { data: pData } = await fetchAll(() =>
          strictWithTenant(
            supabaseAdmin
              .from("patients")
              .select("patient_id, name, line_id, tel")
              .in("patient_id", batch),
            tenantId
          )
        );
        for (const p of (pData || []) as unknown as PatientRow[]) {
          patientsMap.set(p.patient_id, p);
        }
      }
    }

    const rows = intakeData.map((row: IntakeRow) => {
      const pat = row.patient_id ? patientsMap.get(row.patient_id) : null;
      const patientName = pat?.name || "";

      const createdAt = row.created_at ? new Date(row.created_at) : null;
      let createdDate = "";
      let createdTime = "";
      if (createdAt) {
        const jst = new Date(createdAt.getTime() + 9 * 60 * 60 * 1000);
        createdDate = jst.toISOString().slice(0, 10);
        createdTime = jst.toISOString().slice(11, 16);
      }

      return {
        _karte_mode: "intake_completion",
        reserveId: row.reserve_id || `intake_${row.id}`,
        reserve_id: row.reserve_id || `intake_${row.id}`,
        patient_id: row.patient_id,
        reserved_date: createdDate,
        reserved_time: createdTime,
        予約時間: createdTime,
        status: row.status || "",
        note: row.note || "",
        prescription_menu: "",
        tel: pat?.tel || "",
        line_id: pat?.line_id || null,
        answerer_id: row.answerer_id,
        created_at: row.created_at,
        call_status: row.call_status || "",
        call_status_updated_at: row.call_status_updated_at || "",
        ...(row.answers || {}),
        patient_name: patientName,
        name: patientName,
      };
    });

    return NextResponse.json({ ok: true, rows, karteMode: "intake_completion" });
  } catch (err) {
    console.error("doctor/intake-list (intake_completion) API error:", err);
    return serverError(String(err));
  }
}
