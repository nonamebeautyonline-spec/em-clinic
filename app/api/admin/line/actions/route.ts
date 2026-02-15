import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant, tenantPayload } from "@/lib/tenant";

// アクション一覧
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);
  const { searchParams } = new URL(req.url);
  const folderId = searchParams.get("folder_id");

  let query = supabaseAdmin
    .from("actions")
    .select("*")
    .order("created_at", { ascending: false });

  if (folderId) query = query.eq("folder_id", parseInt(folderId));

  const { data, error } = await withTenant(query, tenantId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ actions: data || [] });
}

// アクション作成
export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);
  const { name, folder_id, steps, repeat_enabled } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "アクション名は必須です" }, { status: 400 });
  if (!steps || !Array.isArray(steps) || steps.length === 0) {
    return NextResponse.json({ error: "少なくとも1つの動作を設定してください" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("actions")
    .insert({
      ...tenantPayload(tenantId),
      name: name.trim(),
      folder_id: folder_id || null,
      steps,
      repeat_enabled: repeat_enabled !== false,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, action: data });
}

// アクション更新
export async function PUT(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);
  const { id, name, folder_id, steps, repeat_enabled } = await req.json();
  if (!id) return NextResponse.json({ error: "IDは必須です" }, { status: 400 });
  if (!name?.trim()) return NextResponse.json({ error: "アクション名は必須です" }, { status: 400 });

  const { data, error } = await withTenant(
    supabaseAdmin
      .from("actions")
      .update({
        name: name.trim(),
        folder_id: folder_id || null,
        steps: steps || [],
        repeat_enabled: repeat_enabled !== false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id),
    tenantId
  ).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, action: data });
}

// アクション削除
export async function DELETE(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "IDは必須です" }, { status: 400 });

  const { error } = await withTenant(
    supabaseAdmin
      .from("actions")
      .delete()
      .eq("id", parseInt(id)),
    tenantId
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
