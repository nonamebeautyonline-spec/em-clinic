import { NextRequest, NextResponse } from "next/server";
import { conflict, serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow, strictWithTenant, tenantPayload } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { friendFieldCreateSchema } from "@/lib/validations/admin-operations";
import { logAudit } from "@/lib/audit";

// 友達情報欄の定義一覧
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);

  const { data, error } = await strictWithTenant(
    supabaseAdmin
      .from("friend_field_definitions")
      .select("*")
      .order("sort_order", { ascending: true }),
    tenantId
  );

  if (error) return serverError(error.message);
  return NextResponse.json({ fields: data });
}

// 友達情報欄の定義を作成
export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);

  const parsed = await parseBody(req, friendFieldCreateSchema);
  if ("error" in parsed) return parsed.error;
  const { name, field_type, options, sort_order } = parsed.data;

  const { data, error } = await supabaseAdmin
    .from("friend_field_definitions")
    .insert({ ...tenantPayload(tenantId), name: name.trim(), field_type: field_type || "text", options, sort_order: sort_order || 0 })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") return conflict("同じ名前のフィールドが既に存在します");
    return serverError(error.message);
  }

  logAudit(req, "friend_field.create", "friend_field", "unknown");
  return NextResponse.json({ field: data });
}
