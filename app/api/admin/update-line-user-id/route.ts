// app/api/admin/update-line-user-id/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const GAS_INTAKE_URL = process.env.GAS_MYPAGE_URL; // intake GAS (問診マスター)

export async function POST(req: NextRequest) {
  try {
    // ★ ADMIN_TOKEN チェック
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const patientId = body.patient_id || body.patientId || "";
    const lineUserId = body.line_user_id !== undefined ? String(body.line_user_id) : null;

    if (!patientId) {
      return NextResponse.json({ ok: false, error: "patient_id required" }, { status: 400 });
    }

    if (lineUserId === null) {
      return NextResponse.json({ ok: false, error: "line_user_id required" }, { status: 400 });
    }

    if (!GAS_INTAKE_URL) {
      console.error("[update-line-user-id] GAS_INTAKE_URL not configured");
      return NextResponse.json({ ok: false, error: "server_config_error" }, { status: 500 });
    }

    // ★ GAS update_line_user_id を呼び出し
    const gasResponse = await fetch(GAS_INTAKE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "update_line_user_id",
        patient_id: patientId,
        line_user_id: lineUserId,
      }),
      signal: AbortSignal.timeout(10000), // 10秒タイムアウト
    });

    const gasText = await gasResponse.text().catch(() => "");
    let gasData: any = {};

    try {
      gasData = gasText ? JSON.parse(gasText) : {};
    } catch {
      console.error("[update-line-user-id] GAS returned invalid JSON");
      return NextResponse.json({ ok: false, error: "gas_invalid_response" }, { status: 500 });
    }

    if (!gasResponse.ok || !gasData.ok) {
      console.error(`[update-line-user-id] GAS error:`, gasData);
      return NextResponse.json(
        { ok: false, error: gasData.error || "gas_update_failed" },
        { status: gasResponse.ok ? 200 : gasResponse.status }
      );
    }

    console.log(`[update-line-user-id] GAS updated for patient ${patientId}`);

    // ★ Supabase intakesテーブルも更新（該当するpatient_idの全行）
    try {
      const updateValue = lineUserId === "" ? null : lineUserId;
      const { error: dbError } = await supabase
        .from("intakes")
        .update({ line_id: updateValue })
        .eq("patient_id", patientId);

      if (dbError) {
        console.error(`[update-line-user-id] Supabase update error:`, dbError);
        return NextResponse.json(
          { ok: false, error: "db_update_failed", detail: dbError.message },
          { status: 500 }
        );
      }

      console.log(`[update-line-user-id] DB updated for patient ${patientId}: line_id=${lineUserId || "(null)"}`);
    } catch (dbErr: any) {
      console.error(`[update-line-user-id] DB update exception:`, dbErr);
      return NextResponse.json(
        { ok: false, error: "db_update_exception", detail: String(dbErr) },
        { status: 500 }
      );
    }

    console.log(`[update-line-user-id] Completed for patient ${patientId}: line_user_id=${lineUserId}`);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("POST /api/admin/update-line-user-id error", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
