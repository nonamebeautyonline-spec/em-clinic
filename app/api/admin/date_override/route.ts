import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const override = body.override || body;

    const doctor_id = String(override.doctor_id || "").trim();
    const date = String(override.date || "").trim();

    if (!doctor_id || !date) {
      return NextResponse.json(
        { ok: false, error: "doctor_id and date required" },
        { status: 400 }
      );
    }

    const record = {
      doctor_id,
      date,
      type: override.type || "modify",
      start_time: override.start_time || null,
      end_time: override.end_time || null,
      slot_minutes: override.slot_minutes === "" || override.slot_minutes == null
        ? null
        : Number(override.slot_minutes),
      capacity: override.capacity === "" || override.capacity == null
        ? null
        : Number(override.capacity),
      memo: override.memo || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabaseAdmin
      .from("doctor_date_overrides")
      .upsert(record, { onConflict: "doctor_id,date" });

    if (error) {
      console.error("date_override upsert error:", error);
      return NextResponse.json(
        { ok: false, error: "DB_ERROR", detail: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, override: record });
  } catch (error) {
    console.error("date_override POST error:", error);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const doctor_id = String(body.doctor_id || "").trim();
    const date = String(body.date || "").trim();

    if (!doctor_id || !date) {
      return NextResponse.json(
        { ok: false, error: "doctor_id and date required" },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from("doctor_date_overrides")
      .delete()
      .eq("doctor_id", doctor_id)
      .eq("date", date);

    if (error) {
      console.error("date_override delete error:", error);
      return NextResponse.json(
        { ok: false, error: "DB_ERROR", detail: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, deleted: { doctor_id, date } });
  } catch (error) {
    console.error("date_override DELETE error:", error);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
