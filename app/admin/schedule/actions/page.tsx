"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type ActionSetting = {
  event_type: string;
  is_enabled: boolean;
  use_custom_message: boolean;
  custom_message: string | null;
};

const EVENT_LABELS: Record<string, { label: string; description: string; icon: string }> = {
  reservation_created: {
    label: "予約完了時",
    description: "患者が予約を完了した際にLINEメッセージを送信します",
    icon: "✉️",
  },
  reservation_changed: {
    label: "予約変更時",
    description: "患者が予約を変更した際にLINEメッセージを送信します",
    icon: "🔄",
  },
  reservation_canceled: {
    label: "予約キャンセル時",
    description: "患者が予約をキャンセルした際にLINEメッセージを送信します",
    icon: "❌",
  },
};

const EVENT_ORDER = ["reservation_created", "reservation_changed", "reservation_canceled"];

export default function ReservationActionsPage() {
  const [actions, setActions] = useState<ActionSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/reservation-actions", { credentials: "include" });
        const json = await res.json();
        if (json.ok && json.actions) {
          setActions(json.actions);
        }
      } catch (e) {
        console.error("Load error:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function updateAction(eventType: string, updates: Partial<ActionSetting>) {
    setActions((prev) =>
      prev.map((a) => (a.event_type === eventType ? { ...a, ...updates } : a))
    );
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/reservation-actions", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actions }),
      });
      const json = await res.json();
      if (json.ok) {
        setMessage({ type: "success", text: "設定を保存しました" });
      } else {
        setMessage({ type: "error", text: json.message || "保存に失敗しました" });
      }
    } catch {
      setMessage({ type: "error", text: "通信エラーが発生しました" });
    } finally {
      setSaving(false);
    }
  }

  // イベント順に並べ替え
  const sortedActions = [...actions].sort(
    (a, b) => EVENT_ORDER.indexOf(a.event_type) - EVENT_ORDER.indexOf(b.event_type)
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="inline-block w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <Link href="/admin/schedule" className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-block">
            ← 予約枠管理に戻る
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">予約アクション設定</h1>
          <p className="text-slate-600 mt-1">予約の各イベント発生時にLINE通知を送信するかどうかを設定します</p>
        </div>

        {/* メッセージ */}
        {message && (
          <div className={`mb-6 px-4 py-3 rounded-lg text-sm font-medium ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}>
            {message.text}
          </div>
        )}

        {/* 基本予約アクション */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
          <h2 className="text-lg font-bold text-slate-800 mb-1">基本予約アクション</h2>
          <p className="text-sm text-slate-500 mb-6">予約操作時に患者へ送信するLINEメッセージを設定します</p>

          <div className="space-y-6">
            {sortedActions.map((action) => {
              const meta = EVENT_LABELS[action.event_type];
              if (!meta) return null;

              return (
                <div key={action.event_type} className="border border-slate-200 rounded-xl p-5">
                  {/* ヘッダー行: アイコン + ラベル + トグル */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{meta.icon}</span>
                      <div>
                        <h3 className="text-sm font-bold text-slate-800">{meta.label}</h3>
                        <p className="text-xs text-slate-500">{meta.description}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => updateAction(action.event_type, { is_enabled: !action.is_enabled })}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        action.is_enabled ? "bg-blue-500" : "bg-slate-300"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                          action.is_enabled ? "translate-x-6" : ""
                        }`}
                      />
                    </button>
                  </div>

                  {/* 有効時のみ詳細設定を表示 */}
                  {action.is_enabled && (
                    <div className="mt-4 pl-9 space-y-4">
                      {/* メッセージ種別 */}
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`msg-type-${action.event_type}`}
                            checked={!action.use_custom_message}
                            onChange={() => updateAction(action.event_type, { use_custom_message: false })}
                            className="text-blue-600"
                          />
                          <span className="text-sm text-slate-700">デフォルトFlex</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`msg-type-${action.event_type}`}
                            checked={action.use_custom_message}
                            onChange={() => updateAction(action.event_type, { use_custom_message: true })}
                            className="text-blue-600"
                          />
                          <span className="text-sm text-slate-700">カスタムメッセージ</span>
                        </label>
                      </div>

                      {/* カスタムメッセージ入力 */}
                      {action.use_custom_message && (
                        <div>
                          <textarea
                            value={action.custom_message || ""}
                            onChange={(e) => updateAction(action.event_type, { custom_message: e.target.value })}
                            placeholder="カスタムメッセージを入力してください&#10;&#10;利用可能な変数:&#10;{date} - 予約日時&#10;{name} - 患者名"
                            rows={4}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                          />
                          <p className="text-xs text-slate-400 mt-1">
                            変数: {"{date}"} = 予約日時, {"{name}"} = 患者名
                          </p>
                        </div>
                      )}

                      {/* デフォルトFlex使用時の説明 */}
                      {!action.use_custom_message && (
                        <p className="text-xs text-slate-400">
                          Flex Message設定で設定した配色・文言のメッセージが送信されます
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 保存ボタン */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-lg shadow-sm hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 transition"
          >
            {saving ? "保存中..." : "設定を保存"}
          </button>
        </div>
      </div>
    </div>
  );
}
