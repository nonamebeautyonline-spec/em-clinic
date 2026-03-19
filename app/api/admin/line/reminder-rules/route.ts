// app/api/admin/line/reminder-rules/route.ts — リマインドルール CRUD
import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow, strictWithTenant, tenantPayload } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { reminderRuleSchema } from "@/lib/validations/line-common";

// ルール一覧
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);

  const { data, error } = await strictWithTenant(
    supabaseAdmin
      .from("reminder_rules")
      .select("*")
      .order("created_at", { ascending: false }),
    tenantId
  );

  if (error) return serverError(error.message);

  // 各ルールの送信実績件数を取得
  const rules = data || [];
  const enriched = [];
  for (const rule of rules) {
    const { count } = await strictWithTenant(
      supabaseAdmin
        .from("reminder_sent_log")
        .select("*", { count: "exact", head: true })
        .eq("rule_id", rule.id),
      tenantId
    );
    enriched.push({ ...rule, sent_count: count || 0 });
  }

  return NextResponse.json({ rules: enriched });
}

// ルール作成
export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);

  const parsed = await parseBody(req, reminderRuleSchema);
  if ("error" in parsed) return parsed.error;
  const { name, timing_type, timing_value, message_template, is_enabled,
          send_hour, send_minute, target_day_offset, message_format } = parsed.data;

  // テンプレートバリデーション（FLEX時は不要）
  if (timing_type === "fixed_time" && message_format === "flex") {
    // FLEXはテンプレート不要
  } else if (!message_template?.trim()) {
    return badRequest("メッセージは必須です");
  }

  // fixed_time バリデーション（Zodで基本範囲チェック済み、null判定のみ追加）
  if (timing_type === "fixed_time") {
    if (send_hour == null) {
      return badRequest("送信時刻（時）は必須です");
    }
  }

  const { data, error } = await supabaseAdmin
    .from("reminder_rules")
    .insert({
      ...tenantPayload(tenantId),
      name: name.trim(),
      timing_type: timing_type || "before_hours",
      timing_value: timing_value ?? 24,
      message_template: (message_template || "").trim(),
      is_enabled: is_enabled !== false,
      send_hour: timing_type === "fixed_time" ? send_hour : null,
      send_minute: timing_type === "fixed_time" ? (send_minute ?? 0) : null,
      target_day_offset: timing_type === "fixed_time" ? (target_day_offset ?? 1) : null,
      message_format: message_format || "text",
    })
    .select()
    .single();

  if (error) return serverError(error.message);
  return NextResponse.json({ ok: true, rule: data });
}

// ルール更新
export async function PUT(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);

  const parsed = await parseBody(req, reminderRuleSchema);
  if ("error" in parsed) return parsed.error;
  const body = parsed.data as Record<string, unknown>;
  const id = body.id as string | undefined;
  const { name, timing_type, timing_value, message_template, is_enabled,
          send_hour, send_minute, target_day_offset, message_format } = parsed.data;

  if (!id) return badRequest("IDは必須です");

  const { data, error } = await strictWithTenant(
    supabaseAdmin
      .from("reminder_rules")
      .update({
        name: name?.trim() || "",
        timing_type: timing_type || "before_hours",
        timing_value: timing_value ?? 24,
        message_template: (message_template || "").trim(),
        is_enabled: is_enabled !== false,
        send_hour: timing_type === "fixed_time" ? send_hour : null,
        send_minute: timing_type === "fixed_time" ? (send_minute ?? 0) : null,
        target_day_offset: timing_type === "fixed_time" ? (target_day_offset ?? 1) : null,
        message_format: message_format || "text",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(),
    tenantId
  ).single();

  if (error) return serverError(error.message);
  return NextResponse.json({ ok: true, rule: data });
}

// ルール削除
export async function DELETE(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) return badRequest("IDは必須です");

  const { error } = await strictWithTenant(
    supabaseAdmin.from("reminder_rules").delete().eq("id", parseInt(id)),
    tenantId
  );

  if (error) return serverError(error.message);
  return NextResponse.json({ ok: true });
}
