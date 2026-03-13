// 定期レポート設定セクション
"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";

interface ReportSectionProps {
  onToast: (message: string, type: "success" | "error") => void;
}

export default function ReportSection({ onToast }: ReportSectionProps) {
  const [saving, setSaving] = useState(false);
  const [testSending, setTestSending] = useState(false);

  const [enabled, setEnabled] = useState(false);
  const [frequency, setFrequency] = useState<"weekly" | "monthly" | "both">("weekly");
  const [emails, setEmails] = useState("");

  const { data, isLoading } = useSWR<{ enabled: boolean; frequency: "weekly" | "monthly" | "both"; emails: string }>(
    "/api/admin/report-settings",
    {
      onError: (err) => {
        onToast(err instanceof Error ? err.message : "読み込みエラー", "error");
      },
    }
  );

  // SWRから取得したデータでローカルstateを同期
  useEffect(() => {
    if (data) {
      setEnabled(data.enabled);
      setFrequency(data.frequency);
      setEmails(data.emails);
    }
  }, [data]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/report-settings", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled, frequency, emails }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || d.error || "保存に失敗しました");
      onToast("レポート設定を保存しました", "success");
    } catch (err) {
      onToast(err instanceof Error ? err.message : "保存エラー", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleTestSend = async () => {
    if (!emails.trim()) {
      onToast("送信先メールアドレスを入力してください", "error");
      return;
    }
    setTestSending(true);
    try {
      const res = await fetch("/api/admin/report-settings", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled, frequency, emails, testSend: true }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || d.error || "テスト送信に失敗しました");
      onToast("テストメールを送信しました", "success");
    } catch (err) {
      onToast(err instanceof Error ? err.message : "テスト送信エラー", "error");
    } finally {
      setTestSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent" />
        <p className="mt-2 text-sm text-gray-500">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div>
        <h2 className="text-lg font-bold text-gray-900">定期レポート</h2>
        <p className="text-sm text-gray-500 mt-1">
          売上・患者数・予約数・メッセージ数のサマリレポートを定期的にメールで送信します
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-100">
        {/* ON/OFF */}
        <div className="px-6 py-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">レポート送信</p>
            <p className="text-xs text-gray-500 mt-0.5">
              有効にすると設定した頻度でレポートが送信されます
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEnabled(!enabled)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
              enabled ? "bg-blue-600" : "bg-gray-200"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${
                enabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* 頻度 */}
        <div className="px-6 py-5">
          <label className="block text-sm font-medium text-gray-900 mb-2">送信頻度</label>
          <div className="flex gap-3">
            {([
              { value: "weekly", label: "週次（毎週月曜）" },
              { value: "monthly", label: "月次（毎月1日）" },
              { value: "both", label: "両方" },
            ] as const).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setFrequency(opt.value)}
                className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                  frequency === opt.value
                    ? "border-blue-600 bg-blue-50 text-blue-700 font-medium"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* メールアドレス */}
        <div className="px-6 py-5">
          <label className="block text-sm font-medium text-gray-900 mb-2">
            送信先メールアドレス
          </label>
          <textarea
            value={emails}
            onChange={(e) => setEmails(e.target.value)}
            placeholder="admin@example.com, manager@example.com"
            rows={3}
            className="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 resize-none"
          />
          <p className="text-xs text-gray-400 mt-1.5">
            複数のアドレスはカンマ区切りで入力してください
          </p>
        </div>

        {/* アクション */}
        <div className="px-6 py-5 flex items-center justify-between">
          <button
            type="button"
            onClick={handleTestSend}
            disabled={testSending || !emails.trim()}
            className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {testSending ? "送信中..." : "テスト送信"}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>

      {/* 説明 */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
        <h3 className="text-sm font-medium text-blue-900 mb-2">レポートの内容</h3>
        <ul className="text-xs text-blue-700 space-y-1.5">
          <li>- 売上サマリ（カード決済・銀行振込の内訳）</li>
          <li>- 患者数（総数・新規）</li>
          <li>- 予約件数</li>
          <li>- メッセージ数（受信・送信）</li>
        </ul>
        <p className="text-xs text-blue-600 mt-3">
          週次レポートは前週の月〜日の集計、月次レポートは前月1日〜末日の集計を送信します。
        </p>
      </div>
    </div>
  );
}
