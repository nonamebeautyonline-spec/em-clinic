import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";

async function fetchAll(buildQuery: () => any, pageSize = 5000) {
  const all: any[] = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await buildQuery().range(offset, offset + pageSize - 1);
    if (error) return { data: all, error };
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < pageSize) break;
    offset += pageSize;
  }
  return { data: all, error: null };
}

// マークの患者一覧取得
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // mark_definitions から value を取得
  const { data: markDef } = await supabaseAdmin
    .from("mark_definitions")
    .select("value")
    .eq("id", Number(id))
    .single();

  if (!markDef) return NextResponse.json({ patients: [] });

  // このマークが付いた患者IDを取得
  const { data: pmRows, error } = await fetchAll(() =>
    supabaseAdmin
      .from("patient_marks")
      .select("patient_id")
      .eq("mark", markDef.value)
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const patientIds = (pmRows || []).map(r => r.patient_id);
  if (patientIds.length === 0) return NextResponse.json({ patients: [] });

  // intakeから患者名を取得（patientIdsが大きい場合はバッチ分割）
  const BATCH_SIZE = 500;
  const intakeRows: any[] = [];
  for (let i = 0; i < patientIds.length; i += BATCH_SIZE) {
    const batch = patientIds.slice(i, i + BATCH_SIZE);
    const { data } = await fetchAll(() =>
      supabaseAdmin
        .from("intake")
        .select("patient_id, patient_name, line_id")
        .in("patient_id", batch)
        .order("created_at", { ascending: false })
    );
    if (data) intakeRows.push(...data);
  }

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

// 対応マーク更新
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { label, color, icon } = await req.json();

  const { data, error } = await supabaseAdmin
    .from("mark_definitions")
    .update({ label, color, icon })
    .eq("id", Number(id))
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ mark: data });
}

// 対応マーク削除
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // "none" は削除不可
  const { data: mark } = await supabaseAdmin
    .from("mark_definitions")
    .select("value")
    .eq("id", Number(id))
    .single();

  if (mark?.value === "none") {
    return NextResponse.json({ error: "「なし」は削除できません" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("mark_definitions")
    .delete()
    .eq("id", Number(id));

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
