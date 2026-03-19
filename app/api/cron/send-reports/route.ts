// app/api/cron/send-reports/route.ts — 定期レポート自動メール送信Cron
// 毎日9:00(JST)に実行。テナントごとの設定に基づき週次/月次レポートを生成・送信
import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { acquireLock } from "@/lib/distributed-lock";
import { getSetting } from "@/lib/settings";
import { generateWeeklyReport, generateMonthlyReport } from "@/lib/report-generator";
import { sendEmail } from "@/lib/email";
import { notifyCronFailure } from "@/lib/notifications/cron-failure";

export async function GET(req: NextRequest) {
  // Vercel Cron認証
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return unauthorized();
  }

  // 排他制御
  const lock = await acquireLock("cron:send-reports", 120);
  if (!lock.acquired) {
    return NextResponse.json({ ok: true, skipped: "別のプロセスが実行中" });
  }

  try {
    const now = new Date();
    const jstOffset = 9 * 60 * 60 * 1000;
    const jstNow = new Date(now.getTime() + jstOffset);
    const dayOfWeek = jstNow.getUTCDay(); // 0=日, 1=月, ...
    const dayOfMonth = jstNow.getUTCDate();

    // 全テナントを取得
    const { data: tenants, error: tenantError } = await supabaseAdmin
      .from("tenants")
      .select("id, name")
      .eq("status", "active");

    if (tenantError) {
      console.error("[send-reports] テナント取得エラー:", tenantError.message);
      return serverError(tenantError.message);
    }

    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const tenant of tenants ?? []) {
      try {
        // テナント設定を取得
        const enabled = await getSetting("report", "enabled", tenant.id);
        if (enabled !== "true") {
          skipped++;
          continue;
        }

        const frequency = await getSetting("report", "frequency", tenant.id);
        const emailsRaw = await getSetting("report", "emails", tenant.id);

        if (!emailsRaw) {
          skipped++;
          continue;
        }

        const emails = emailsRaw.split(",").map((e) => e.trim()).filter(Boolean);
        if (emails.length === 0) {
          skipped++;
          continue;
        }

        // 頻度判定
        let shouldSend = false;
        let reportType: "weekly" | "monthly" = "weekly";

        if (frequency === "weekly") {
          // 月曜日に送信（前週分）
          shouldSend = dayOfWeek === 1;
          reportType = "weekly";
        } else if (frequency === "monthly") {
          // 月初1日に送信（前月分）
          shouldSend = dayOfMonth === 1;
          reportType = "monthly";
        } else if (frequency === "both") {
          // 週次: 月曜、月次: 1日
          if (dayOfMonth === 1) {
            // 月初は月次レポートを優先送信
            reportType = "monthly";
            shouldSend = true;
          } else if (dayOfWeek === 1) {
            reportType = "weekly";
            shouldSend = true;
          }
        }

        if (!shouldSend) {
          skipped++;
          continue;
        }

        // レポート生成
        const report = reportType === "weekly"
          ? await generateWeeklyReport(tenant.id, now)
          : await generateMonthlyReport(tenant.id, now);

        // 各メールアドレスに送信
        for (const email of emails) {
          try {
            await sendEmail({
              to: email,
              subject: report.subject,
              html: report.html,
            });
            sent++;
          } catch (err) {
            console.error(`[send-reports] メール送信失敗 (${email}):`, err);
            failed++;
          }
        }

        // 月次+週次の場合、月初の月曜は週次も送信
        if (frequency === "both" && dayOfMonth === 1 && dayOfWeek === 1) {
          const weeklyReport = await generateWeeklyReport(tenant.id, now);
          for (const email of emails) {
            try {
              await sendEmail({
                to: email,
                subject: weeklyReport.subject,
                html: weeklyReport.html,
              });
              sent++;
            } catch (err) {
              console.error(`[send-reports] 週次メール送信失敗 (${email}):`, err);
              failed++;
            }
          }
        }
      } catch (err) {
        console.error(`[send-reports] テナント${tenant.id}処理エラー:`, err);
        failed++;
      }
    }

    console.log(`[send-reports] 完了: sent=${sent}, skipped=${skipped}, failed=${failed}`);
    return NextResponse.json({ ok: true, sent, skipped, failed });
  } catch (e) {
    console.error("[send-reports] エラー:", e);
    notifyCronFailure("send-reports", e).catch(() => {});
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  } finally {
    await lock.release();
  }
}
