import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";

// 対応マーク更新
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { label, color, icon } = await req.json();

  const { data, error } = await supabaseAdmin
    .from("mark_definitions")
    .update({ label, color, icon })
    .eq("id", Number(id))
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ mark: data });
}

// 対応マーク削除
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // "none" は削除不可
  const { data: mark } = await supabaseAdmin
    .from("mark_definitions")
    .select("value")
    .eq("id", Number(id))
    .single();

  if (mark?.value === "none") {
    return NextResponse.json({ error: "「なし」は削除できません" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("mark_definitions")
    .delete()
    .eq("id", Number(id));

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
