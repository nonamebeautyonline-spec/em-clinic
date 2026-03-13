// Cron通知設定セクション — Slack Webhook URL + LINE通知先UID + テスト送信
"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";

interface NotificationConfig {
  slackWebhookUrl: string;
  lineNotifyUid: string;
}

const DEFAULT_CONFIG: NotificationConfig = {
  slackWebhookUrl: "",
  lineNotifyUid: "",
};

interface NotificationSectionProps {
  onToast: (message: string, type: "success" | "error") => void;
}

export default function NotificationSection({ onToast }: NotificationSectionProps) {
  const [config, setConfig] = useState<NotificationConfig>(DEFAULT_CONFIG);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const { data, isLoading } = useSWR<{ settings: Record<string, string> }>(
    "/api/admin/settings?category=notification",
  );

  // SWRから取得したデータでローカルstateを同期
  useEffect(() => {
    if (data?.settings && typeof data.settings === "object") {
      setConfig({
        slackWebhookUrl: data.settings.cron_slack_webhook_url || "",
        lineNotifyUid: data.settings.cron_notify_line_uid || "",
      });
    }
  }, [data]);

  // 保存
  const handleSave = async () => {
    setSaving(true);
    try {
      const saves = [
        { category: "notification", key: "cron_slack_webhook_url", value: config.slackWebhookUrl },
        { category: "notification", key: "cron_notify_line_uid", value: config.lineNotifyUid },
      ].filter((s) => s.value); // 空文字はスキップ

      for (const s of saves) {
        const res = await fetch("/api/admin/settings", {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(s),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.message || d.error || `保存失敗 (${res.status})`);
        }
      }
      onToast("通知設定を保存しました", "success");
    } catch (err) {
      onToast(err instanceof Error ? err.message : "保存に失敗しました", "error");
    } finally {
      setSaving(false);
    }
  };

  // テスト送信
  const handleTestSend = async () => {
    setTesting(true);
    try {
      const res = await fetch("/api/admin/notifications/test-cron-failure", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.message || d.error || `テスト送信失敗 (${res.status})`);
      }
      onToast("テスト通知を送信しました", "success");
    } catch (err) {
      onToast(err instanceof Error ? err.message : "テスト送信に失敗しました", "error");
    } finally {
      setTesting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-6 w-6 border-4 border-blue-600 border-t-transparent" />
        <p className="mt-3 text-sm text-gray-500">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cron通知設定 */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-800">Cron通知設定</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Cronジョブ失敗時にSlackやLINEへ自動通知します。同一エラーは10分に1回まで。
          </p>
        </div>
        <div className="p-5 space-y-5">
          {/* Slack Webhook URL */}
          <div>
            <label htmlFor="slack-webhook" className="block text-sm font-medium text-gray-700 mb-1.5">
              Slack Incoming Webhook URL
            </label>
            <input
              id="slack-webhook"
              type="url"
              value={config.slackWebhookUrl}
              onChange={(e) => setConfig((prev) => ({ ...prev, slackWebhookUrl: e.target.value }))}
              placeholder="https://hooks.slack.com/services/..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-400 mt-1">
              Slackの「Incoming Webhooks」アプリで発行したURLを入力してください
            </p>
          </div>

          {/* LINE通知先UID */}
          <div>
            <label htmlFor="line-notify-uid" className="block text-sm font-medium text-gray-700 mb-1.5">
              LINE通知先UID
            </label>
            <input
              id="line-notify-uid"
              type="text"
              value={config.lineNotifyUid}
              onChange={(e) => setConfig((prev) => ({ ...prev, lineNotifyUid: e.target.value }))}
              placeholder="U1234567890abcdef..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
            />
            <p className="text-xs text-gray-400 mt-1">
              通知を受け取るLINEユーザーのUID（管理者のLINE UID）
            </p>
          </div>

          {/* ボタン群 */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? "保存中..." : "保存"}
            </button>
            <button
              onClick={handleTestSend}
              disabled={testing || (!config.slackWebhookUrl && !config.lineNotifyUid)}
              className="px-5 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {testing ? "送信中..." : "テスト送信"}
            </button>
          </div>
        </div>
      </div>

      {/* 説明カード */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
        <h3 className="text-sm font-bold text-blue-800 mb-2">通知について</h3>
        <ul className="text-xs text-blue-700 space-y-1.5">
          <li>Cronジョブ（予約送信、LINE統計収集、請求書生成など）が失敗した際に即座に通知されます</li>
          <li>同一Cronのエラーは10分間に1回まで通知されます（通知の大量発生を防止）</li>
          <li>SlackとLINEの両方を設定すると、両方に通知されます</li>
          <li>通知先が未設定の場合、エラーはサーバーログにのみ記録されます</li>
        </ul>
      </div>
    </div>
  );
}
