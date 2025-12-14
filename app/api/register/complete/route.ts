// app/api/register/complete/route.ts
import { NextRequest, NextResponse } from "next/server";

const GAS_REGISTER_URL = process.env.GAS_REGISTER_URL;

export async function POST(req: NextRequest) {
  try {
    if (!GAS_REGISTER_URL) {
      console.error("GAS_REGISTER_URL is not set");
      return NextResponse.json(
        { ok: false, error: "server_config_error" },
        { status: 500 }
      );
    }

    const { phone, lineUserId } = (await req.json()) as {
      phone?: string;
      lineUserId?: string;
    };

    if (!phone) {
      return NextResponse.json(
        { ok: false, error: "phone_required" },
        { status: 400 }
      );
    }

    const gasRes = await fetch(GAS_REGISTER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone,
        line_user_id: lineUserId ?? "",
      }),
      cache: "no-store",
    });

    const text = await gasRes.text();

    if (!gasRes.ok) {
      console.error("GAS register HTTP error:", gasRes.status, text);
      return NextResponse.json(
        { ok: false, error: "register_failed" },
        { status: 500 }
      );
    }

    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch {
      console.error("GAS register invalid JSON:", text);
      return NextResponse.json(
        { ok: false, error: "register_failed" },
        { status: 500 }
      );
    }

    // GAS側が ok:false で not_found を返すケースは「通常の失敗」
    if (data?.ok === false && (data?.message === "not_found" || data?.error === "not_found")) {
      return NextResponse.json(
        { ok: false, error: "not_found" },
        { status: 200 }
      );
    }

    const pid = data?.pid ?? data?.patient_id ?? data?.Patient_ID ?? null;

    if (!pid) {
      console.error("GAS register missing pid:", data);
      return NextResponse.json(
        { ok: false, error: "register_failed" },
        { status: 500 }
      );
    }

    const res = NextResponse.json({ ok: true, pid: String(pid) });

    res.cookies.set("patient_id", String(pid), {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });

    return res;
  } catch (e) {
    console.error("register complete exception:", e);
    return NextResponse.json(
      { ok: false, error: "register_failed" },
      { status: 500 }
    );
  }
}
