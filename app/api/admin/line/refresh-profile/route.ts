import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const LINE_ACCESS_TOKEN =
  process.env.LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN ||
  process.env.LINE_NOTIFY_CHANNEL_ACCESS_TOKEN || "";

// LINE Profile APIからプロフィール取得・更新
export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { patient_id } = await req.json();
  if (!patient_id) return NextResponse.json({ error: "patient_id required" }, { status: 400 });

  // patient_idからline_idを取得
  const { data: patient } = await supabaseAdmin
    .from("intake")
    .select("line_id")
    .eq("patient_id", patient_id)
    .maybeSingle();

  if (!patient?.line_id) {
    return NextResponse.json({ error: "LINE ID not found" }, { status: 404 });
  }

  if (!LINE_ACCESS_TOKEN) {
    return NextResponse.json({ error: "LINE access token not configured" }, { status: 500 });
  }

  // LINE Profile API
  const res = await fetch(`https://api.line.me/v2/bot/profile/${patient.line_id}`, {
    headers: { Authorization: `Bearer ${LINE_ACCESS_TOKEN}` },
    cache: "no-store",
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Failed to fetch LINE profile" }, { status: 502 });
  }

  const profile = await res.json();
  const displayName = profile.displayName || null;
  const pictureUrl = profile.pictureUrl || null;

  // DBに保存
  await supabaseAdmin
    .from("intake")
    .update({ line_display_name: displayName, line_picture_url: pictureUrl })
    .eq("patient_id", patient_id);

  return NextResponse.json({ ok: true, displayName, pictureUrl });
}
