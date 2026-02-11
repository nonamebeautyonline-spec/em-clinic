import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";

// 既読タイムスタンプ一括取得
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("chat_reads")
    .select("patient_id, read_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const reads: Record<string, string> = {};
  for (const row of data || []) {
    reads[row.patient_id] = row.read_at;
  }

  return NextResponse.json({ reads });
}

// 既読マーク（patient_id指定）
export async function PUT(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { patient_id } = await req.json();
  if (!patient_id) return NextResponse.json({ error: "patient_id is required" }, { status: 400 });

  const now = new Date().toISOString();
  const { error } = await supabaseAdmin
    .from("chat_reads")
    .upsert({ patient_id, read_at: now }, { onConflict: "patient_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, read_at: now });
}
