import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";

// リッチメニュー一覧
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("rich_menus")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ menus: data });
}

// リッチメニュー作成
export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, chat_bar_text, size_type, areas, image_url } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "タイトルは必須です" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("rich_menus")
    .insert({
      name: name.trim(),
      chat_bar_text: chat_bar_text || "メニュー",
      size_type: size_type || "full",
      areas: areas || [],
      image_url: image_url || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ menu: data });
}
