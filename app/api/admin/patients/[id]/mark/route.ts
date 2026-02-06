import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";

// 対応マーク取得
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const { data } = await supabaseAdmin
    .from("patient_marks")
    .select("*")
    .eq("patient_id", id)
    .single();

  return NextResponse.json({ mark: data || { patient_id: id, mark: "none", note: null } });
}

// 対応マーク更新
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { mark, note } = await req.json();

  const validMarks = ["none", "red", "yellow", "green", "blue", "gray"];
  if (!validMarks.includes(mark)) return NextResponse.json({ error: "Invalid mark" }, { status: 400 });

  const { error } = await supabaseAdmin
    .from("patient_marks")
    .upsert({
      patient_id: id,
      mark,
      note: note || null,
      updated_at: new Date().toISOString(),
      updated_by: "admin",
    }, { onConflict: "patient_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
