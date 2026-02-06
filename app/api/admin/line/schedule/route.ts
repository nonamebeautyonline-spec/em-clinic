import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";

// 予約送信一覧
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("scheduled_messages")
    .select("*")
    .order("scheduled_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ schedules: data });
}

// 予約送信登録
export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { patient_id, message, scheduled_at } = await req.json();
  if (!patient_id || !message?.trim() || !scheduled_at) {
    return NextResponse.json({ error: "patient_id, message, scheduled_at は必須です" }, { status: 400 });
  }

  // LINE UIDを取得
  const { data: intake } = await supabaseAdmin
    .from("intake")
    .select("line_id")
    .eq("patient_id", patient_id)
    .not("line_id", "is", null)
    .limit(1)
    .single();

  const { data, error } = await supabaseAdmin
    .from("scheduled_messages")
    .insert({
      patient_id,
      line_uid: intake?.line_id || null,
      message_content: message,
      scheduled_at,
      created_by: "admin",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ schedule: data });
}
