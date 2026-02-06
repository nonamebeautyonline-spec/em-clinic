// app/api/register/complete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const GAS_REGISTER_URL = process.env.GAS_REGISTER_URL;

export async function POST(req: NextRequest) {
  try {
    if (!GAS_REGISTER_URL) {
      console.error("GAS_REGISTER_URL is not set");
      return NextResponse.json({ ok: false, error: "server_config_error" }, { status: 500 });
    }

    const { phone } = (await req.json().catch(() => ({}))) as { phone?: string };
    if (!phone) {
      return NextResponse.json({ ok: false, error: "phone_required" }, { status: 400 });
    }

    // ★ lineUserId はクライアント入力を信用しない（cookieから取得）
    const lineUserId = req.cookies.get("line_user_id")?.value || "";

    const gasRes = await fetch(GAS_REGISTER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, line_user_id: lineUserId }),
      cache: "no-store",
    });

    const text = await gasRes.text().catch(() => "");

    if (!gasRes.ok) {
      // textはログしない
      console.error("GAS register HTTP error:", gasRes.status);
      return NextResponse.json({ ok: false, error: "register_failed" }, { status: 500 });
    }

    let data: any = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      console.error("GAS register invalid JSON");
      return NextResponse.json({ ok: false, error: "register_failed" }, { status: 500 });
    }

    // GAS側 not_found は通常失敗として 200 で返す（現仕様踏襲）
    if (data?.ok === false && (data?.message === "not_found" || data?.error === "not_found")) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 200 });
    }

    const pid = data?.pid ?? data?.patient_id ?? data?.Patient_ID ?? null;
    if (!pid) {
      // data をログしない
      console.error("GAS register missing pid");
      return NextResponse.json({ ok: false, error: "register_failed" }, { status: 500 });
    }

    // ★ line_user_id が取得できていれば Supabase intake テーブルにも保存
    if (lineUserId) {
      supabase
        .from("intake")
        .update({ line_id: lineUserId })
        .eq("patient_id", String(pid))
        .then(({ error }) => {
          if (error) {
            console.error("[register/complete] DB line_id update error:", error.message);
          } else {
            console.log("[register/complete] DB line_id updated for", pid);
          }
        });
    }

    // ★ pidは返さなくてOK（cookieで完結）
    const res = NextResponse.json({ ok: true }, { status: 200 });

    res.cookies.set("__Host-patient_id", String(pid), {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });

    res.cookies.set("patient_id", String(pid), {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });

    return res;
  } catch {
    console.error("register complete exception");
    return NextResponse.json({ ok: false, error: "register_failed" }, { status: 500 });
  }
}
