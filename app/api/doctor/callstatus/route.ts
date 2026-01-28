// app/api/doctor/callstatus/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const GAS_URL =
  process.env.GAS_MYPAGE_URL;
// ↑ あなたのプロジェクトで doctor/update が使っている方に合わせる

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const reserveId = String(body.reserveId || "").trim();
    const callStatus = String(body.callStatus || "").trim(); // "no_answer" or ""

    if (!reserveId) {
      return NextResponse.json(
        { ok: false, error: "reserveId required" },
        { status: 400 }
      );
    }

    if (!GAS_URL) {
      return NextResponse.json(
        { ok: false, error: "GAS URL not set" },
        { status: 500 }
      );
    }

    // 1. GASに送信（シート更新）
    const r = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "doctor_call_status",
        reserveId,
        callStatus,
      }),
    });

    const json = await r.json();

    // 2. GAS更新が成功したらSupabaseも更新
    if (json.ok) {
      const updatedAt = new Date().toISOString();

      const { error: supabaseError } = await supabase
        .from("intake")
        .update({
          call_status: callStatus,
          call_status_updated_at: updatedAt,
        })
        .eq("reserve_id", reserveId);

      if (supabaseError) {
        console.error("[Supabase] Failed to update call_status:", supabaseError);
        // Supabaseエラーでも、GASは成功しているのでクライアントには成功を返す
      } else {
        console.log(`[Supabase] Updated call_status for reserve_id=${reserveId}`);
      }

      // updated_atをレスポンスに含める（フロントエンドで即反映用）
      return NextResponse.json({ ...json, updated_at: updatedAt });
    }

    return NextResponse.json(json);
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { ok: false, error: String(e) },
      { status: 500 }
    );
  }
}
