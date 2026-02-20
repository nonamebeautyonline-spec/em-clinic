// AI返信設定 API（GET/PUT）

import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveTenantId, withTenant, tenantPayload } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// 設定取得
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);

  const { data, error } = await withTenant(
    supabaseAdmin.from("ai_reply_settings").select("*").maybeSingle(),
    tenantId
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 設定が存在しない場合はデフォルト値を返す
  const settings = data || {
    is_enabled: false,
    mode: "approval",
    knowledge_base: "",
    custom_instructions: "",
    min_message_length: 5,
    daily_limit: 100,
    approval_timeout_hours: 24,
  };

  return NextResponse.json({ settings });
}

// 設定更新（upsert）
export async function PUT(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);
  const body = await req.json();

  const {
    is_enabled,
    mode,
    knowledge_base,
    custom_instructions,
    min_message_length,
    daily_limit,
    approval_timeout_hours,
  } = body;

  // 既存設定を確認
  const { data: existing } = await withTenant(
    supabaseAdmin.from("ai_reply_settings").select("id").maybeSingle(),
    tenantId
  );

  const payload = {
    is_enabled: is_enabled ?? false,
    mode: mode || "approval",
    knowledge_base: knowledge_base || "",
    custom_instructions: custom_instructions || "",
    min_message_length: min_message_length ?? 5,
    daily_limit: daily_limit ?? 100,
    approval_timeout_hours: approval_timeout_hours ?? 24,
    updated_at: new Date().toISOString(),
  };

  let result;
  if (existing?.id) {
    result = await supabaseAdmin
      .from("ai_reply_settings")
      .update(payload)
      .eq("id", existing.id)
      .select()
      .single();
  } else {
    result = await supabaseAdmin
      .from("ai_reply_settings")
      .insert({
        ...tenantPayload(tenantId),
        ...payload,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();
  }

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, settings: result.data });
}
