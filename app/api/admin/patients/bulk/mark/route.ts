import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { evaluateMenuRulesForMany } from "@/lib/menu-auto-rules";
import { resolveTenantIdOrThrow, strictWithTenant, tenantPayload } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { bulkMarkSchema } from "@/lib/validations/line-common";
import { logAudit } from "@/lib/audit";

// 複数患者の対応マークを一括更新
export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const parsed = await parseBody(req, bulkMarkSchema);
  if ("error" in parsed) return parsed.error;
  const { patient_ids, mark } = parsed.data;

  // mark_definitions で存在確認
  const { data: markDef } = await strictWithTenant(
    supabaseAdmin
      .from("mark_definitions")
      .select("value")
      .eq("value", mark)
      .single(),
    tenantId
  );

  if (!markDef) {
    return badRequest("無効なマークです");
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
    const { error } = await strictWithTenant(
      supabaseAdmin
        .from("patient_marks")
        .upsert(rows, { onConflict: "patient_id" }),
      tenantId
    );
    if (error) return serverError(error.message);
  }
  // メニュー自動切替ルール評価（非同期・失敗無視）
  evaluateMenuRulesForMany(patient_ids, tenantId ?? undefined).catch(() => {});
  logAudit(req, "patient_mark.bulk_update", "patient", "bulk");
  return NextResponse.json({ ok: true, updated_count: patient_ids.length });
}
