// app/api/intake/route.ts
import { NextRequest, NextResponse } from "next/server";

const GAS_INTAKE_URL = process.env.GAS_INTAKE_URL as string | undefined;

export async function POST(req: NextRequest) {
  try {
    if (!GAS_INTAKE_URL) {
      return NextResponse.json({ ok: false, error: "server_config_error" }, { status: 500 });
    }

    const body = await req.json().catch(() => ({} as any));

    // cookie から補完（フロントでは持たない）
    const patientId =
      req.cookies.get("__Host-patient_id")?.value ||
      req.cookies.get("patient_id")?.value ||
      "";

    const lineUserId = req.cookies.get("line_user_id")?.value || "";

    // GASへ投げるpayload（必要キーはあなたのGASに合わせる）
    const payload = {
      ...body,
      type: "intake",
      patient_id: body.patient_id || patientId,
      line_id: body.line_id || lineUserId,
    };

    const gasRes = await fetch(GAS_INTAKE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const text = await gasRes.text().catch(() => "");
    let json: any = {};
    try { json = text ? JSON.parse(text) : {}; } catch { json = {}; }

    if (!gasRes.ok || json?.ok === false) {
      return NextResponse.json({ ok: false, error: "gas_error" }, { status: 500 });
    }

    // ★ intakeId を cookie に保存（予約で使う）
    const intakeId = String(json?.intakeId ?? json?.intake_id ?? json?.id ?? "").trim();

    const res = NextResponse.json({ ok: true }, { status: 200 });

    if (intakeId) {
      res.cookies.set("__Host-intake_id", intakeId, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });
    }

    return res;
  } catch {
    console.error("POST /api/intake error");
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
