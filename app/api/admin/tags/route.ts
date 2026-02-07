import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";

// タグ一覧取得（各タグの患者数付き）
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: tagDefs, error } = await supabaseAdmin
    .from("tag_definitions")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // タグごとの患者数を一括取得
  const { data: allPT } = await supabaseAdmin
    .from("patient_tags")
    .select("tag_id")
    .limit(100000);

  const countMap = new Map<number, number>();
  for (const pt of allPT || []) {
    countMap.set(pt.tag_id, (countMap.get(pt.tag_id) || 0) + 1);
  }

  const tags = (tagDefs || []).map(t => ({
    ...t,
    patient_count: countMap.get(t.id) || 0,
  }));

  return NextResponse.json({ tags });
}

// タグ作成
export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, color, description, is_auto, auto_rule } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "名前は必須です" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("tag_definitions")
    .insert({ name: name.trim(), color: color || "#6B7280", description, is_auto: is_auto || false, auto_rule })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "同じ名前のタグが既に存在します" }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tag: data });
}
