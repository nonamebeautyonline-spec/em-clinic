import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const doctor = body.doctor || body;

    const doctor_id = String(doctor.doctor_id || "").trim();
    const doctor_name = String(doctor.doctor_name || "").trim();

    if (!doctor_id) {
      return NextResponse.json({ ok: false, error: "doctor_id required" }, { status: 400 });
    }
    if (!doctor_name) {
      return NextResponse.json({ ok: false, error: "doctor_name required" }, { status: 400 });
    }

    const record = {
      doctor_id,
      doctor_name,
      is_active: doctor.is_active === true,
      sort_order: Number(doctor.sort_order) || 0,
      color: doctor.color || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabaseAdmin
      .from("doctors")
      .upsert(record, { onConflict: "doctor_id" });

    if (error) {
      console.error("doctors upsert error:", error);
      return NextResponse.json(
        { ok: false, error: "DB_ERROR", detail: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, doctor: record });
  } catch (error) {
    console.error("doctors POST error:", error);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
