import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { pushMessage } from "@/lib/line-push";

// Vercel Cron: 予約送信実行（5分おき）
export async function GET(req: NextRequest) {
  // Vercel Cron認証
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date().toISOString();

  // 送信予定時刻を過ぎた未送信メッセージを取得
  const { data: messages, error } = await supabaseAdmin
    .from("scheduled_messages")
    .select("*")
    .eq("status", "scheduled")
    .lte("scheduled_at", now)
    .order("scheduled_at", { ascending: true })
    .limit(50);

  if (error) {
    console.error("[Cron] DB error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!messages?.length) {
    return NextResponse.json({ ok: true, processed: 0 });
  }

  let sent = 0;
  let failed = 0;

  for (const msg of messages) {
    if (!msg.line_uid) {
      await supabaseAdmin.from("scheduled_messages").update({
        status: "failed",
        error_message: "LINE UIDなし",
        sent_at: now,
      }).eq("id", msg.id);
      failed++;
      continue;
    }

    try {
      // テンプレート変数を置換
      const { data: intake } = await supabaseAdmin
        .from("intake")
        .select("patient_name")
        .eq("patient_id", msg.patient_id)
        .limit(1)
        .single();

      const resolvedMsg = msg.message_content
        .replace(/\{name\}/g, intake?.patient_name || "")
        .replace(/\{patient_id\}/g, msg.patient_id);

      const res = await pushMessage(msg.line_uid, [{ type: "text", text: resolvedMsg }]);

      if (res?.ok) {
        await supabaseAdmin.from("scheduled_messages").update({
          status: "sent",
          sent_at: new Date().toISOString(),
        }).eq("id", msg.id);

        // メッセージログ
        await supabaseAdmin.from("message_log").insert({
          patient_id: msg.patient_id,
          line_uid: msg.line_uid,
          message_type: "scheduled",
          content: resolvedMsg,
          status: "sent",
          direction: "outgoing",
        });
        sent++;
      } else {
        await supabaseAdmin.from("scheduled_messages").update({
          status: "failed",
          error_message: "LINE API error",
          sent_at: new Date().toISOString(),
        }).eq("id", msg.id);
        failed++;
      }
    } catch (err) {
      await supabaseAdmin.from("scheduled_messages").update({
        status: "failed",
        error_message: err instanceof Error ? err.message : "Unknown error",
        sent_at: new Date().toISOString(),
      }).eq("id", msg.id);
      failed++;
    }
  }

  console.log(`[Cron] Processed: sent=${sent}, failed=${failed}`);
  return NextResponse.json({ ok: true, processed: messages.length, sent, failed });
}
