// app/r/[code]/route.ts — クリック計測リダイレクト
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  // トラッキングリンク取得
  const { data: link } = await supabaseAdmin
    .from("click_tracking_links")
    .select("id, original_url")
    .eq("tracking_code", code)
    .maybeSingle();

  if (!link) {
    return NextResponse.json({ error: "リンクが見つかりません" }, { status: 404 });
  }

  // クリックイベント記録
  const ua = req.headers.get("user-agent") || "";
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";

  await supabaseAdmin.from("click_tracking_events").insert({
    link_id: link.id,
    user_agent: ua.slice(0, 500),
    ip_address: ip,
  });

  // リダイレクト
  return NextResponse.redirect(link.original_url, { status: 302 });
}
