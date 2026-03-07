import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { pushMessage } from "@/lib/line-push";
import { tenantPayload } from "@/lib/tenant";
import { acquireLock } from "@/lib/distributed-lock";
import { notifyCronFailure } from "@/lib/notifications/cron-failure";

// Vercel Cron: 予約送信実行（5分おき）
export async function GET(req: NextRequest) {
  // Vercel Cron認証
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return unauthorized();
  }

  // 排他制御: 同時実行を防止
  const lock = await acquireLock("cron:send-scheduled", 55);
  if (!lock.acquired) {
    return NextResponse.json({ ok: true, skipped: "別のプロセスが実行中" });
  }

  try {
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
      notifyCronFailure("send-scheduled", error).catch(() => {});
      return serverError(error.message);
    }

    if (!messages?.length) {
      return NextResponse.json({ ok: true, processed: 0 });
    }

    let sent = 0;
    let failed = 0;

    // 全患者名を一括取得（N+1クエリ防止）
    const allPatientIds = [...new Set(messages.map(m => m.patient_id).filter(Boolean))];
    const patientNameMap = new Map<string, string>();
    if (allPatientIds.length > 0) {
      const { data: patients } = await supabaseAdmin
        .from("patients")
        .select("patient_id, name")
        .in("patient_id", allPatientIds);
      for (const p of patients || []) {
        if (p.name) patientNameMap.set(p.patient_id, p.name);
      }
    }

    // LINE UIDなしのメッセージを先に処理
    const validMessages = [];
    for (const msg of messages) {
      if (!msg.line_uid) {
        await supabaseAdmin.from("scheduled_messages").update({
          status: "failed",
          error_message: "LINE UIDなし",
          sent_at: now,
        }).eq("id", msg.id);
        failed++;
      } else {
        validMessages.push(msg);
      }
    }

    // 1メッセージの送信処理（バッチ並列用）
    const processSingleMessage = async (msg: typeof messages[number]) => {
      const msgTenantId: string | null = msg.tenant_id || null;
      const patientName = patientNameMap.get(msg.patient_id) || "";

      const resolvedMsg = msg.message_content
        .replace(/\{name\}/g, patientName)
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
        return "sent" as const;
      } else {
        await supabaseAdmin.from("scheduled_messages").update({
          status: "failed",
          error_message: "LINE API error",
          sent_at: new Date().toISOString(),
        }).eq("id", msg.id);
        return "failed" as const;
      }
    };

    // 10件ずつバッチで並列送信
    const BATCH_SIZE = 10;
    for (let i = 0; i < validMessages.length; i += BATCH_SIZE) {
      const batch = validMessages.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (msg) => {
          try {
            return await processSingleMessage(msg);
          } catch (err) {
            await supabaseAdmin.from("scheduled_messages").update({
              status: "failed",
              error_message: err instanceof Error ? err.message : "Unknown error",
              sent_at: new Date().toISOString(),
            }).eq("id", msg.id);
            return "failed" as const;
          }
        })
      );
      for (const r of results) {
        if (r.status === "fulfilled" && r.value === "sent") sent++;
        else failed++;
      }
    }

    console.log(`[Cron] Processed: sent=${sent}, failed=${failed}`);
    return NextResponse.json({ ok: true, processed: messages.length, sent, failed });
  } finally {
    await lock.release();
  }
}
