// app/api/admin/line/keyword-replies/route.ts — キーワード自動応答 CRUD
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant, tenantPayload } from "@/lib/tenant";

// 一覧取得
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);

  const { data, error } = await withTenant(
    supabaseAdmin
      .from("keyword_auto_replies")
      .select("*")
      .order("priority", { ascending: false })
      .order("id", { ascending: true }),
    tenantId
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rules: data || [] });
}

// 新規作成
export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);
  const body = await req.json();
  const { name, keyword, match_type, priority, is_enabled, reply_type, reply_text, reply_template_id, reply_action_id, condition_rules } = body;

  if (!name?.trim()) return NextResponse.json({ error: "ルール名は必須です" }, { status: 400 });
  if (!keyword?.trim()) return NextResponse.json({ error: "キーワードは必須です" }, { status: 400 });

  // 正規表現の妥当性チェック
  if (match_type === "regex") {
    try { new RegExp(keyword); } catch {
      return NextResponse.json({ error: "正規表現が不正です" }, { status: 400 });
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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, rule: data });
}

// 更新
export async function PUT(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);
  const body = await req.json();
  const { id, name, keyword, match_type, priority, is_enabled, reply_type, reply_text, reply_template_id, reply_action_id, condition_rules } = body;

  if (!id) return NextResponse.json({ error: "IDは必須です" }, { status: 400 });
  if (!name?.trim()) return NextResponse.json({ error: "ルール名は必須です" }, { status: 400 });
  if (!keyword?.trim()) return NextResponse.json({ error: "キーワードは必須です" }, { status: 400 });

  if (match_type === "regex") {
    try { new RegExp(keyword); } catch {
      return NextResponse.json({ error: "正規表現が不正です" }, { status: 400 });
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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, rule: data });
}

// 削除
export async function DELETE(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "IDは必須です" }, { status: 400 });

  const { error } = await withTenant(
    supabaseAdmin
      .from("keyword_auto_replies")
      .delete()
      .eq("id", parseInt(id)),
    tenantId
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
