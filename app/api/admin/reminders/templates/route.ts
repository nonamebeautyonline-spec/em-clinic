// app/api/admin/reminders/templates/route.ts — 汎用リマインダーテンプレート管理API
import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow, strictWithTenant, tenantPayload } from "@/lib/tenant";

// GET: テンプレート一覧（ステップ付き）
export async function GET(req: NextRequest) {
  const ok = await verifyAdminAuth(req);
  if (!ok) return unauthorized();
  const tenantId = resolveTenantIdOrThrow(req);

  const { data: templates, error } = await strictWithTenant(
    supabaseAdmin.from("reminder_templates").select("*").order("created_at", { ascending: false }),
    tenantId,
  );
  if (error) return serverError(error.message);

  // 各テンプレートのステップを取得
  const result = [];
  for (const t of templates ?? []) {
    const tpl = t as { id: string; name: string; is_active: boolean; created_at: string };
    const { data: steps } = await supabaseAdmin
      .from("reminder_steps")
      .select("*")
      .eq("template_id", tpl.id)
      .order("sort_order", { ascending: true });

    // 登録中の患者数
    const { count } = await strictWithTenant(
      supabaseAdmin
        .from("patient_reminders")
        .select("*", { count: "exact", head: true })
        .eq("template_id", tpl.id)
        .eq("status", "active"),
      tenantId,
    );

    result.push({ ...tpl, steps: steps ?? [], active_count: count ?? 0 });
  }

  return NextResponse.json({ ok: true, templates: result });
}

// POST: テンプレート作成 or ステップ追加
export async function POST(req: NextRequest) {
  const ok = await verifyAdminAuth(req);
  if (!ok) return unauthorized();
  const tenantId = resolveTenantIdOrThrow(req);

  const body = await req.json().catch(() => null);
  if (!body) return badRequest("JSONの解析に失敗しました");

  // ステップ追加の場合
  if (body.templateId && body.offsetMinutes !== undefined) {
    const { data, error } = await supabaseAdmin
      .from("reminder_steps")
      .insert({
        template_id: body.templateId,
        offset_minutes: body.offsetMinutes,
        message_type: body.messageType || "text",
        message_content: body.messageContent || "",
        sort_order: body.sortOrder ?? 0,
      })
      .select()
      .single();
    if (error) return serverError(error.message);
    return NextResponse.json({ ok: true, step: data }, { status: 201 });
  }

  // テンプレート作成
  if (!body.name) return badRequest("テンプレート名は必須です");

  const { data, error } = await supabaseAdmin
    .from("reminder_templates")
    .insert({ ...tenantPayload(tenantId), name: body.name })
    .select()
    .single();
  if (error) return serverError(error.message);

  return NextResponse.json({ ok: true, template: data }, { status: 201 });
}

// PUT: テンプレート更新 or ステップ更新
export async function PUT(req: NextRequest) {
  const ok = await verifyAdminAuth(req);
  if (!ok) return unauthorized();
  const tenantId = resolveTenantIdOrThrow(req);

  const body = await req.json().catch(() => null);
  if (!body?.id) return badRequest("idは必須です");

  // ステップ更新（stepIdが指定されている場合）
  if (body.stepId) {
    const payload: Record<string, unknown> = {};
    if (body.offsetMinutes !== undefined) payload.offset_minutes = body.offsetMinutes;
    if (body.messageContent !== undefined) payload.message_content = body.messageContent;
    if (body.messageType !== undefined) payload.message_type = body.messageType;
    if (body.sortOrder !== undefined) payload.sort_order = body.sortOrder;

    await supabaseAdmin.from("reminder_steps").update(payload).eq("id", body.stepId);
    return NextResponse.json({ ok: true });
  }

  // テンプレート更新
  const payload: Record<string, unknown> = {};
  if (body.name !== undefined) payload.name = body.name;
  if (body.isActive !== undefined) payload.is_active = body.isActive;

  await strictWithTenant(
    supabaseAdmin.from("reminder_templates").update(payload).eq("id", body.id),
    tenantId,
  );
  return NextResponse.json({ ok: true });
}

// DELETE: テンプレート or ステップ削除
export async function DELETE(req: NextRequest) {
  const ok = await verifyAdminAuth(req);
  if (!ok) return unauthorized();
  const tenantId = resolveTenantIdOrThrow(req);

  const url = new URL(req.url);
  const stepId = url.searchParams.get("stepId");
  const id = url.searchParams.get("id");

  if (stepId) {
    await supabaseAdmin.from("reminder_steps").delete().eq("id", stepId);
    return NextResponse.json({ ok: true });
  }

  if (id) {
    await strictWithTenant(
      supabaseAdmin.from("reminder_templates").delete().eq("id", id),
      tenantId,
    );
    return NextResponse.json({ ok: true });
  }

  return badRequest("idまたはstepIdが必要です");
}
