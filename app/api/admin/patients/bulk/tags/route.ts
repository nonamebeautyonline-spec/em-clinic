import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { evaluateMenuRulesForMany } from "@/lib/menu-auto-rules";
import { resolveTenantId, withTenant, tenantPayload } from "@/lib/tenant";

// 複数患者にタグを一括追加/削除
export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);
  const { patient_ids, tag_id, action } = await req.json();

  if (!Array.isArray(patient_ids) || patient_ids.length === 0 || !tag_id || !["add", "remove"].includes(action)) {
    return NextResponse.json({ error: "patient_ids, tag_id, action(add|remove) は必須です" }, { status: 400 });
  }

  const BATCH_SIZE = 200;

  if (action === "add") {
    for (let i = 0; i < patient_ids.length; i += BATCH_SIZE) {
      const batch = patient_ids.slice(i, i + BATCH_SIZE);
      const rows = batch.map((pid: string) => ({
        ...tenantPayload(tenantId),
        patient_id: pid,
        tag_id: Number(tag_id),
      }));
      const { error } = await supabaseAdmin
        .from("patient_tags")
        .upsert(rows, { onConflict: "patient_id,tag_id" });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else {
    for (let i = 0; i < patient_ids.length; i += BATCH_SIZE) {
      const batch = patient_ids.slice(i, i + BATCH_SIZE);
      const { error } = await withTenant(
        supabaseAdmin
          .from("patient_tags")
          .delete()
          .in("patient_id", batch)
          .eq("tag_id", Number(tag_id)),
        tenantId
      );
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // メニュー自動切替ルール評価（非同期・失敗無視）
  evaluateMenuRulesForMany(patient_ids, tenantId ?? undefined).catch(() => {});
  return NextResponse.json({ ok: true, updated_count: patient_ids.length });
}
