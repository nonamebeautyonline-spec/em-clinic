import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { evaluateMenuRulesForMany } from "@/lib/menu-auto-rules";
import { resolveTenantId, withTenant, tenantPayload } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { bulkFieldsUpdateSchema } from "@/lib/validations/admin-operations";

// 複数患者の友だち情報フィールドを一括更新
export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);
  const parsed = await parseBody(req, bulkFieldsUpdateSchema);
  if ("error" in parsed) return parsed.error;
  const { patient_ids, field_id, value } = parsed.data;

  // フィールド定義の存在確認
  const { data: fieldDef } = await withTenant(
    supabaseAdmin
      .from("friend_field_definitions")
      .select("id, name")
      .eq("id", field_id)
      .single(),
    tenantId
  );

  if (!fieldDef) {
    return NextResponse.json({ error: "フィールドが見つかりません" }, { status: 404 });
  }

  const now = new Date().toISOString();
  const BATCH_SIZE = 200;

  for (let i = 0; i < patient_ids.length; i += BATCH_SIZE) {
    const batch = patient_ids.slice(i, i + BATCH_SIZE);
    const rows = batch.map((pid: string) => ({
      ...tenantPayload(tenantId),
      patient_id: pid,
      field_id: Number(field_id),
      value: value ?? "",
      updated_at: now,
    }));
    const { error } = await withTenant(
      supabaseAdmin
        .from("friend_field_values")
        .upsert(rows, { onConflict: "patient_id,field_id" }),
      tenantId
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  // メニュー自動切替ルール評価（非同期・失敗無視）
  evaluateMenuRulesForMany(patient_ids, tenantId ?? undefined).catch(() => {});
  return NextResponse.json({ ok: true, updated_count: patient_ids.length });
}
