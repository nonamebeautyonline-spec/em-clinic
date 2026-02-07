import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";

// 複数患者にタグを一括追加/削除
export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { patient_ids, tag_id, action } = await req.json();

  if (!Array.isArray(patient_ids) || patient_ids.length === 0 || !tag_id || !["add", "remove"].includes(action)) {
    return NextResponse.json({ error: "patient_ids, tag_id, action(add|remove) は必須です" }, { status: 400 });
  }

  if (action === "add") {
    const rows = patient_ids.map((pid: string) => ({
      patient_id: pid,
      tag_id: Number(tag_id),
    }));

    const { error } = await supabaseAdmin
      .from("patient_tags")
      .upsert(rows, { onConflict: "patient_id,tag_id" });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await supabaseAdmin
      .from("patient_tags")
      .delete()
      .in("patient_id", patient_ids)
      .eq("tag_id", Number(tag_id));

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, updated_count: patient_ids.length });
}
