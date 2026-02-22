// カルテ（doctor note）更新API（Supabase直接UPDATE）
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { patientNoteSchema } from "@/lib/validations/admin-operations";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = resolveTenantId(req);

    const parsed = await parseBody(req, patientNoteSchema);
    if ("error" in parsed) return parsed.error;
    const patientId = parsed.data.patientId.trim();
    const note = String(parsed.data.note ?? "");
    const intakeId = parsed.data.intakeId ? Number(parsed.data.intakeId) : null;

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
      const { error } = await withTenant(
        supabaseAdmin
          .from("intake")
          .update({ note: noteWithStamp, updated_at: now.toISOString() })
          .eq("id", intakeId)
          .eq("patient_id", patientId),
        tenantId
      );

      if (error) {
        return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
      }
    } else {
      const { data: latest } = await withTenant(
        supabaseAdmin
          .from("intake")
          .select("id")
          .eq("patient_id", patientId)
          .order("id", { ascending: false })
          .limit(1)
          .maybeSingle(),
        tenantId
      );

      if (!latest) {
        return NextResponse.json({ ok: false, message: "intake_not_found" }, { status: 404 });
      }

      const { error } = await withTenant(
        supabaseAdmin
          .from("intake")
          .update({ note: noteWithStamp, updated_at: now.toISOString() })
          .eq("id", latest.id),
        tenantId
      );

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
