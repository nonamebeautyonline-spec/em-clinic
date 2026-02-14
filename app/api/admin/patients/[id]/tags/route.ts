import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { evaluateMenuRules } from "@/lib/menu-auto-rules";

// 患者のタグ一覧取得
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from("patient_tags")
    .select("*, tag_definitions(*)")
    .eq("patient_id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tags: data });
}

// 患者にタグを付与
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { tag_id } = await req.json();

  const { error } = await supabaseAdmin
    .from("patient_tags")
    .upsert({ patient_id: id, tag_id, assigned_by: "admin" }, { onConflict: "patient_id,tag_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // メニュー自動切替ルール評価（非同期・失敗無視）
  evaluateMenuRules(id).catch(() => {});
  return NextResponse.json({ ok: true });
}

// 患者からタグを解除
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const tagId = searchParams.get("tag_id");

  if (!tagId) return NextResponse.json({ error: "tag_id required" }, { status: 400 });

  const { error } = await supabaseAdmin
    .from("patient_tags")
    .delete()
    .eq("patient_id", id)
    .eq("tag_id", Number(tagId));

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // メニュー自動切替ルール評価（非同期・失敗無視）
  evaluateMenuRules(id).catch(() => {});
  return NextResponse.json({ ok: true });
}
