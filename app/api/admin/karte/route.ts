// カルテ新規追加API（intake レコードを新規作成）
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant, tenantPayload } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = resolveTenantId(req);

    const body = await req.json().catch(() => null);
    const patientId = (body?.patientId || "").trim();
    const note = String(body?.note ?? "");

    if (!patientId) {
      return NextResponse.json({ ok: false, message: "patientId_required" }, { status: 400 });
    }
    if (!note.trim()) {
      return NextResponse.json({ ok: false, message: "note_required" }, { status: 400 });
    }

    // patient_name を answerers → intake フォールバックで取得
    const { data: answerer } = await withTenant(
      supabaseAdmin
        .from("patients")
        .select("name")
        .eq("patient_id", patientId)
        .limit(1),
      tenantId
    ).maybeSingle();

    const patientName = answerer?.name || "";

    // タイムスタンプ付与
    const now = new Date();
    const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const stamp = `${jst.getUTCFullYear()}/${String(jst.getUTCMonth() + 1).padStart(2, "0")}/${String(jst.getUTCDate()).padStart(2, "0")} ${String(jst.getUTCHours()).padStart(2, "0")}:${String(jst.getUTCMinutes()).padStart(2, "0")}:${String(jst.getUTCSeconds()).padStart(2, "0")}`;
    const noteWithStamp = `最終更新: ${stamp}\n${note.trim()}`;

    const { data: newIntake, error } = await supabaseAdmin
      .from("intake")
      .insert({
        ...tenantPayload(tenantId),
        patient_id: patientId,
        note: noteWithStamp,
        created_at: now.toISOString(),
      })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, intakeId: newIntake?.id, editedAt: stamp });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, message: "server_error", detail: msg }, { status: 500 });
  }
}
