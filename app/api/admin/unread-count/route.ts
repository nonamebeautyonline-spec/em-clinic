// 未読メッセージ数カウントAPI（サイドバーバッジ用・軽量）
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 1. 既読タイムスタンプ一括取得
  const { data: chatReads } = await supabaseAdmin
    .from("chat_reads")
    .select("patient_id, read_at");

  const reads: Record<string, string> = {};
  for (const row of chatReads || []) {
    reads[row.patient_id] = row.read_at;
  }

  // 2. 顧客からのテキストメッセージ（incoming かつ event以外）を取得
  //    patient_id と sent_at のみで軽量化
  const allMsgs: { patient_id: string; sent_at: string }[] = [];
  let offset = 0;
  const pageSize = 5000;
  for (;;) {
    const { data, error } = await supabaseAdmin
      .from("message_log")
      .select("patient_id, sent_at")
      .eq("direction", "incoming")
      .neq("message_type", "event")
      .order("sent_at", { ascending: false })
      .range(offset, offset + pageSize - 1);
    if (error || !data || data.length === 0) break;
    allMsgs.push(...data);
    if (data.length < pageSize) break;
    offset += pageSize;
  }

  // 3. 患者ごとの最新テキスト送信時刻を集計
  const lastTextAt: Record<string, string> = {};
  for (const msg of allMsgs) {
    if (!msg.patient_id) continue;
    if (!lastTextAt[msg.patient_id]) {
      lastTextAt[msg.patient_id] = msg.sent_at;
    }
  }

  // 4. 未読カウント: last_text_at > read_at の患者数
  let count = 0;
  for (const [pid, sentAt] of Object.entries(lastTextAt)) {
    const readAt = reads[pid];
    if (!readAt || sentAt > readAt) {
      count++;
    }
  }

  return NextResponse.json({ count }, {
    headers: { "Cache-Control": "no-store" },
  });
}
