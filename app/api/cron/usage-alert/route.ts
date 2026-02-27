// app/api/cron/usage-alert/route.ts
// 使用量アラートCronジョブ（日次実行想定）
// 全アクティブテナントの使用量をチェックし、80%/90%/100%しきい値で段階的にメール通知

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { acquireLock } from "@/lib/distributed-lock";
import { checkQuota, ALERT_THRESHOLDS } from "@/lib/usage-quota";
import { sendEmail } from "@/lib/email";
import { redis } from "@/lib/redis";

export const dynamic = "force-dynamic";

/**
 * しきい値ごとのメール件名と本文を生成
 */
function buildAlertEmail(
  tenantName: string,
  threshold: (typeof ALERT_THRESHOLDS)[number],
  usage: number,
  quota: number,
  percentUsed: number,
): { subject: string; html: string } {
  const subjectMap = {
    caution: `【注意】メッセージ使用量が${threshold.percent}%に到達しました`,
    warning: `【警告】メッセージ使用量が${threshold.percent}%に到達しました`,
    limit: `【制限】メッセージ使用量が上限に到達しました`,
  };

  const descriptionMap = {
    caution:
      "メッセージ送信数がプラン上限の80%に達しました。残り通数が少なくなっています。",
    warning:
      "メッセージ送信数がプラン上限の90%に達しました。まもなく上限に到達します。プランのアップグレードをご検討ください。",
    limit:
      "メッセージ送信数がプラン上限に到達しました。これ以上のメッセージ送信には追加料金が発生する場合があります。プランのアップグレードをご検討ください。",
  };

  return {
    subject: subjectMap[threshold.level],
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333; border-bottom: 2px solid #e5e7eb; padding-bottom: 12px;">
          メッセージ使用量${threshold.label}
        </h2>
        <p style="color: #555; line-height: 1.6;">
          ${tenantName} 様
        </p>
        <p style="color: #555; line-height: 1.6;">
          ${descriptionMap[threshold.level]}
        </p>
        <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666;">送信数</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #333;">
                ${usage.toLocaleString()} 通
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">上限</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #333;">
                ${quota.toLocaleString()} 通
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">使用率</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold; color: ${percentUsed >= 100 ? "#dc2626" : percentUsed >= 90 ? "#d97706" : "#2563eb"};">
                ${percentUsed}%
              </td>
            </tr>
          </table>
        </div>
        <p style="color: #999; font-size: 12px; margin-top: 24px;">
          このメールは Lオペ for CLINIC のシステムから自動送信されています。
        </p>
      </div>
    `.trim(),
  };
}

export async function GET(req: NextRequest) {
  // Vercel Cron 認証
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 排他制御（同時実行防止）
  const lock = await acquireLock("cron:usage-alert", 300);
  if (!lock.acquired) {
    return NextResponse.json({
      ok: true,
      message: "別のインスタンスが実行中です",
      skipped: true,
    });
  }

  try {
    // 全アクティブテナントを取得（contact_emailも取得）
    const { data: tenants } = await supabaseAdmin
      .from("tenants")
      .select("id, name, contact_email")
      .eq("is_active", true)
      .is("deleted_at", null);

    if (!tenants || tenants.length === 0) {
      return NextResponse.json({
        ok: true,
        processed: 0,
        alerts: 0,
        errors: [],
      });
    }

    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const errors: string[] = [];
    let processed = 0;
    let alertsSent = 0;

    for (const tenant of tenants) {
      try {
        const quotaResult = await checkQuota(tenant.id);
        processed++;

        // 各しきい値について判定
        for (const threshold of ALERT_THRESHOLDS) {
          if (quotaResult.percentUsed < threshold.percent) continue;

          // Redis で同月・同しきい値の送信済みチェック
          const redisKey = `usage_alert:${tenant.id}:${monthKey}:${threshold.percent}`;
          try {
            const alreadySent = await redis.get(redisKey);
            if (alreadySent) continue;
          } catch {
            // Redis障害時はサービス継続優先（重複送信の可能性はあるが停止より優先）
            console.warn("[cron/usage-alert] Redis読み取りエラー、続行します");
          }

          // 送信先メールアドレスを決定
          // 1. テナントのcontact_email
          // 2. テナントオーナーのメールアドレス
          const emails: string[] = [];

          if (tenant.contact_email) {
            emails.push(tenant.contact_email);
          }

          // オーナーのメールアドレスも取得
          try {
            const { data: members } = await supabaseAdmin
              .from("tenant_members")
              .select("admin_users(email)")
              .eq("tenant_id", tenant.id)
              .eq("role", "owner");

            if (members) {
              for (const m of members) {
                const adminUser = m.admin_users as unknown as { email: string } | null;
                if (adminUser?.email && !emails.includes(adminUser.email)) {
                  emails.push(adminUser.email);
                }
              }
            }
          } catch {
            // メンバー取得エラーは無視
          }

          if (emails.length === 0) continue;

          // メール送信
          const { subject, html } = buildAlertEmail(
            tenant.name || "テナント",
            threshold,
            quotaResult.usage,
            quotaResult.quota,
            quotaResult.percentUsed,
          );

          for (const email of emails) {
            try {
              await sendEmail({ to: email, subject, html });
              alertsSent++;
            } catch (err) {
              console.error(
                `[cron/usage-alert] メール送信エラー (${email}):`,
                err,
              );
            }
          }

          // Redis に送信済みフラグをセット（TTL: 35日）
          try {
            await redis.set(redisKey, "1", { ex: 35 * 24 * 60 * 60 });
          } catch {
            console.warn("[cron/usage-alert] Redis書き込みエラー、続行します");
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push(`${tenant.id}: ${message}`);
        console.error(
          `[cron/usage-alert] テナント ${tenant.id} の処理エラー:`,
          err,
        );
      }
    }

    console.log(
      `[cron/usage-alert] 完了: ${processed}テナント処理, ${alertsSent}アラート送信, ${errors.length}エラー`,
    );

    return NextResponse.json({
      ok: errors.length === 0,
      processed,
      alerts: alertsSent,
      errors,
      checkedAt: new Date().toISOString(),
    });
  } finally {
    await lock.release();
  }
}
