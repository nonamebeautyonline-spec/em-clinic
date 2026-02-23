// カルテメモ編集API（カルテ検索画面から直接編集）
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { karteEditSchema } from "@/lib/validations/admin-operations";

export const dynamic = "force-dynamic";

// カルテメモ更新
export async function POST(req: NextRequest) {
  try {
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const parsed = await parseBody(req, karteEditSchema);
    if ("error" in parsed) return parsed.error;
    const { intakeId, note, noteFormat } = parsed.data;

    const tenantId = resolveTenantId(req);

    // ロック確認
    const { data: intake } = await withTenant(
      supabaseAdmin
        .from("intake")
        .select("id, locked_at")
        .eq("id", intakeId),
      tenantId
    ).single();

    if (!intake) {
      return NextResponse.json(
        { error: "カルテが見つかりません" },
        { status: 404 }
      );
    }

    if (intake.locked_at) {
      return NextResponse.json(
        { error: "このカルテはロックされています。管理者にロック解除を依頼してください。" },
        { status: 403 }
      );
    }

    // 更新
    const updatePayload: Record<string, unknown> = {
      note: note || null,
      updated_at: new Date().toISOString(),
    };
    if (noteFormat) {
      updatePayload.note_format = noteFormat;
    }
    const { error: updateErr } = await withTenant(
      supabaseAdmin
        .from("intake")
        .update(updatePayload)
        .eq("id", intakeId),
      tenantId
    );

    if (updateErr) {
      return NextResponse.json(
        { error: updateErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: msg },
      { status: 500 }
    );
  }
}
