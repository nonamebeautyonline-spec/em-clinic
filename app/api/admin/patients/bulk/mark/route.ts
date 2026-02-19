import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { evaluateMenuRulesForMany } from "@/lib/menu-auto-rules";
import { resolveTenantId, withTenant, tenantPayload } from "@/lib/tenant";

// 複数患者の対応マークを一括更新
export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);
  const { patient_ids, mark } = await req.json();

  if (!Array.isArray(patient_ids) || patient_ids.length === 0 || !mark) {
    return NextResponse.json({ error: "patient_ids と mark は必須です" }, { status: 400 });
  }

  // mark_definitions で存在確認
  const { data: markDef } = await withTenant(
    supabaseAdmin
      .from("mark_definitions")
      .select("value")
      .eq("value", mark)
      .single(),
    tenantId
  );

  if (!markDef) {
    return NextResponse.json({ error: "無効なマークです" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const BATCH_SIZE = 200;

  for (let i = 0; i < patient_ids.length; i += BATCH_SIZE) {
    const batch = patient_ids.slice(i, i + BATCH_SIZE);
    const rows = batch.map((pid: string) => ({
      ...tenantPayload(tenantId),
      patient_id: pid,
      mark,
      updated_at: now,
      updated_by: "admin",
    }));
    const { error } = await withTenant(
      supabaseAdmin
        .from("patient_marks")
        .upsert(rows, { onConflict: "patient_id" }),
      tenantId
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  // メニュー自動切替ルール評価（非同期・失敗無視）
  evaluateMenuRulesForMany(patient_ids, tenantId ?? undefined).catch(() => {});
  return NextResponse.json({ ok: true, updated_count: patient_ids.length });
}
