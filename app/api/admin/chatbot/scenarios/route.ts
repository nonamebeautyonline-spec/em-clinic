// app/api/admin/chatbot/scenarios/route.ts — チャットボットシナリオ CRUD（一覧/作成）
import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow, strictWithTenant, tenantPayload } from "@/lib/tenant";
import { logAudit } from "@/lib/audit";

// シナリオ一覧取得
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);

  const { data, error } = await strictWithTenant(
    supabaseAdmin
      .from("chatbot_scenarios")
      .select("*")
      .order("created_at", { ascending: false }),
    tenantId,
  );

  if (error) return serverError(error.message);
  return NextResponse.json({ scenarios: data || [] });
}

// シナリオ新規作成
export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return badRequest("リクエストの形式が不正です");
  }

  const name = body.name as string | undefined;
  if (!name || !name.trim()) return badRequest("シナリオ名は必須です");

  const { data, error } = await supabaseAdmin
    .from("chatbot_scenarios")
    .insert({
      ...tenantPayload(tenantId),
      name: (name as string).trim(),
      description: (body.description as string) || null,
      trigger_keyword: (body.trigger_keyword as string) || null,
      is_active: body.is_active !== false,
    })
    .select()
    .single();

  if (error) return serverError(error.message);
  logAudit(req, "chatbot_scenario.create", "chatbot_scenario", data?.id || "unknown");
  return NextResponse.json({ ok: true, scenario: data });
}
