import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow, strictWithTenant, tenantPayload } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { chatReadSchema } from "@/lib/validations/admin-operations";

// 既読タイムスタンプ一括取得
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);

  const { data, error } = await strictWithTenant(
    supabaseAdmin
      .from("chat_reads")
      .select("patient_id, read_at"),
    tenantId
  );

  if (error) return serverError(error.message);

  const reads: Record<string, string> = {};
  for (const row of data || []) {
    reads[row.patient_id] = row.read_at;
  }

  return NextResponse.json({ reads });
}

// 既読マーク（patient_id指定）
export async function PUT(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);

  const parsed = await parseBody(req, chatReadSchema);
  if ("error" in parsed) return parsed.error;
  const { patient_id } = parsed.data;

  const now = new Date().toISOString();
  const { error } = await supabaseAdmin
    .from("chat_reads")
    .upsert({ ...tenantPayload(tenantId), patient_id, read_at: now }, { onConflict: "patient_id" });

  if (error) return serverError(error.message);

  return NextResponse.json({ ok: true, read_at: now });
}
