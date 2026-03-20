// app/api/admin/line/tracking-sources/route.ts — 流入経路CRUD
import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow, strictWithTenant, tenantPayload } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import {
  createTrackingSourceSchema,
  updateTrackingSourceSchema,
} from "@/lib/validations/line-management";
import { getSettingOrEnv } from "@/lib/settings";
import { logAudit } from "@/lib/audit";

// 一覧取得（visit_count, converted_count 付き）
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const { searchParams } = new URL(req.url);
  const folderId = searchParams.get("folder_id");

  let query = supabaseAdmin
    .from("tracking_sources")
    .select("*, tracking_visits(count)")
    .order("created_at", { ascending: false });

  if (folderId === "null" || folderId === "uncategorized") {
    query = query.is("folder_id", null);
  } else if (folderId) {
    query = query.eq("folder_id", Number(folderId));
  }

  const { data, error } = await strictWithTenant(query, tenantId);
  if (error) return serverError(error.message);

  // CV数を取得（converted_atがnullでないvisit）
  const sourceIds = (data || []).map((s: Record<string, unknown>) => s.id as number);
  let convertedMap: Record<number, number> = {};

  if (sourceIds.length > 0) {
    const { data: cvData } = await strictWithTenant(
      supabaseAdmin
        .from("tracking_visits")
        .select("source_id")
        .in("source_id", sourceIds)
        .not("converted_at", "is", null),
      tenantId
    );
    if (cvData) {
      for (const row of cvData) {
        const sid = row.source_id as number;
        convertedMap[sid] = (convertedMap[sid] || 0) + 1;
      }
    }
  }

  const baseUrl = (await getSettingOrEnv("general", "app_base_url", "APP_BASE_URL", tenantId ?? undefined)) || "";

  const sources = (data || []).map((s: Record<string, unknown>) => {
    const visitCount = Array.isArray(s.tracking_visits) && s.tracking_visits.length > 0
      ? (s.tracking_visits[0] as Record<string, number>).count
      : 0;
    const convertedCount = convertedMap[s.id as number] || 0;
    return {
      ...s,
      visit_count: visitCount,
      converted_count: convertedCount,
      cvr: visitCount > 0 ? Math.round((convertedCount / visitCount) * 1000) / 10 : 0,
      tracking_url: `${baseUrl}/s/${s.code}`,
      tracking_visits: undefined,
    };
  });

  return NextResponse.json({ sources });
}

// 新規作成
export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const parsed = await parseBody(req, createTrackingSourceSchema);
  if ("error" in parsed) return parsed.error;

  const {
    name, destination_url, folder_id, qr_display_text,
    valid_from, valid_until, action_settings, ignore_friend_add_action,
    action_execution, utm_defaults, custom_params,
    html_head_tags, html_body_tags, memo,
  } = parsed.data;

  const code = crypto.randomUUID().replace(/-/g, "").slice(0, 10);

  const { data, error } = await supabaseAdmin
    .from("tracking_sources")
    .insert({
      ...tenantPayload(tenantId),
      code,
      name: name.trim(),
      destination_url,
      folder_id: folder_id || null,
      qr_display_text: qr_display_text || null,
      valid_from: valid_from || null,
      valid_until: valid_until || null,
      action_settings: action_settings || { enabled: false, steps: [] },
      ignore_friend_add_action: ignore_friend_add_action || false,
      action_execution: action_execution || "always",
      utm_defaults: utm_defaults || {},
      custom_params: custom_params || [],
      html_head_tags: html_head_tags || null,
      html_body_tags: html_body_tags || null,
      memo: memo || null,
    })
    .select()
    .single();

  if (error) return serverError(error.message);

  const baseUrl = (await getSettingOrEnv("general", "app_base_url", "APP_BASE_URL", tenantId ?? undefined)) || "";

  logAudit(req, "tracking_source.create", "tracking_source", "unknown");
  return NextResponse.json({
    ok: true,
    source: data,
    tracking_url: `${baseUrl}/s/${code}`,
  });
}

// 更新
export async function PUT(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const parsed = await parseBody(req, updateTrackingSourceSchema);
  if ("error" in parsed) return parsed.error;

  const { id, ...updates } = parsed.data;

  // name があればトリム
  if (updates.name) updates.name = updates.name.trim();

  const { data, error } = await strictWithTenant(
    supabaseAdmin
      .from("tracking_sources")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", Number(id)),
    tenantId
  ).select().single();

  if (error) return serverError(error.message);
  logAudit(req, "tracking_source.update", "tracking_source", String(id));
  return NextResponse.json({ ok: true, source: data });
}

// 削除
export async function DELETE(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return badRequest("IDは必須です");

  // 関連する訪問記録も削除
  await strictWithTenant(
    supabaseAdmin
      .from("tracking_visits")
      .delete()
      .eq("source_id", parseInt(id)),
    tenantId
  );

  const { error } = await strictWithTenant(
    supabaseAdmin
      .from("tracking_sources")
      .delete()
      .eq("id", parseInt(id)),
    tenantId
  );

  if (error) return serverError(error.message);
  logAudit(req, "tracking_source.delete", "tracking_source", "unknown");
  return NextResponse.json({ ok: true });
}
