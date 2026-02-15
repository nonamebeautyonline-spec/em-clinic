// app/api/doctor/callstatus/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant } from "@/lib/tenant";

export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);

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

    const { error: supabaseError } = await withTenant(
      supabaseAdmin
        .from("intake")
        .update({
          call_status: callStatus,
          call_status_updated_at: updatedAt,
        })
        .eq("reserve_id", reserveId),
      tenantId
    );

    if (supabaseError) {
      console.error("[doctor/callstatus] Supabase update failed:", supabaseError);
      return NextResponse.json(
        { ok: false, error: "DB_ERROR" },
        { status: 500 }
      );
    }

    console.log(`[doctor/callstatus] DB updated: reserve_id=${reserveId}, call_status=${callStatus}`);

    return NextResponse.json({ ok: true, updated_at: updatedAt });
  } catch (e: any) {
    console.error("[doctor/callstatus] error:", e);
    return NextResponse.json(
      { ok: false, error: String(e) },
      { status: 500 }
    );
  }
}
