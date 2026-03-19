// app/api/admin/notifications/test-cron-failure/route.ts
// Cron失敗通知のテスト送信API
import { NextRequest, NextResponse } from "next/server";
import { unauthorized, serverError } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { getSetting } from "@/lib/settings";
import { pushMessage } from "@/lib/line-push";
import { resolveTenantIdOrThrow } from "@/lib/tenant";

export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req) ?? undefined;

  try {
    const [slackWebhookUrl, lineNotifyUid] = await Promise.all([
      getSetting("notification", "cron_slack_webhook_url", tenantId),
      getSetting("notification", "cron_notify_line_uid", tenantId),
    ]);

    if (!slackWebhookUrl && !lineNotifyUid) {
      return NextResponse.json(
        { error: "通知先（Slack Webhook URL または LINE UID）が未設定です" },
        { status: 400 },
      );
    }

    const timestamp = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
    const testCronName = "test-cron-failure";
    const testError = "これはテスト通知です。実際のエラーではありません。";

    const results: { slack?: boolean; line?: boolean } = {};

    // Slack テスト送信
    if (slackWebhookUrl) {
      try {
        const res = await fetch(slackWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: `[テスト] Cronジョブ失敗: ${testCronName}`,
            blocks: [
              {
                type: "header",
                text: { type: "plain_text", text: `[テスト] Cronジョブ失敗: ${testCronName}` },
              },
              {
                type: "section",
                fields: [
                  { type: "mrkdwn", text: `*Cron名:*\n${testCronName}` },
                  { type: "mrkdwn", text: `*発生時刻:*\n${timestamp}` },
                ],
              },
              {
                type: "section",
                text: { type: "mrkdwn", text: `*エラー:*\n\`\`\`${testError}\`\`\`` },
              },
            ],
          }),
        });
        results.slack = res.ok;
      } catch {
        results.slack = false;
      }
    }

    // LINE テスト送信
    if (lineNotifyUid) {
      try {
        const text = [
          `[テスト] Cron失敗通知`,
          `Cron名: ${testCronName}`,
          `時刻: ${timestamp}`,
          `エラー: ${testError}`,
        ].join("\n");

        const res = await pushMessage(lineNotifyUid, [{ type: "text", text }], tenantId);
        results.line = !!res?.ok;
      } catch {
        results.line = false;
      }
    }

    return NextResponse.json({ ok: true, results });
  } catch (err) {
    console.error("[test-cron-failure]", err);
    return serverError("テスト送信に失敗しました");
  }
}
