// lib/notifications/webhook-failure.ts — Webhook失敗時のSlack/LINE通知
// fire-and-forget: Webhook処理をブロックしない
// 同一source+eventIdは10分に1回のrate limit付き

import { checkRateLimit } from "@/lib/rate-limit";
import { getSetting } from "@/lib/settings";
import { pushMessage } from "@/lib/line-push";

const RATE_LIMIT_WINDOW_SEC = 600; // 10分

/**
 * Webhook失敗時にSlack Incoming WebhookとLINEで通知を送信する
 * - 同一source+eventId のエラーは10分に1回まで（rate limit）
 * - Slack/LINE送信はそれぞれ独立して実行（片方が失敗しても他方は送信）
 * - fire-and-forget: 呼び出し元をブロックしない
 */
export async function notifyWebhookFailure(
  source: string,
  eventId: string,
  error: unknown,
  tenantId?: string,
): Promise<void> {
  try {
    // レート制限: 同一Webhookエラーは10分に1回
    const rateLimitKey = `webhook-failure:${source}:${eventId}`;
    const { limited } = await checkRateLimit(rateLimitKey, 1, RATE_LIMIT_WINDOW_SEC);
    if (limited) {
      console.log(`[webhook-failure] レート制限中: ${source}/${eventId}`);
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
      promises.push(sendSlackNotification(slackWebhookUrl, source, eventId, errorMessage, errorStack, timestamp));
    }

    // LINE通知
    if (lineNotifyUid) {
      promises.push(sendLineNotification(lineNotifyUid, source, eventId, errorMessage, timestamp, tenantId));
    }

    if (promises.length === 0) {
      console.warn(`[webhook-failure] 通知先未設定: ${source}/${eventId} のエラーを通知できません`);
      return;
    }

    await Promise.allSettled(promises);
  } catch (err) {
    // fire-and-forget: 通知処理自体のエラーはログのみ
    console.error("[webhook-failure] 通知送信エラー:", err);
  }
}

/**
 * Slack Incoming Webhook でWebhook失敗通知を送信
 */
async function sendSlackNotification(
  webhookUrl: string,
  source: string,
  eventId: string,
  errorMessage: string,
  errorStack: string | undefined,
  timestamp: string,
): Promise<void> {
  try {
    const payload = {
      text: `Webhook処理失敗: ${source}`,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: `Webhook処理失敗: ${source}`,
          },
        },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*ソース:*\n${source}` },
            { type: "mrkdwn", text: `*イベントID:*\n${eventId}` },
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
      console.error(`[webhook-failure] Slack送信失敗: ${res.status}`);
    }
  } catch (err) {
    console.error("[webhook-failure] Slack送信エラー:", err);
  }
}

/**
 * LINE pushMessage でWebhook失敗通知を送信
 */
async function sendLineNotification(
  lineUid: string,
  source: string,
  eventId: string,
  errorMessage: string,
  timestamp: string,
  tenantId?: string,
): Promise<void> {
  try {
    const text = [
      `[Webhook失敗通知]`,
      `ソース: ${source}`,
      `イベントID: ${eventId}`,
      `時刻: ${timestamp}`,
      `エラー: ${errorMessage}`,
    ].join("\n");

    await pushMessage(lineUid, [{ type: "text", text }], tenantId);
  } catch (err) {
    console.error("[webhook-failure] LINE送信エラー:", err);
  }
}
