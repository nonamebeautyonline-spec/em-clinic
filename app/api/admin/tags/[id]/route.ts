import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { tagUpdateSchema } from "@/lib/validations/admin-operations";

// ページネーション付き全件取得
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

// タグの患者一覧取得
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);
  const { id } = await params;

  // このタグが付いた患者IDを取得
  const { data: ptRows, error } = await fetchAll(
    () => withTenant(
      supabaseAdmin.from("patient_tags").select("patient_id, assigned_at").eq("tag_id", Number(id)).order("assigned_at", { ascending: false }),
      tenantId
    ),
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const patientIds = (ptRows || []).map((r: any) => r.patient_id);
  if (patientIds.length === 0) return NextResponse.json({ patients: [] });

  // patientsテーブルから患者名・line_idを取得（patient_idsが大量の場合バッチ分割）
  const patientRows: any[] = [];
  const BATCH = 500;
  for (let i = 0; i < patientIds.length; i += BATCH) {
    const chunk = patientIds.slice(i, i + BATCH);
    const { data } = await withTenant(
      supabaseAdmin
        .from("patients")
        .select("patient_id, name, line_id")
        .in("patient_id", chunk),
      tenantId
    );
    if (data) patientRows.push(...data);
  }

  // patient_idでマップ化
  const nameMap = new Map<string, { name: string; has_line: boolean }>();
  for (const row of patientRows || []) {
    if (!nameMap.has(row.patient_id)) {
      nameMap.set(row.patient_id, { name: row.name || "", has_line: !!row.line_id });
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

  const tenantId = resolveTenantId(req);
  const { id } = await params;
  const parsed = await parseBody(req, tagUpdateSchema);
  if ("error" in parsed) return parsed.error;
  const { name, color, description } = parsed.data;

  const { data, error } = await withTenant(
    supabaseAdmin
      .from("tag_definitions")
      .update({ name, color, description })
      .eq("id", Number(id)),
    tenantId
  ).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tag: data });
}

// タグ削除
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);
  const { id } = await params;

  const { error } = await withTenant(
    supabaseAdmin
      .from("tag_definitions")
      .delete()
      .eq("id", Number(id)),
    tenantId
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
