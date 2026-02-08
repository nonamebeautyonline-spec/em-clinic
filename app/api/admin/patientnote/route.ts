// カルテ（doctor note）更新API（Supabase直接UPDATE）
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => null);
    const patientId = (body?.patientId || "").trim();
    const note = String(body?.note ?? "");
    const intakeId = body?.intakeId ? Number(body.intakeId) : null;

    if (!patientId) {
      return NextResponse.json({ ok: false, message: "patientId_required" }, { status: 400 });
    }

    // タイムスタンプ付与
    const now = new Date();
    const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const yyyy = jst.getUTCFullYear();
    const mm = String(jst.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(jst.getUTCDate()).padStart(2, "0");
    const hh = String(jst.getUTCHours()).padStart(2, "0");
    const mi = String(jst.getUTCMinutes()).padStart(2, "0");
    const ss = String(jst.getUTCSeconds()).padStart(2, "0");
    const stamp = `${yyyy}/${mm}/${dd} ${hh}:${mi}:${ss}`;

    const noteWithStamp = note.trim()
      ? `最終更新: ${stamp}\n${note.trim()}`
      : "";

    if (intakeId) {
      const { error } = await supabaseAdmin
        .from("intake")
        .update({ note: noteWithStamp, updated_at: now.toISOString() })
        .eq("id", intakeId)
        .eq("patient_id", patientId);

      if (error) {
        return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
      }
    } else {
      const { data: latest } = await supabaseAdmin
        .from("intake")
        .select("id")
        .eq("patient_id", patientId)
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!latest) {
        return NextResponse.json({ ok: false, message: "intake_not_found" }, { status: 404 });
      }

      const { error } = await supabaseAdmin
        .from("intake")
        .update({ note: noteWithStamp, updated_at: now.toISOString() })
        .eq("id", latest.id);

      if (error) {
        return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true, editedAt: stamp });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, message: "server_error", detail: msg }, { status: 500 });
  }
}
