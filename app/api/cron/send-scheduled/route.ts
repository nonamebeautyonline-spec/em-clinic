import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { pushMessage } from "@/lib/line-push";
import { tenantPayload } from "@/lib/tenant";

// Vercel Cron: 予約送信実行（5分おき）
export async function GET(req: NextRequest) {
  // Vercel Cron認証
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date().toISOString();

  // 送信予定時刻を過ぎた未送信メッセージを全テナント横断で取得
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
    // 各メッセージが持つ tenant_id を使用
    const msgTenantId: string | null = msg.tenant_id || null;

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
      // テンプレート変数を置換（patientsテーブルから患者名取得）
      const { data: patient } = await supabaseAdmin
        .from("patients")
        .select("name")
        .eq("patient_id", msg.patient_id)
        .maybeSingle();

      const resolvedMsg = msg.message_content
        .replace(/\{name\}/g, patient?.name || "")
        .replace(/\{patient_id\}/g, msg.patient_id);

      // flex_json がある場合はFLEXメッセージ、なければテキスト
      let res;
      if (msg.flex_json) {
        res = await pushMessage(msg.line_uid, [{
          type: "flex",
          altText: resolvedMsg,
          contents: msg.flex_json,
        }], msgTenantId ?? undefined);
      } else {
        res = await pushMessage(msg.line_uid, [{ type: "text", text: resolvedMsg }], msgTenantId ?? undefined);
      }

      if (res?.ok) {
        await supabaseAdmin.from("scheduled_messages").update({
          status: "sent",
          sent_at: new Date().toISOString(),
        }).eq("id", msg.id);

        // メッセージログ
        await supabaseAdmin.from("message_log").insert({
          ...tenantPayload(msgTenantId),
          patient_id: msg.patient_id,
          line_uid: msg.line_uid,
          message_type: "scheduled",
          content: resolvedMsg,
          flex_json: msg.flex_json || null,
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
