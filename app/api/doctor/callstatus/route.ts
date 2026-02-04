// app/api/doctor/callstatus/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const GAS_URL = process.env.GAS_MYPAGE_URL;

// ★ SERVICE_ROLE_KEYを使用してRLSをバイパス
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ★ GASへのバックグラウンド同期（fire-and-forget）
function syncToGASBackground(payload: any) {
  if (!GAS_URL) return;

  fetch(GAS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
    .then(async (res) => {
      const text = await res.text().catch(() => "");
      if (!res.ok) {
        console.error("[doctor/callstatus] GAS Background Sync Failed:", res.status, text?.slice(0, 200));
      } else {
        console.log("[doctor/callstatus] GAS Background Sync OK");
      }
    })
    .catch((err) => {
      console.error("[doctor/callstatus] GAS Background Sync Error:", err.message);
    });
}

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

    const updatedAt = new Date().toISOString();

    // ★ Step 1: DB先行書き込み（Supabase intakeテーブル）
    const { error: supabaseError } = await supabaseAdmin
      .from("intake")
      .update({
        call_status: callStatus,
        call_status_updated_at: updatedAt,
      })
      .eq("reserve_id", reserveId);

    if (supabaseError) {
      console.error("[doctor/callstatus] Supabase update failed:", supabaseError);
      return NextResponse.json(
        { ok: false, error: "DB_ERROR" },
        { status: 500 }
      );
    }

    console.log(`[doctor/callstatus] ✅ DB updated: reserve_id=${reserveId}, call_status=${callStatus}`);

    // ★ Step 2: GASはバックグラウンドで同期（ユーザーを待たせない）
    syncToGASBackground({
      type: "doctor_call_status",
      reserveId,
      callStatus,
    });

    return NextResponse.json({ ok: true, updated_at: updatedAt });
  } catch (e: any) {
    console.error("[doctor/callstatus] error:", e);
    return NextResponse.json(
      { ok: false, error: String(e) },
      { status: 500 }
    );
  }
}
