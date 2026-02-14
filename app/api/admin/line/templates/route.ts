import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";

// テンプレート一覧
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("message_templates")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ templates: data });
}

// テンプレート作成
export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, content, message_type, category, flex_content } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "名前は必須です" }, { status: 400 });
  }
  // flex テンプレートはcontent不要、それ以外はcontent必須
  if (message_type !== "flex" && !content?.trim()) {
    return NextResponse.json({ error: "内容は必須です" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("message_templates")
    .insert({
      name: name.trim(),
      content: content?.trim() || "",
      message_type: message_type || "text",
      category,
      flex_content: flex_content || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ template: data });
}
