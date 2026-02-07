import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";

// 公開/非公開切替
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { is_published } = await req.json();

  const { data, error } = await supabaseAdmin
    .from("forms")
    .update({ is_published: !!is_published, updated_at: new Date().toISOString() })
    .eq("id", parseInt(id))
    .select("id, is_published")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, form: data });
}
