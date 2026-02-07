// app/api/admin/update-line-user-id/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";

const GAS_MYPAGE_URL = process.env.GAS_MYPAGE_URL;

export async function POST(req: NextRequest) {
  try {
    // 認証チェック（クッキーまたはBearerトークン）
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) {
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

    // ★ DB先行: Supabase intakeテーブルを更新
    const updateValue = lineUserId === "" ? null : lineUserId;
    const { error: dbError } = await supabase
      .from("intake")
      .update({ line_id: updateValue })
      .eq("patient_id", patientId);

    if (dbError) {
      console.error(`[update-line-user-id] DB update error:`, dbError);
      return NextResponse.json(
        { ok: false, error: "db_update_failed", detail: dbError.message },
        { status: 500 }
      );
    }

    console.log(`[update-line-user-id] DB updated for patient ${patientId}: line_id=${lineUserId || "(null)"}`);

    // ★ GAS同期（非同期・失敗してもログのみ）
    if (GAS_MYPAGE_URL) {
      fetch(GAS_MYPAGE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "update_line_user_id",
          patient_id: patientId,
          line_user_id: lineUserId,
        }),
        signal: AbortSignal.timeout(10000),
      }).then(async (res) => {
        const text = await res.text().catch(() => "");
        if (!res.ok) console.error("[update-line-user-id] GAS sync failed (non-blocking):", text);
        else console.log(`[update-line-user-id] GAS synced for patient ${patientId}`);
      }).catch((e) => console.error("[update-line-user-id] GAS sync error (non-blocking):", e));
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("POST /api/admin/update-line-user-id error", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
