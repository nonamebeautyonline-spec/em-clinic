import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";

// 患者の友達情報欄の値を取得
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from("friend_field_values")
    .select("*, friend_field_definitions(*)")
    .eq("patient_id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ fields: data });
}

// 患者の友達情報欄を更新（複数フィールドを一括更新）
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { values } = await req.json();
  // values: [{ field_id: number, value: string }]

  if (!Array.isArray(values)) return NextResponse.json({ error: "values is required" }, { status: 400 });

  const upserts = values.map((v: { field_id: number; value: string }) => ({
    patient_id: id,
    field_id: v.field_id,
    value: v.value,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabaseAdmin
    .from("friend_field_values")
    .upsert(upserts, { onConflict: "patient_id,field_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
