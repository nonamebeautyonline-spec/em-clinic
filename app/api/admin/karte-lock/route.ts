// カルテロック・ロック解除API
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { karteLockSchema } from "@/lib/validations/admin-operations";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const parsed = await parseBody(req, karteLockSchema);
    if ("error" in parsed) return parsed.error;
    const { intakeId, action } = parsed.data;

    const tenantId = resolveTenantId(req);

    if (action === "unlock") {
      // ロック解除
      const { error } = await withTenant(
        supabaseAdmin
          .from("intake")
          .update({
            locked_at: null,
            locked_by: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", intakeId),
        tenantId
      );

      if (error)
        return NextResponse.json({ error: error.message }, { status: 500 });

      return NextResponse.json({ ok: true, locked: false });
    }

    // ロック
    const { error } = await withTenant(
      supabaseAdmin
        .from("intake")
        .update({
          locked_at: new Date().toISOString(),
          locked_by: "admin",
          updated_at: new Date().toISOString(),
        })
        .eq("id", intakeId),
      tenantId
    );

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, locked: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
