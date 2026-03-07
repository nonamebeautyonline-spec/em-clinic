// lib/notifications/cron-failure.ts — Cron失敗時のSlack/LINE通知
// fire-and-forget: Cron処理をブロックしない
// 同一Cronエラーは10分に1回のrate limit付き

import { checkRateLimit } from "@/lib/rate-limit";
import { getSetting } from "@/lib/settings";
import { pushMessage } from "@/lib/line-push";

const RATE_LIMIT_WINDOW_SEC = 600; // 10分

/**
 * Cron失敗時にSlack Incoming WebhookとLINEで通知を送信する
 * - 同一cronName のエラーは10分に1回まで（rate limit）
 * - Slack/LINE送信はそれぞれ独立して実行（片方が失敗しても他方は送信）
 * - fire-and-forget: 呼び出し元をブロックしない
 */
export async function notifyCronFailure(
  cronName: string,
  error: unknown,
  tenantId?: string,
): Promise<void> {
  try {
    // レート制限: 同一Cronエラーは10分に1回
    const rateLimitKey = `cron-failure:${cronName}`;
    const { limited } = await checkRateLimit(rateLimitKey, 1, RATE_LIMIT_WINDOW_SEC);
    if (limited) {
      console.log(`[cron-failure] レート制限中: ${cronName}`);
      return;
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    const timestamp = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });

    // Slack Webhook URL と LINE通知先UIDを並行取得
    const [slackWebhookUrl, lineNotifyUid] = await Promise.all([
      getSetting("notification", "cron_slack_webhook_url", tenantId),
      getSetting("notification", "cron_notify_line_uid", tenantId),
    ]);

    const promises: Promise<void>[] = [];

    // Slack通知
    if (slackWebhookUrl) {
      promises.push(sendSlackNotification(slackWebhookUrl, cronName, errorMessage, errorStack, timestamp));
    }

    // LINE通知
    if (lineNotifyUid) {
      promises.push(sendLineNotification(lineNotifyUid, cronName, errorMessage, timestamp, tenantId));
    }

    if (promises.length === 0) {
      console.warn(`[cron-failure] 通知先未設定: ${cronName} のエラーを通知できません`);
      return;
    }

    await Promise.allSettled(promises);
  } catch (err) {
    // fire-and-forget: 通知処理自体のエラーはログのみ
    console.error("[cron-failure] 通知送信エラー:", err);
  }
}

/**
 * Slack Incoming Webhook でエラー通知を送信
 */
async function sendSlackNotification(
  webhookUrl: string,
  cronName: string,
  errorMessage: string,
  errorStack: string | undefined,
  timestamp: string,
): Promise<void> {
  try {
    const payload = {
      text: `Cronジョブ失敗: ${cronName}`,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: `Cronジョブ失敗: ${cronName}`,
          },
        },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*Cron名:*\n${cronName}` },
            { type: "mrkdwn", text: `*発生時刻:*\n${timestamp}` },
          ],
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*エラー:*\n\`\`\`${errorMessage}\`\`\``,
          },
        },
        ...(errorStack
          ? [
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: `*スタックトレース:*\n\`\`\`${errorStack.slice(0, 500)}\`\`\``,
                },
              },
            ]
          : []),
      ],
    };

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      console.error(`[cron-failure] Slack送信失敗: ${res.status}`);
    }
  } catch (err) {
    console.error("[cron-failure] Slack送信エラー:", err);
  }
}

/**
 * LINE pushMessage でエラー通知を送信
 */
async function sendLineNotification(
  lineUid: string,
  cronName: string,
  errorMessage: string,
  timestamp: string,
  tenantId?: string,
): Promise<void> {
  try {
    const text = [
      `[Cron失敗通知]`,
      `Cron名: ${cronName}`,
      `時刻: ${timestamp}`,
      `エラー: ${errorMessage}`,
    ].join("\n");

    await pushMessage(lineUid, [{ type: "text", text }], tenantId);
  } catch (err) {
    console.error("[cron-failure] LINE送信エラー:", err);
  }
}
