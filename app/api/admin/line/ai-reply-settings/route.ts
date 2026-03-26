// AI返信設定 API（GET/PUT）

import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveTenantIdOrThrow, strictWithTenant, tenantPayload } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { updateAiReplySettingsSchema } from "@/lib/validations/line-management";
import { DEFAULT_BUSINESS_HOURS, type BusinessHoursConfig } from "@/lib/business-hours";
import { logAudit } from "@/lib/audit";
import { saveKnowledgeChunks } from "@/lib/embedding";

export const dynamic = "force-dynamic";

// 設定取得
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);

  const { data, error } = await strictWithTenant(
    supabaseAdmin.from("ai_reply_settings").select("*").maybeSingle(),
    tenantId
  );

  if (error) {
    return serverError(error.message);
  }

  // 設定が存在しない場合はデフォルト値を返す
  const settings = data || {
    is_enabled: false,
    mode: "approval",
    medical_reply_mode: "confirm",
    greeting_reply_enabled: false,
    knowledge_base: "",
    custom_instructions: "",
    min_message_length: 5,
    daily_limit: 100,
    approval_timeout_hours: 24,
    model_id: "claude-sonnet-4-6",
  };
  // model_id が未設定（既存レコード）の場合はデフォルト値を補完
  if (!settings.model_id) {
    settings.model_id = "claude-sonnet-4-6";
  }

  // 本日のAI返信使用数を取得
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const { count: todayUsage } = await strictWithTenant(
    supabaseAdmin
      .from("ai_reply_drafts")
      .select("id", { count: "exact", head: true })
      .gte("created_at", todayStart.toISOString()),
    tenantId
  );

  // 営業時間設定を tenant_settings から取得
  let businessHoursQuery = supabaseAdmin
    .from("tenant_settings")
    .select("value")
    .eq("category", "ai_reply")
    .eq("key", "business_hours");
  if (tenantId) {
    businessHoursQuery = businessHoursQuery.eq("tenant_id", tenantId);
  } else {
    businessHoursQuery = businessHoursQuery.is("tenant_id", null);
  }
  const { data: bhRow } = await businessHoursQuery.maybeSingle();
  const businessHours: BusinessHoursConfig = bhRow?.value
    ? { ...DEFAULT_BUSINESS_HOURS, ...(typeof bhRow.value === "string" ? JSON.parse(bhRow.value) : bhRow.value) }
    : DEFAULT_BUSINESS_HOURS;

  return NextResponse.json({ settings, todayUsage: todayUsage || 0, businessHours });
}

// 設定更新（upsert）
export async function PUT(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const parsed = await parseBody(req, updateAiReplySettingsSchema);
  if ("error" in parsed) return parsed.error;
  const {
    is_enabled,
    mode,
    medical_reply_mode,
    greeting_reply_enabled,
    knowledge_base,
    custom_instructions,
    min_message_length,
    daily_limit,
    approval_timeout_hours,
    business_hours,
    model_id,
    rag_similarity_threshold,
    rag_max_examples,
    rag_max_kb_chunks,
  } = parsed.data;

  // 既存設定を確認
  const { data: existing } = await strictWithTenant(
    supabaseAdmin.from("ai_reply_settings").select("id").maybeSingle(),
    tenantId
  );

  const payload = {
    is_enabled: is_enabled ?? false,
    mode: mode || "approval",
    medical_reply_mode: medical_reply_mode || "confirm",
    greeting_reply_enabled: greeting_reply_enabled ?? false,
    knowledge_base: knowledge_base || "",
    custom_instructions: custom_instructions || "",
    min_message_length: min_message_length ?? 5,
    daily_limit: daily_limit ?? 100,
    approval_timeout_hours: approval_timeout_hours ?? 24,
    model_id: model_id || "claude-sonnet-4-6",
    rag_similarity_threshold: rag_similarity_threshold ?? 0.35,
    rag_max_examples: rag_max_examples ?? 5,
    rag_max_kb_chunks: rag_max_kb_chunks ?? 5,
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
    return serverError(result.error.message);
  }

  // KBが更新された場合、チャンキング + embedding を非同期実行
  if (knowledge_base && knowledge_base.trim().length > 0) {
    saveKnowledgeChunks(knowledge_base, tenantId).catch(err => {
      console.error("[AI Reply Settings] KBチャンキングエラー:", err);
    });
  }

  // 営業時間設定を tenant_settings に保存（別テーブル管理）
  if (business_hours) {
    await supabaseAdmin
      .from("tenant_settings")
      .upsert(
        {
          tenant_id: tenantId || null,
          category: "ai_reply",
          key: "business_hours",
          value: JSON.stringify(business_hours),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "tenant_id,category,key" }
      );
  }

  logAudit(req, "ai_reply_settings.update", "ai_reply_settings", "settings");
  return NextResponse.json({ ok: true, settings: result.data });
}
