// app/api/admin/line/keyword-replies/route.ts — キーワード自動応答 CRUD
import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant, tenantPayload } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { keywordReplySchema } from "@/lib/validations/line-common";

// 一覧取得
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantId(req);

  const { data, error } = await withTenant(
    supabaseAdmin
      .from("keyword_auto_replies")
      .select("*")
      .order("priority", { ascending: false })
      .order("id", { ascending: true }),
    tenantId
  );

  if (error) return serverError(error.message);
  return NextResponse.json({ rules: data || [] });
}

// 新規作成
export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantId(req);

  const parsed = await parseBody(req, keywordReplySchema);
  if ("error" in parsed) return parsed.error;
  const { name, keyword, match_type, priority, is_enabled, reply_type, reply_text, reply_template_id, reply_action_id, condition_rules } = parsed.data;

  // 正規表現の妥当性チェック
  if (match_type === "regex") {
    try { new RegExp(keyword); } catch {
      return badRequest("正規表現が不正です");
    }
  }

  const { data, error } = await supabaseAdmin
    .from("keyword_auto_replies")
    .insert({
      ...tenantPayload(tenantId),
      name: name.trim(),
      keyword: keyword.trim(),
      match_type: match_type || "partial",
      priority: priority ?? 0,
      is_enabled: is_enabled !== false,
      reply_type: reply_type || "text",
      reply_text: reply_text || null,
      reply_template_id: reply_template_id || null,
      reply_action_id: reply_action_id || null,
      condition_rules: condition_rules || [],
    })
    .select()
    .single();

  if (error) return serverError(error.message);
  return NextResponse.json({ ok: true, rule: data });
}

// 更新
export async function PUT(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantId(req);

  const parsed = await parseBody(req, keywordReplySchema);
  if ("error" in parsed) return parsed.error;
  const body = parsed.data as Record<string, unknown>;
  const id = body.id as string | undefined;
  const { name, keyword, match_type, priority, is_enabled, reply_type, reply_text, reply_template_id, reply_action_id, condition_rules } = parsed.data;

  if (!id) return badRequest("IDは必須です");

  if (match_type === "regex") {
    try { new RegExp(keyword); } catch {
      return badRequest("正規表現が不正です");
    }
  }

  const { data, error } = await withTenant(
    supabaseAdmin
      .from("keyword_auto_replies")
      .update({
        name: name.trim(),
        keyword: keyword.trim(),
        match_type: match_type || "partial",
        priority: priority ?? 0,
        is_enabled: is_enabled !== false,
        reply_type: reply_type || "text",
        reply_text: reply_text || null,
        reply_template_id: reply_template_id || null,
        reply_action_id: reply_action_id || null,
        condition_rules: condition_rules || [],
        updated_at: new Date().toISOString(),
      })
      .eq("id", id),
    tenantId
  ).select().single();

  if (error) return serverError(error.message);
  return NextResponse.json({ ok: true, rule: data });
}

// 削除
export async function DELETE(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantId(req);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return badRequest("IDは必須です");

  const { error } = await withTenant(
    supabaseAdmin
      .from("keyword_auto_replies")
      .delete()
      .eq("id", parseInt(id)),
    tenantId
  );

  if (error) return serverError(error.message);
  return NextResponse.json({ ok: true });
}
