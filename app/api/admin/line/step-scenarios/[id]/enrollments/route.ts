// app/api/admin/line/step-scenarios/[id]/enrollments/route.ts — 登録者管理
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { enrollPatient } from "@/lib/step-enrollment";

// 登録者一覧
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const scenarioId = parseInt(id);

  const { data, error } = await supabaseAdmin
    .from("step_enrollments")
    .select("*")
    .eq("scenario_id", scenarioId)
    .order("enrolled_at", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 患者名を取得
  const patientIds = [...new Set((data || []).map((e: any) => e.patient_id))];
  const nameMap: Record<string, string> = {};
  if (patientIds.length > 0) {
    const { data: patients } = await supabaseAdmin
      .from("intake")
      .select("patient_id, patient_name")
      .in("patient_id", patientIds);
    for (const p of patients || []) {
      if (p.patient_name && !nameMap[p.patient_id]) {
        nameMap[p.patient_id] = p.patient_name;
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

  const { id } = await params;
  const scenarioId = parseInt(id);
  const { patient_ids } = await req.json();

  if (!Array.isArray(patient_ids) || patient_ids.length === 0) {
    return NextResponse.json({ error: "patient_ids は必須です" }, { status: 400 });
  }

  let enrolled = 0;
  for (const pid of patient_ids) {
    // LINE UID を取得
    const { data: intake } = await supabaseAdmin
      .from("intake")
      .select("line_id")
      .eq("patient_id", pid)
      .maybeSingle();

    await enrollPatient(scenarioId, pid, intake?.line_id);
    enrolled++;
  }

  return NextResponse.json({ ok: true, enrolled });
}

// 手動除外
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const scenarioId = parseInt(id);
  const { searchParams } = new URL(req.url);
  const patientId = searchParams.get("patient_id");

  if (!patientId) return NextResponse.json({ error: "patient_id は必須です" }, { status: 400 });

  const { error } = await supabaseAdmin
    .from("step_enrollments")
    .update({
      status: "exited",
      exited_at: new Date().toISOString(),
      exit_reason: "manual",
    })
    .eq("scenario_id", scenarioId)
    .eq("patient_id", patientId)
    .eq("status", "active");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
