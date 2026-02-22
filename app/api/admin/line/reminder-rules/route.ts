// app/api/admin/line/reminder-rules/route.ts — リマインドルール CRUD
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant, tenantPayload } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { reminderRuleSchema } from "@/lib/validations/line-common";

// ルール一覧
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);

  const { data, error } = await withTenant(
    supabaseAdmin
      .from("reminder_rules")
      .select("*")
      .order("created_at", { ascending: false }),
    tenantId
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 各ルールの送信実績件数を取得
  const rules = data || [];
  const enriched = [];
  for (const rule of rules) {
    const { count } = await withTenant(
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
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);

  const parsed = await parseBody(req, reminderRuleSchema);
  if ("error" in parsed) return parsed.error;
  const { name, timing_type, timing_value, message_template, is_enabled,
          send_hour, send_minute, target_day_offset, message_format } = parsed.data;

  // テンプレートバリデーション（FLEX時は不要）
  if (timing_type === "fixed_time" && message_format === "flex") {
    // FLEXはテンプレート不要
  } else if (!message_template?.trim()) {
    return NextResponse.json({ error: "メッセージは必須です" }, { status: 400 });
  }

  // fixed_time バリデーション（Zodで基本範囲チェック済み、null判定のみ追加）
  if (timing_type === "fixed_time") {
    if (send_hour == null) {
      return NextResponse.json({ error: "送信時刻（時）は必須です" }, { status: 400 });
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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, rule: data });
}

// ルール更新
export async function PUT(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);

  const parsed = await parseBody(req, reminderRuleSchema);
  if ("error" in parsed) return parsed.error;
  const { id, name, timing_type, timing_value, message_template, is_enabled,
          send_hour, send_minute, target_day_offset, message_format } = parsed.data as any;

  if (!id) return NextResponse.json({ error: "IDは必須です" }, { status: 400 });

  const { data, error } = await withTenant(
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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, rule: data });
}

// ルール削除
export async function DELETE(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "IDは必須です" }, { status: 400 });

  const { error } = await withTenant(
    supabaseAdmin.from("reminder_rules").delete().eq("id", parseInt(id)),
    tenantId
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
