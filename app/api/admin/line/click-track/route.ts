// app/api/admin/line/click-track/route.ts — クリック計測リンク管理
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant, tenantPayload } from "@/lib/tenant";

// クリック計測リンク一覧（配信IDで絞り込み可）
export async function GET(req: NextRequest) {
  const ok = await verifyAdminAuth(req);
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);
  const { searchParams } = new URL(req.url);
  const broadcastId = searchParams.get("broadcast_id");

  let query = supabaseAdmin
    .from("click_tracking_links")
    .select("*, click_events:click_tracking_events(count)")
    .order("created_at", { ascending: false });

  if (broadcastId) {
    query = query.eq("broadcast_id", Number(broadcastId));
  }

  const { data, error } = await withTenant(query, tenantId).limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // クリック数を整形
  const links = (data || []).map(l => ({
    ...l,
    click_count: l.click_events?.[0]?.count || 0,
    click_events: undefined,
  }));

  return NextResponse.json({ links });
}

// クリック計測リンク作成
export async function POST(req: NextRequest) {
  const ok = await verifyAdminAuth(req);
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);
  const { original_url, label, broadcast_id } = await req.json();
  if (!original_url) {
    return NextResponse.json({ error: "URLは必須です" }, { status: 400 });
  }

  const trackingCode = crypto.randomUUID().replace(/-/g, "").slice(0, 12);

  const { data, error } = await supabaseAdmin
    .from("click_tracking_links")
    .insert({
      ...tenantPayload(tenantId),
      tracking_code: trackingCode,
      original_url,
      label: label || null,
      broadcast_id: broadcast_id || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 計測用URLを生成
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://admin.noname-beauty.jp";
  const trackingUrl = `${baseUrl}/r/${trackingCode}`;

  return NextResponse.json({ link: data, tracking_url: trackingUrl });
}
