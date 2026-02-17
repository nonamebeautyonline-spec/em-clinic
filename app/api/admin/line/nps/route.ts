// app/api/admin/line/nps/route.ts — NPS調査管理 CRUD
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant, tenantPayload } from "@/lib/tenant";

// 調査一覧
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);

  const { data: surveys, error } = await withTenant(
    supabaseAdmin.from("nps_surveys").select("*").order("created_at", { ascending: false }),
    tenantId
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 回答数を付与
  const enriched = await Promise.all(
    (surveys || []).map(async (s: any) => {
      const { count } = await withTenant(
        supabaseAdmin.from("nps_responses").select("*", { count: "exact", head: true }).eq("survey_id", s.id),
        tenantId
      );
      return { ...s, response_count: count || 0 };
    })
  );

  return NextResponse.json({ surveys: enriched });
}

// 調査作成
export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);
  const body = await req.json();
  const { title, question_text, comment_label, thank_you_message, auto_send_after, auto_send_delay_hours } = body;

  if (!title?.trim()) return NextResponse.json({ error: "タイトルは必須です" }, { status: 400 });

  const { data: survey, error } = await supabaseAdmin
    .from("nps_surveys")
    .insert({
      ...tenantPayload(tenantId),
      title: title.trim(),
      question_text: question_text || "この施設を友人や知人にどの程度おすすめしたいですか？",
      comment_label: comment_label || "ご意見・ご感想があればお聞かせください",
      thank_you_message: thank_you_message || "ご回答ありがとうございます",
      auto_send_after: auto_send_after || null,
      auto_send_delay_hours: auto_send_delay_hours || 24,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, survey });
}

// 調査更新
export async function PUT(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);
  const body = await req.json();
  const { id, title, question_text, comment_label, thank_you_message, is_active, auto_send_after, auto_send_delay_hours } = body;

  if (!id) return NextResponse.json({ error: "IDは必須です" }, { status: 400 });

  const { error } = await withTenant(
    supabaseAdmin.from("nps_surveys").update({
      title: title?.trim() || "",
      question_text: question_text || "",
      comment_label: comment_label || "",
      thank_you_message: thank_you_message || "",
      is_active: is_active !== false,
      auto_send_after: auto_send_after || null,
      auto_send_delay_hours: auto_send_delay_hours || 24,
      updated_at: new Date().toISOString(),
    }).eq("id", id),
    tenantId
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// 調査削除
export async function DELETE(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "IDは必須です" }, { status: 400 });

  const { error } = await withTenant(
    supabaseAdmin.from("nps_surveys").delete().eq("id", parseInt(id)),
    tenantId
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
