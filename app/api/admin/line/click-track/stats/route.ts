// app/api/admin/line/click-track/stats/route.ts — クリック統計
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  const ok = await verifyAdminAuth(req);
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const linkId = searchParams.get("link_id");

  if (linkId) {
    // 特定リンクのクリック詳細
    const { data: events } = await supabaseAdmin
      .from("click_tracking_events")
      .select("id, clicked_at, user_agent, ip_address")
      .eq("link_id", Number(linkId))
      .order("clicked_at", { ascending: false })
      .limit(200);

    return NextResponse.json({ events: events || [] });
  }

  // 全リンクの概要統計
  const { data: links } = await supabaseAdmin
    .from("click_tracking_links")
    .select(`
      id, tracking_code, original_url, label, broadcast_id, created_at,
      click_tracking_events(count)
    `)
    .order("created_at", { ascending: false })
    .limit(50);

  const stats = (links || []).map(l => ({
    id: l.id,
    tracking_code: l.tracking_code,
    original_url: l.original_url,
    label: l.label,
    broadcast_id: l.broadcast_id,
    created_at: l.created_at,
    click_count: (l.click_tracking_events as { count: number }[])?.[0]?.count || 0,
  }));

  return NextResponse.json({ stats });
}
