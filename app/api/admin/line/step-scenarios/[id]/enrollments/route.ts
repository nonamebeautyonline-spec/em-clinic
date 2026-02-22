// app/api/admin/line/step-scenarios/[id]/enrollments/route.ts — 登録者管理
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { enrollPatient } from "@/lib/step-enrollment";
import { resolveTenantId, withTenant } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { enrollStepSchema } from "@/lib/validations/line-management";

// 登録者一覧
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);
  const { id } = await params;
  const scenarioId = parseInt(id);

  const { data, error } = await withTenant(
    supabaseAdmin.from("step_enrollments").select("*").eq("scenario_id", scenarioId).order("enrolled_at", { ascending: false }).limit(200),
    tenantId
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 患者名をpatientsテーブルから取得
  const patientIds = [...new Set((data || []).map((e: any) => e.patient_id))];
  const nameMap: Record<string, string> = {};
  if (patientIds.length > 0) {
    const { data: pData } = await withTenant(
      supabaseAdmin.from("patients").select("patient_id, name").in("patient_id", patientIds),
      tenantId
    );
    for (const p of pData || []) {
      if (p.name && !nameMap[p.patient_id]) {
        nameMap[p.patient_id] = p.name;
      }
    }
  }

  const enriched = (data || []).map((e: any) => ({
    ...e,
    patient_name: nameMap[e.patient_id] || "",
  }));

  return NextResponse.json({ enrollments: enriched });
}

// 手動登録
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);
  const { id } = await params;
  const scenarioId = parseInt(id);
  const parsed = await parseBody(req, enrollStepSchema);
  if ("error" in parsed) return parsed.error;
  const { patient_ids } = parsed.data;

  let enrolled = 0;
  for (const pid of patient_ids) {
    // LINE UID をpatientsテーブルから取得
    const { data: patient } = await withTenant(
      supabaseAdmin.from("patients").select("line_id").eq("patient_id", pid),
      tenantId
    ).maybeSingle();

    await enrollPatient(scenarioId, pid, patient?.line_id, tenantId ?? undefined);
    enrolled++;
  }

  return NextResponse.json({ ok: true, enrolled });
}

// 手動除外
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);
  const { id } = await params;
  const scenarioId = parseInt(id);
  const { searchParams } = new URL(req.url);
  const patientId = searchParams.get("patient_id");

  if (!patientId) return NextResponse.json({ error: "patient_id は必須です" }, { status: 400 });

  const { error } = await withTenant(
    supabaseAdmin.from("step_enrollments").update({
      status: "exited",
      exited_at: new Date().toISOString(),
      exit_reason: "manual",
    }).eq("scenario_id", scenarioId).eq("patient_id", patientId).eq("status", "active"),
    tenantId
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
