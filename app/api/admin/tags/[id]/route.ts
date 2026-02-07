import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";

// タグの患者一覧取得
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // このタグが付いた患者IDを取得
  const { data: ptRows, error } = await supabaseAdmin
    .from("patient_tags")
    .select("patient_id, assigned_at")
    .eq("tag_id", Number(id))
    .order("assigned_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const patientIds = (ptRows || []).map(r => r.patient_id);
  if (patientIds.length === 0) return NextResponse.json({ patients: [] });

  // intakeから患者名を取得
  const { data: intakeRows } = await supabaseAdmin
    .from("intake")
    .select("patient_id, patient_name, line_id")
    .in("patient_id", patientIds)
    .order("created_at", { ascending: false });

  // patient_idでユニーク化（最新優先）
  const nameMap = new Map<string, { name: string; has_line: boolean }>();
  for (const row of intakeRows || []) {
    if (!nameMap.has(row.patient_id)) {
      nameMap.set(row.patient_id, { name: row.patient_name || "", has_line: !!row.line_id });
    }
  }

  const patients = patientIds.map(pid => ({
    patient_id: pid,
    patient_name: nameMap.get(pid)?.name || pid,
    has_line: nameMap.get(pid)?.has_line || false,
  }));

  return NextResponse.json({ patients });
}

// タグ更新
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { name, color, description } = await req.json();

  const { data, error } = await supabaseAdmin
    .from("tag_definitions")
    .update({ name, color, description })
    .eq("id", Number(id))
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tag: data });
}

// タグ削除
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const { error } = await supabaseAdmin
    .from("tag_definitions")
    .delete()
    .eq("id", Number(id));

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
