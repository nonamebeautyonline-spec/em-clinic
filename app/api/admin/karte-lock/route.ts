// カルテロック・ロック解除API
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => null);
    if (!body?.intakeId) {
      return NextResponse.json(
        { error: "intakeId は必須です" },
        { status: 400 }
      );
    }

    const { intakeId, action } = body; // action: "lock" | "unlock"

    if (action === "unlock") {
      // ロック解除
      const { error } = await supabaseAdmin
        .from("intake")
        .update({
          locked_at: null,
          locked_by: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", intakeId);

      if (error)
        return NextResponse.json({ error: error.message }, { status: 500 });

      return NextResponse.json({ ok: true, locked: false });
    }

    // ロック
    const { error } = await supabaseAdmin
      .from("intake")
      .update({
        locked_at: new Date().toISOString(),
        locked_by: "admin",
        updated_at: new Date().toISOString(),
      })
      .eq("id", intakeId);

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, locked: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
