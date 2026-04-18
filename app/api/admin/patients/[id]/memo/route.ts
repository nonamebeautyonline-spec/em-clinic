import { NextRequest, NextResponse } from "next/server";
import { badRequest, unauthorized, serverError } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow, strictWithTenant } from "@/lib/tenant";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const MEMO_MAX_LENGTH = 10000;

// メモ保存
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const { id } = await params;

  let body: { memo?: string };
  try {
    body = await req.json();
  } catch {
    return badRequest("不正なリクエストです");
  }

  const memo = (body.memo ?? "").slice(0, MEMO_MAX_LENGTH);

  const { error } = await strictWithTenant(
    supabaseAdmin
      .from("patients")
      .update({ memo })
      .eq("patient_id", id),
    tenantId
  );

  if (error) {
    console.error("[memo PUT]", error.message);
    return serverError("メモの保存に失敗しました");
  }

  logAudit(req, "patient_memo.update", "patient", id);
  return NextResponse.json({ ok: true, memo });
}
