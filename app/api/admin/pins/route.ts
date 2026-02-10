import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getAdminUserId } from "@/lib/admin-auth";

const MAX_PINS = 15;

export async function GET(req: NextRequest) {
  const userId = await getAdminUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("admin_users")
    .select("pinned_patients")
    .eq("id", userId)
    .single();

  if (error) {
    return NextResponse.json({ pins: [] });
  }

  return NextResponse.json({ pins: data?.pinned_patients || [] });
}

export async function PUT(req: NextRequest) {
  const userId = await getAdminUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const pins = Array.isArray(body.pins) ? body.pins.slice(0, MAX_PINS) : [];

  const { error } = await supabaseAdmin
    .from("admin_users")
    .update({ pinned_patients: pins })
    .eq("id", userId);

  if (error) {
    console.error("[admin/pins] update error:", error);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
