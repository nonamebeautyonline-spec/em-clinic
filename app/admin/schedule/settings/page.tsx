"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import Link from "next/link";

type Settings = {
  change_deadline_hours: number;
  cancel_deadline_hours: number;
  booking_start_days_before: number;
  booking_deadline_hours_before: number;
  booking_open_day: number;
};

const DEFAULT_SETTINGS: Settings = {
  change_deadline_hours: 0,
  cancel_deadline_hours: 0,
  booking_start_days_before: 60,
  booking_deadline_hours_before: 0,
  booking_open_day: 5,
};

const SWR_KEY = "/api/admin/reservation-settings";

export default function ReservationSettingsPage() {
  const { data: rawData, isLoading: loading } = useSWR<{ ok: boolean; settings?: Settings }>(SWR_KEY);

  const loadedSettings: Settings = rawData?.ok && rawData.settings
    ? {
        change_deadline_hours: rawData.settings.change_deadline_hours ?? 0,
        cancel_deadline_hours: rawData.settings.cancel_deadline_hours ?? 0,
        booking_start_days_before: rawData.settings.booking_start_days_before ?? 60,
        booking_deadline_hours_before: rawData.settings.booking_deadline_hours_before ?? 0,
        booking_open_day: rawData.settings.booking_open_day ?? 5,
      }
    : DEFAULT_SETTINGS;

  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // SWRデータ到着時にフォーム状態を同期
  if (rawData && !initialized) {
    setSettings(loadedSettings);
    setInitialized(true);
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/reservation-settings", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const json = await res.json();
      if (json.ok) {
        setMessage({ type: "success", text: "設定を保存しました" });
        mutate(SWR_KEY);
      } else {
        setMessage({ type: "error", text: json.message || "保存に失敗しました" });
      }
    } catch {
      setMessage({ type: "error", text: "通信エラーが発生しました" });
    } finally {
      setSaving(false);
    }
  }

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
          <h1 className="text-2xl font-bold text-slate-900">予約受付設定</h1>
          <p className="text-slate-600 mt-1">予約の受付期間・変更・キャンセルの制限を設定します</p>
        </div>

        {/* メッセージ */}
        {message && (
          <div className={`mb-6 px-4 py-3 rounded-lg text-sm font-medium ${
            message.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"
          }`}>
            {message.text}
          </div>
        )}

        {/* 受付期間設定 */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
          <h2 className="text-lg font-bold text-slate-800 mb-1">受付期間</h2>
          <p className="text-sm text-slate-500 mb-6">予約を受け付ける期間を設定します</p>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                受付開始（何日前から予約可能にするか）
              </label>
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-500">予約日の</span>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={settings.booking_start_days_before}
                  onChange={(e) => setSettings({ ...settings, booking_start_days_before: Number(e.target.value) || 60 })}
                  className="w-24 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <span className="text-sm text-slate-500">日前から受付開始</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                受付締切（何時間前まで予約可能にするか）
              </label>
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-500">予約時間の</span>
                <input
                  type="number"
                  min={0}
                  max={72}
                  value={settings.booking_deadline_hours_before}
                  onChange={(e) => setSettings({ ...settings, booking_deadline_hours_before: Number(e.target.value) || 0 })}
                  className="w-24 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <span className="text-sm text-slate-500">時間前まで受付</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">0 = 制限なし（予約時間直前まで受付）</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                翌月予約開放日
              </label>
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-500">毎月</span>
                <input
                  type="number"
                  min={1}
                  max={28}
                  value={settings.booking_open_day}
                  onChange={(e) => setSettings({ ...settings, booking_open_day: Number(e.target.value) || 5 })}
                  className="w-20 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <span className="text-sm text-slate-500">日に翌月の予約を開放</span>
              </div>
            </div>
          </div>
        </div>

        {/* 変更・キャンセル期限 */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
          <h2 className="text-lg font-bold text-slate-800 mb-1">変更・キャンセル期限</h2>
          <p className="text-sm text-slate-500 mb-6">患者が予約を変更・キャンセルできる期限を設定します</p>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                予約変更の受付期限
              </label>
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-500">予約時間の</span>
                <input
                  type="number"
                  min={0}
                  max={168}
                  value={settings.change_deadline_hours}
                  onChange={(e) => setSettings({ ...settings, change_deadline_hours: Number(e.target.value) || 0 })}
                  className="w-24 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <span className="text-sm text-slate-500">時間前まで変更可能</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">0 = 制限なし（予約時間直前まで変更可能）</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                予約キャンセルの受付期限
              </label>
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-500">予約時間の</span>
                <input
                  type="number"
                  min={0}
                  max={168}
                  value={settings.cancel_deadline_hours}
                  onChange={(e) => setSettings({ ...settings, cancel_deadline_hours: Number(e.target.value) || 0 })}
                  className="w-24 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <span className="text-sm text-slate-500">時間前までキャンセル可能</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">0 = 制限なし（予約時間直前までキャンセル可能）</p>
            </div>
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
