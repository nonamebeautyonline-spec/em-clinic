import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";

// メッセージ送信履歴一覧
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const patientId = searchParams.get("patient_id");
  const limit = Number(searchParams.get("limit")) || 50;
  const offset = Number(searchParams.get("offset")) || 0;
  const messageType = searchParams.get("type");
  const search = searchParams.get("search")?.trim();

  let query = supabaseAdmin
    .from("message_log")
    .select("*", { count: "exact" })
    .order("sent_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (patientId) query = query.eq("patient_id", patientId);
  if (messageType) query = query.eq("message_type", messageType);
  if (search) query = query.ilike("content", `%${search}%`);

  const { data, error, count } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // directionがNULLの古いレコードはstatusから推定
  const messages = (data || []).map((m: Record<string, unknown>) => ({
    ...m,
    direction: m.direction || (["sent", "failed", "no_uid"].includes(m.status as string) ? "outgoing" : "incoming"),
  }));

  return NextResponse.json({ messages, total: count });
}
