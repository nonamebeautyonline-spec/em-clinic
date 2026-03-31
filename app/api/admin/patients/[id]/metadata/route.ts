// app/api/admin/patients/[id]/metadata/route.ts — 患者メタデータ CRUD
//
// GET  /api/admin/patients/:id/metadata — メタデータ取得
// PUT  /api/admin/patients/:id/metadata — メタデータマージ更新
// DELETE /api/admin/patients/:id/metadata?key=xxx — 特定キー削除

import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow, strictWithTenant } from "@/lib/tenant";

type RouteParams = { params: Promise<{ id: string }> };

// ── GET ──────────────────────────────────────────
export async function GET(req: NextRequest, { params }: RouteParams) {
  const ok = await verifyAdminAuth(req);
  if (!ok) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const { id } = await params;

  const { data, error } = await strictWithTenant(
    supabaseAdmin
      .from("patients")
      .select("metadata")
      .eq("patient_id", id)
      .maybeSingle(),
    tenantId,
  );

  if (error) return serverError(error.message);
  if (!data) return NextResponse.json({ error: "患者が見つかりません" }, { status: 404 });

  return NextResponse.json({ metadata: data.metadata ?? {} });
}

// ── PUT（マージ更新）──────────────────────────────
export async function PUT(req: NextRequest, { params }: RouteParams) {
  const ok = await verifyAdminAuth(req);
  if (!ok) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return badRequest("JSONの解析に失敗しました");
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return badRequest("オブジェクト形式で送信してください");
  }

  // RPC でアトミックマージ
  const { data, error } = await supabaseAdmin.rpc("merge_patient_metadata", {
    p_patient_id: id,
    p_data: body,
    p_tenant_id: tenantId,
  });

  if (error) {
    // RPC未作成のフォールバック（マイグレーション未適用時）
    if (error.message?.includes("merge_patient_metadata")) {
      const { data: current } = await strictWithTenant(
        supabaseAdmin
          .from("patients")
          .select("metadata")
          .eq("patient_id", id)
          .maybeSingle(),
        tenantId,
      );
      const merged = { ...(current?.metadata ?? {}), ...body };
      const { error: updateErr } = await strictWithTenant(
        supabaseAdmin
          .from("patients")
          .update({ metadata: merged, updated_at: new Date().toISOString() })
          .eq("patient_id", id),
        tenantId,
      );
      if (updateErr) return serverError(updateErr.message);
      return NextResponse.json({ metadata: merged });
    }
    return serverError(error.message);
  }

  return NextResponse.json({ metadata: data });
}

// ── DELETE（キー削除）──────────────────────────────
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const ok = await verifyAdminAuth(req);
  if (!ok) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const { id } = await params;

  const key = new URL(req.url).searchParams.get("key");
  if (!key) return badRequest("削除するキーを指定してください（?key=xxx）");

  // 現在のメタデータを取得
  const { data: current } = await strictWithTenant(
    supabaseAdmin
      .from("patients")
      .select("metadata")
      .eq("patient_id", id)
      .maybeSingle(),
    tenantId,
  );

  if (!current) return NextResponse.json({ error: "患者が見つかりません" }, { status: 404 });

  const metadata = { ...(current.metadata ?? {}) };
  delete metadata[key];

  const { error } = await strictWithTenant(
    supabaseAdmin
      .from("patients")
      .update({ metadata, updated_at: new Date().toISOString() })
      .eq("patient_id", id),
    tenantId,
  );

  if (error) return serverError(error.message);

  return NextResponse.json({ metadata });
}
