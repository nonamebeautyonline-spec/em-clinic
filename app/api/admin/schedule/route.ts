import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const doctor_id = searchParams.get("doctor_id") || "";
  const start = searchParams.get("start") || "";
  const end = searchParams.get("end") || "";

  try {
    // doctors取得
    const { data: doctorsData, error: doctorsError } = await supabaseAdmin
      .from("doctors")
      .select("*")
      .order("sort_order");

    if (doctorsError) {
      console.error("doctors fetch error:", doctorsError);
      return NextResponse.json({ ok: false, error: "DB_ERROR" }, { status: 500 });
    }

    // フォーマット変換
    const doctors = (doctorsData || []).map((d) => ({
      doctor_id: d.doctor_id,
      doctor_name: d.doctor_name,
      is_active: d.is_active,
      sort_order: d.sort_order,
      color: d.color,
    }));

    // weekly_rules取得
    let rulesQuery = supabaseAdmin.from("doctor_weekly_rules").select("*");
    if (doctor_id) {
      rulesQuery = rulesQuery.eq("doctor_id", doctor_id);
    }
    const { data: rulesData, error: rulesError } = await rulesQuery;

    if (rulesError) {
      console.error("weekly_rules fetch error:", rulesError);
      return NextResponse.json({ ok: false, error: "DB_ERROR" }, { status: 500 });
    }

    // フォーマット変換（TIME型 → "HH:MM"文字列）
    const weekly_rules = (rulesData || []).map((r) => ({
      doctor_id: r.doctor_id,
      weekday: r.weekday,
      enabled: r.enabled,
      start_time: formatTime(r.start_time),
      end_time: formatTime(r.end_time),
      slot_minutes: r.slot_minutes,
      capacity: r.capacity,
      updated_at: r.updated_at,
    }));

    // date_overrides取得
    let overridesQuery = supabaseAdmin.from("doctor_date_overrides").select("*");
    if (doctor_id) {
      overridesQuery = overridesQuery.eq("doctor_id", doctor_id);
    }
    if (start) {
      overridesQuery = overridesQuery.gte("date", start);
    }
    if (end) {
      overridesQuery = overridesQuery.lte("date", end);
    }
    overridesQuery = overridesQuery.order("date", { ascending: true });

    const { data: overridesData, error: overridesError } = await overridesQuery;

    if (overridesError) {
      console.error("date_overrides fetch error:", overridesError);
      return NextResponse.json({ ok: false, error: "DB_ERROR" }, { status: 500 });
    }

    // フォーマット変換
    const overrides = (overridesData || []).map((o) => ({
      doctor_id: o.doctor_id,
      date: o.date,
      type: o.type,
      slot_name: o.slot_name || null,
      start_time: formatTime(o.start_time),
      end_time: formatTime(o.end_time),
      slot_minutes: o.slot_minutes,
      capacity: o.capacity,
      memo: o.memo,
      updated_at: o.updated_at,
    }));

    return NextResponse.json({
      ok: true,
      doctors,
      weekly_rules,
      overrides,
    });
  } catch (error) {
    console.error("schedule API error:", error);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}

// TIME型（"HH:MM:SS"）を "HH:MM" に変換
function formatTime(time: string | null): string {
  if (!time) return "";
  // "10:00:00" → "10:00"
  const match = time.match(/^(\d{2}):(\d{2})/);
  if (match) {
    return `${match[1]}:${match[2]}`;
  }
  return time;
}
