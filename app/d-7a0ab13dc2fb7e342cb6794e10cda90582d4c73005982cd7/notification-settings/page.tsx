"use client";

import { useState, useCallback } from "react";
import { DEMO_NOTIFICATION_RULES, type DemoNotificationRule } from "../_data/mock";

// チャネルバッジの色定義
const CHANNEL_COLORS: Record<DemoNotificationRule["channel"], { bg: string; text: string }> = {
  LINE: { bg: "bg-green-100", text: "text-green-700" },
  Slack: { bg: "bg-purple-100", text: "text-purple-700" },
  "メール": { bg: "bg-blue-100", text: "text-blue-700" },
};

// チャネルアイコン
function ChannelIcon({ channel }: { channel: DemoNotificationRule["channel"] }) {
  if (channel === "LINE") {
    return (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 5.93 2 10.73c0 4.29 3.8 7.87 8.94 8.56.35.07.82.23.94.52.11.26.07.67.04.93l-.15.93c-.05.28-.22 1.1.96.6s6.37-3.75 8.69-6.42C23.08 14.05 22 12.48 22 10.73 22 5.93 17.52 2 12 2z" />
      </svg>
    );
  }
  if (channel === "Slack") {
    return (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
      </svg>
    );
  }
  // メール
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

export default function DemoNotificationSettingsPage() {
  // ルール一覧の状態管理
  const [rules, setRules] = useState<DemoNotificationRule[]>([...DEMO_NOTIFICATION_RULES]);

  // トースト
  const [toast, setToast] = useState<string | null>(null);
  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  }, []);

  // サマリー
  const enabledCount = rules.filter((r) => r.isEnabled).length;
  const totalCount = rules.length;

  // トグル切り替え
  const handleToggle = (id: string) => {
    setRules((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const next = { ...r, isEnabled: !r.isEnabled };
        showToast(`「${r.trigger}」の通知を${next.isEnabled ? "ON" : "OFF"}にしました`);
        return next;
      })
    );
  };

  return (
    <div className="p-6 pb-12 max-w-6xl mx-auto">
      {/* ヘッダー */}
      <h1 className="text-2xl font-bold text-slate-800">イベント通知設定</h1>
      <p className="text-sm text-slate-500 mt-1">
        各イベントの通知先チャネルとON/OFFを管理します
      </p>

      {/* サマリー */}
      <div className="mt-6 mb-6 flex items-center gap-3">
        <div className="bg-white rounded-xl border border-slate-200 px-5 py-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">有効な通知</p>
            <p className="text-xl font-bold text-slate-800">
              <span className="text-blue-600">{enabledCount}</span>
              <span className="text-sm font-normal text-slate-400 ml-1">/ {totalCount} ルール</span>
            </p>
          </div>
        </div>

        {/* チャネル別カウント */}
        {(["LINE", "Slack", "メール"] as const).map((ch) => {
          const count = rules.filter((r) => r.channel === ch && r.isEnabled).length;
          const colors = CHANNEL_COLORS[ch];
          return (
            <div
              key={ch}
              className={`${colors.bg} rounded-lg px-4 py-2 flex items-center gap-2`}
            >
              <span className={colors.text}><ChannelIcon channel={ch} /></span>
              <span className={`text-sm font-semibold ${colors.text}`}>{ch}</span>
              <span className={`text-lg font-bold ${colors.text}`}>{count}</span>
            </div>
          );
        })}
      </div>

      {/* テーブル */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">
                トリガー
              </th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">
                説明
              </th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">
                チャネル
              </th>
              <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">
                ステータス
              </th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule, idx) => {
              const colors = CHANNEL_COLORS[rule.channel];
              return (
                <tr
                  key={rule.id}
                  className={`border-b border-slate-100 last:border-b-0 hover:bg-slate-50 transition-colors ${
                    idx % 2 === 0 ? "" : "bg-slate-50/30"
                  }`}
                >
                  {/* トリガー名 */}
                  <td className="px-6 py-4">
                    <span className="text-sm font-semibold text-slate-800">{rule.trigger}</span>
                  </td>

                  {/* 説明 */}
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-500">{rule.description}</span>
                  </td>

                  {/* チャネルバッジ */}
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${colors.bg} ${colors.text}`}
                    >
                      <ChannelIcon channel={rule.channel} />
                      {rule.channel}
                    </span>
                  </td>

                  {/* ON/OFFトグル */}
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => handleToggle(rule.id)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
                        rule.isEnabled ? "bg-blue-600" : "bg-slate-300"
                      }`}
                      role="switch"
                      aria-checked={rule.isEnabled}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                          rule.isEnabled ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                    <span
                      className={`ml-2 text-xs font-medium ${
                        rule.isEnabled ? "text-blue-600" : "text-slate-400"
                      }`}
                    >
                      {rule.isEnabled ? "ON" : "OFF"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 補足 */}
      <p className="mt-4 text-xs text-slate-400">
        通知ルールの追加・チャネル変更は設定画面から行えます（デモでは切り替えのみ対応）。
      </p>

      {/* トースト */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-slate-800 text-white px-4 py-3 rounded-lg shadow-lg text-sm animate-[fadeIn_0.2s_ease-out]">
          {toast}
        </div>
      )}
    </div>
  );
}
