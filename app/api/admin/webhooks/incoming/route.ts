// app/api/admin/webhooks/incoming/route.ts — インカミングWebhook管理API
import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow, strictWithTenant, tenantPayload } from "@/lib/tenant";

// GET: 一覧取得
export async function GET(req: NextRequest) {
  const ok = await verifyAdminAuth(req);
  if (!ok) return unauthorized();
  const tenantId = resolveTenantIdOrThrow(req);

  const { data, error } = await strictWithTenant(
    supabaseAdmin.from("incoming_webhooks").select("*").order("created_at", { ascending: false }),
    tenantId,
  );
  if (error) return serverError(error.message);

  // 受信URLを付与
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.headers.get("origin") || "";
  const webhooks = (data ?? []).map((w) => ({
    ...w,
    receive_url: `${baseUrl}/api/webhooks/incoming/${(w as { id: string }).id}/receive`,
  }));

  return NextResponse.json({ ok: true, webhooks });
}

// POST: 新規作成
export async function POST(req: NextRequest) {
  const ok = await verifyAdminAuth(req);
  if (!ok) return unauthorized();
  const tenantId = resolveTenantIdOrThrow(req);

  let body: { name?: string; sourceType?: string; secret?: string };
  try { body = await req.json(); } catch { return badRequest("JSONの解析に失敗しました"); }

  if (!body.name || !body.sourceType) {
    return badRequest("name と sourceType は必須です");
  }

  const { data, error } = await supabaseAdmin
    .from("incoming_webhooks")
    .insert({
      ...tenantPayload(tenantId),
      name: body.name,
      source_type: body.sourceType,
      secret: body.secret ?? null,
    })
    .select()
    .single();

  if (error) return serverError(error.message);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.headers.get("origin") || "";
  return NextResponse.json({
    ok: true,
    webhook: {
      ...data,
      receive_url: `${baseUrl}/api/webhooks/incoming/${(data as { id: string }).id}/receive`,
    },
  }, { status: 201 });
}

// DELETE: 削除（?id=xxx）
export async function DELETE(req: NextRequest) {
  const ok = await verifyAdminAuth(req);
  if (!ok) return unauthorized();
  const tenantId = resolveTenantIdOrThrow(req);

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return badRequest("idが必要です");

  await strictWithTenant(
    supabaseAdmin.from("incoming_webhooks").delete().eq("id", id),
    tenantId,
  );

  return NextResponse.json({ ok: true });
}
