"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import useSWR, { mutate } from "swr";

// ============================================
// 型定義
// ============================================
type Tab = "settings" | "slots" | "actions";

type Settings = {
  change_deadline_hours: number;
  cancel_deadline_hours: number;
  booking_start_days_before: number;
  booking_deadline_hours_before: number;
  booking_open_day: number;
};

type Slot = {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  sort_order: number;
  is_active: boolean;
};

type Course = {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  sort_order: number;
  is_active: boolean;
};

type ActionItem = {
  id?: string;
  action_type: string;
  sort_order: number;
  config: Record<string, unknown>;
};

type ActionSetting = {
  event_type: string;
  is_enabled: boolean;
  repeat_on_subsequent: boolean;
  items: ActionItem[];
};

type TagDef = { id: number; name: string; color: string };
type MarkDef = { value: string; label: string; color: string; icon: string };
type RichMenu = { id: number; name: string; is_active: boolean };

// ============================================
// 定数
// ============================================
const DEFAULT_SETTINGS: Settings = {
  change_deadline_hours: 0,
  cancel_deadline_hours: 0,
  booking_start_days_before: 60,
  booking_deadline_hours_before: 0,
  booking_open_day: 5,
};

const SETTINGS_KEY = "/api/admin/reservation-settings";
const SLOTS_KEY = "/api/admin/reservation-slots";
const COURSES_KEY = "/api/admin/reservation-courses";
const ACTIONS_KEY = "/api/admin/reservation-actions";

const EVENT_LABELS: Record<string, { label: string; description: string }> = {
  reservation_created: { label: "予約完了時", description: "患者が予約を完了した直後に実行" },
  reservation_changed: { label: "予約変更時", description: "予約内容が変更された際に実行" },
  reservation_canceled: { label: "キャンセル時", description: "予約がキャンセルされた際に実行" },
};

const EVENT_ORDER = ["reservation_created", "reservation_changed", "reservation_canceled"];

const ACTION_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  text_send: { label: "テキスト送信", color: "bg-blue-100 text-blue-700 border-blue-200" },
  template_send: { label: "テンプレート送信", color: "bg-purple-100 text-purple-700 border-purple-200" },
  tag_add: { label: "タグ追加", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  tag_remove: { label: "タグ削除", color: "bg-red-100 text-red-700 border-red-200" },
  mark_change: { label: "対応マーク変更", color: "bg-amber-100 text-amber-700 border-amber-200" },
  menu_change: { label: "メニュー操作", color: "bg-cyan-100 text-cyan-700 border-cyan-200" },
};

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  {
    key: "settings",
    label: "予約受付設定",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    key: "slots",
    label: "予約枠・コース",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
  {
    key: "actions",
    label: "予約アクション",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
  },
];

// ============================================
// メインコンポーネント
// ============================================
export default function ReservationSettingsPage() {
  const [tab, setTab] = useState<Tab>("settings");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <Link href="/admin/schedule" className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-block">
            ← 予約枠管理に戻る
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">予約設定</h1>
          <p className="text-slate-600 mt-1">予約の受付条件・メニュー・通知アクションを設定します</p>
        </div>

        {/* メッセージ */}
        {message && (
          <div className={`mb-6 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}>
            {message.type === "success" ? (
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            {message.text}
          </div>
        )}

        {/* タブ */}
        <div className="flex gap-1 bg-white rounded-xl border border-slate-200 p-1 mb-8 shadow-sm">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setMessage(null); }}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition ${
                tab === t.key
                  ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* タブ内容 */}
        {tab === "settings" && <SettingsTab onMessage={setMessage} />}
        {tab === "slots" && <SlotsTab onMessage={setMessage} />}
        {tab === "actions" && <ActionsTab onMessage={setMessage} />}
      </div>
    </div>
  );
}

// ============================================
// 予約受付設定タブ
// ============================================
function SettingsTab({ onMessage }: { onMessage: (m: { type: "success" | "error"; text: string } | null) => void }) {
  const { data: rawData, isLoading } = useSWR<{ ok: boolean; settings?: Settings }>(SETTINGS_KEY);
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

  if (rawData && !initialized) {
    setSettings(loadedSettings);
    setInitialized(true);
  }

  async function handleSave() {
    setSaving(true);
    onMessage(null);
    try {
      const res = await fetch("/api/admin/reservation-settings", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const json = await res.json();
      if (json.ok) {
        onMessage({ type: "success", text: "受付設定を保存しました" });
        mutate(SETTINGS_KEY);
      } else {
        onMessage({ type: "error", text: json.message || "保存に失敗しました" });
      }
    } catch {
      onMessage({ type: "error", text: "通信エラーが発生しました" });
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* 受付期間設定 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            受付期間
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">予約を受け付ける期間を設定します</p>
        </div>
        <div className="p-6 space-y-6">
          <SettingRow
            label="受付開始"
            description="予約日の何日前から受付を開始するか"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">予約日の</span>
              <input
                type="number" min={1} max={365}
                value={settings.booking_start_days_before}
                onChange={(e) => setSettings({ ...settings, booking_start_days_before: Number(e.target.value) || 60 })}
                className="w-20 px-3 py-2 border border-slate-300 rounded-lg text-sm text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <span className="text-sm text-slate-500">日前から</span>
            </div>
          </SettingRow>

          <SettingRow
            label="受付締切"
            description="予約時間の何時間前まで受付するか（0=制限なし）"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">予約の</span>
              <input
                type="number" min={0} max={72}
                value={settings.booking_deadline_hours_before}
                onChange={(e) => setSettings({ ...settings, booking_deadline_hours_before: Number(e.target.value) || 0 })}
                className="w-20 px-3 py-2 border border-slate-300 rounded-lg text-sm text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <span className="text-sm text-slate-500">時間前まで</span>
            </div>
          </SettingRow>

          <SettingRow
            label="翌月予約の開放期限"
            description="この日を過ぎても未開放だと警告が表示されます"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">毎月</span>
              <input
                type="number" min={1} max={28}
                value={settings.booking_open_day}
                onChange={(e) => setSettings({ ...settings, booking_open_day: Number(e.target.value) || 5 })}
                className="w-16 px-3 py-2 border border-slate-300 rounded-lg text-sm text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <span className="text-sm text-slate-500">日まで</span>
            </div>
          </SettingRow>
        </div>
      </div>

      {/* 変更・キャンセル期限 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            変更・キャンセル期限
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">患者が予約を変更・キャンセルできる期限（0=制限なし）</p>
        </div>
        <div className="p-6 space-y-6">
          <SettingRow label="予約変更の期限" description="予約時間の何時間前まで変更を受け付けるか">
            <div className="flex items-center gap-2">
              <input
                type="number" min={0} max={168}
                value={settings.change_deadline_hours}
                onChange={(e) => setSettings({ ...settings, change_deadline_hours: Number(e.target.value) || 0 })}
                className="w-20 px-3 py-2 border border-slate-300 rounded-lg text-sm text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <span className="text-sm text-slate-500">時間前まで変更可</span>
            </div>
          </SettingRow>

          <SettingRow label="キャンセルの期限" description="予約時間の何時間前までキャンセルを受け付けるか">
            <div className="flex items-center gap-2">
              <input
                type="number" min={0} max={168}
                value={settings.cancel_deadline_hours}
                onChange={(e) => setSettings({ ...settings, cancel_deadline_hours: Number(e.target.value) || 0 })}
                className="w-20 px-3 py-2 border border-slate-300 rounded-lg text-sm text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <span className="text-sm text-slate-500">時間前までキャンセル可</span>
            </div>
          </SettingRow>
        </div>
      </div>

      {/* 保存ボタン */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-xl shadow-sm hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 transition"
        >
          {saving ? "保存中..." : "設定を保存"}
        </button>
      </div>
    </div>
  );
}

// ============================================
// 予約枠・コースタブ
// ============================================
function SlotsTab({ onMessage }: { onMessage: (m: { type: "success" | "error"; text: string } | null) => void }) {
  const [subTab, setSubTab] = useState<"slots" | "courses" | "links">("slots");
  const { data: slotsData, isLoading: slotsLoading } = useSWR<{ ok: boolean; slots: Slot[] }>(SLOTS_KEY);
  const { data: coursesData, isLoading: coursesLoading } = useSWR<{ ok: boolean; courses: Course[] }>(COURSES_KEY);
  const slots = slotsData?.slots ?? [];
  const courses = coursesData?.courses ?? [];
  const loading = slotsLoading || coursesLoading;

  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Slot | Course | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formDuration, setFormDuration] = useState(15);
  const [formSortOrder, setFormSortOrder] = useState(0);
  const [saving, setSaving] = useState(false);

  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [linkedCourseIds, setLinkedCourseIds] = useState<string[]>([]);
  const [linkSaving, setLinkSaving] = useState(false);

  function openCreateModal() {
    setEditingItem(null);
    setFormTitle("");
    setFormDescription("");
    setFormDuration(15);
    setFormSortOrder(0);
    setShowModal(true);
  }

  function openEditModal(item: Slot | Course) {
    setEditingItem(item);
    setFormTitle(item.title);
    setFormDescription(item.description || "");
    setFormDuration(item.duration_minutes);
    setFormSortOrder(item.sort_order);
    setShowModal(true);
  }

  async function handleSave() {
    setSaving(true);
    onMessage(null);
    const endpoint = subTab === "slots" ? "/api/admin/reservation-slots" : "/api/admin/reservation-courses";
    const body = { title: formTitle, description: formDescription || null, duration_minutes: formDuration, sort_order: formSortOrder };
    try {
      const url = editingItem ? `${endpoint}/${editingItem.id}` : endpoint;
      const method = editingItem ? "PUT" : "POST";
      const res = await fetch(url, { method, credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json();
      if (json.ok) {
        onMessage({ type: "success", text: editingItem ? "更新しました" : "作成しました" });
        setShowModal(false);
        mutate(SLOTS_KEY);
        mutate(COURSES_KEY);
      } else {
        onMessage({ type: "error", text: json.message || "保存に失敗しました" });
      }
    } catch {
      onMessage({ type: "error", text: "通信エラーが発生しました" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("無効化しますか？")) return;
    const endpoint = subTab === "slots" ? "/api/admin/reservation-slots" : "/api/admin/reservation-courses";
    try {
      const res = await fetch(`${endpoint}/${id}`, { method: "DELETE", credentials: "include" });
      const json = await res.json();
      if (json.ok) {
        onMessage({ type: "success", text: "無効化しました" });
        mutate(SLOTS_KEY);
        mutate(COURSES_KEY);
      }
    } catch {
      onMessage({ type: "error", text: "削除に失敗しました" });
    }
  }

  async function loadSlotCourses(slotId: string) {
    setSelectedSlotId(slotId);
    try {
      const res = await fetch(`/api/admin/reservation-slots/${slotId}/courses`, { credentials: "include" });
      const json = await res.json();
      if (json.ok) setLinkedCourseIds(json.course_ids || []);
    } catch {
      setLinkedCourseIds([]);
    }
  }

  async function saveSlotCourses() {
    if (!selectedSlotId) return;
    setLinkSaving(true);
    try {
      const res = await fetch(`/api/admin/reservation-slots/${selectedSlotId}/courses`, {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ course_ids: linkedCourseIds }),
      });
      const json = await res.json();
      if (json.ok) onMessage({ type: "success", text: "紐づけを保存しました" });
    } catch {
      onMessage({ type: "error", text: "保存に失敗しました" });
    } finally {
      setLinkSaving(false);
    }
  }

  const activeSlots = slots.filter((s) => s.is_active);
  const activeCourses = courses.filter((c) => c.is_active);

  if (loading) return <LoadingSpinner />;

  return (
    <>
      {/* サブタブ */}
      <div className="flex gap-2 mb-6">
        {([
          { key: "slots" as const, label: "予約枠", count: activeSlots.length },
          { key: "courses" as const, label: "コース", count: activeCourses.length },
          { key: "links" as const, label: "紐づけ" },
        ]).map((t) => (
          <button
            key={t.key}
            onClick={() => setSubTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              subTab === t.key
                ? "bg-slate-800 text-white shadow-sm"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {t.label}
            {"count" in t && t.count !== undefined && (
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${
                subTab === t.key ? "bg-slate-600 text-slate-200" : "bg-slate-100 text-slate-500"
              }`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 予約枠 */}
      {subTab === "slots" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={openCreateModal} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              予約枠を追加
            </button>
          </div>
          {activeSlots.length === 0 ? (
            <EmptyState text="予約枠がありません" />
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100">
              {activeSlots.map((slot) => (
                <ItemRow key={slot.id} item={slot} color="blue" onEdit={() => openEditModal(slot)} onDelete={() => handleDelete(slot.id)} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* コース */}
      {subTab === "courses" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={openCreateModal} className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              コースを追加
            </button>
          </div>
          {activeCourses.length === 0 ? (
            <EmptyState text="コースがありません" />
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100">
              {activeCourses.map((course) => (
                <ItemRow key={course.id} item={course} color="emerald" onEdit={() => openEditModal(course)} onDelete={() => handleDelete(course.id)} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* 紐づけ */}
      {subTab === "links" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          {activeSlots.length === 0 || activeCourses.length === 0 ? (
            <EmptyState text="予約枠とコースの両方が必要です" />
          ) : (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">予約枠を選択</label>
                <div className="flex flex-wrap gap-2">
                  {activeSlots.map((slot) => (
                    <button
                      key={slot.id}
                      onClick={() => loadSlotCourses(slot.id)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
                        selectedSlotId === slot.id
                          ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {slot.title}
                    </button>
                  ))}
                </div>
              </div>
              {selectedSlotId && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-3">紐づけるコース</label>
                  <div className="space-y-2">
                    {activeCourses.map((course) => (
                      <label key={course.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
                        <input
                          type="checkbox"
                          checked={linkedCourseIds.includes(course.id)}
                          onChange={(e) => {
                            if (e.target.checked) setLinkedCourseIds([...linkedCourseIds, course.id]);
                            else setLinkedCourseIds(linkedCourseIds.filter((id) => id !== course.id));
                          }}
                          className="w-4 h-4 text-blue-600 rounded border-slate-300"
                        />
                        <div>
                          <div className="text-sm font-medium text-slate-800">{course.title}</div>
                          <div className="text-xs text-slate-500">{course.duration_minutes}分</div>
                        </div>
                      </label>
                    ))}
                  </div>
                  <div className="mt-4 flex justify-end">
                    <button onClick={saveSlotCourses} disabled={linkSaving} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
                      {linkSaving ? "保存中..." : "紐づけを保存"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* モーダル */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">
              {editingItem ? `${subTab === "slots" ? "予約枠" : "コース"}を編集` : `${subTab === "slots" ? "予約枠" : "コース"}を追加`}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">タイトル</label>
                <input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)}
                  placeholder={subTab === "slots" ? "例: オンライン診察" : "例: 初診"}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">説明（任意）</label>
                <input type="text" value={formDescription} onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">所要時間（分）</label>
                  <input type="number" min={5} max={480} value={formDuration} onChange={(e) => setFormDuration(Number(e.target.value) || 15)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">表示順序</label>
                  <input type="number" value={formSortOrder} onChange={(e) => setFormSortOrder(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition">キャンセル</button>
              <button onClick={handleSave} disabled={saving || !formTitle} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
                {saving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ============================================
// 予約アクションタブ
// ============================================
function ActionsTab({ onMessage }: { onMessage: (m: { type: "success" | "error"; text: string } | null) => void }) {
  const { data: actionsData, isLoading } = useSWR<{ ok: boolean; actions: ActionSetting[] }>(ACTIONS_KEY);
  const { data: tagsData } = useSWR<{ tags: TagDef[] }>("/api/admin/tags?simple=true");
  const { data: marksData } = useSWR<{ marks: MarkDef[] }>("/api/admin/line/marks?simple=true");
  const { data: menusData } = useSWR<{ menus: RichMenu[] }>("/api/admin/line/rich-menus?simple=true");

  const [actions, setActions] = useState<ActionSetting[]>([]);
  const tags = tagsData?.tags ?? [];
  const marks = marksData?.marks ?? [];
  const menus = menusData?.menus ?? [];
  const [saving, setSaving] = useState(false);
  const [actionsInitialized, setActionsInitialized] = useState(false);

  if (actionsData?.ok && actionsData.actions && !actionsInitialized) {
    setActions(actionsData.actions);
    setActionsInitialized(true);
  }

  const updateAction = useCallback((eventType: string, updates: Partial<ActionSetting>) => {
    setActions((prev) => prev.map((a) => (a.event_type === eventType ? { ...a, ...updates } : a)));
  }, []);

  const addItem = useCallback((eventType: string, actionType: string) => {
    setActions((prev) => prev.map((a) => {
      if (a.event_type !== eventType) return a;
      const newItem: ActionItem = { action_type: actionType, sort_order: a.items.length, config: getDefaultConfig(actionType) };
      return { ...a, items: [...a.items, newItem] };
    }));
  }, []);

  const removeItem = useCallback((eventType: string, index: number) => {
    setActions((prev) => prev.map((a) => {
      if (a.event_type !== eventType) return a;
      return { ...a, items: a.items.filter((_, i) => i !== index).map((item, i) => ({ ...item, sort_order: i })) };
    }));
  }, []);

  const updateItemConfig = useCallback((eventType: string, index: number, config: Record<string, unknown>) => {
    setActions((prev) => prev.map((a) => {
      if (a.event_type !== eventType) return a;
      return { ...a, items: a.items.map((item, i) => (i === index ? { ...item, config } : item)) };
    }));
  }, []);

  const moveItem = useCallback((eventType: string, index: number, direction: "up" | "down") => {
    setActions((prev) => prev.map((a) => {
      if (a.event_type !== eventType) return a;
      const items = [...a.items];
      const swapIdx = direction === "up" ? index - 1 : index + 1;
      if (swapIdx < 0 || swapIdx >= items.length) return a;
      [items[index], items[swapIdx]] = [items[swapIdx], items[index]];
      return { ...a, items: items.map((item, i) => ({ ...item, sort_order: i })) };
    }));
  }, []);

  async function handleSave() {
    setSaving(true);
    onMessage(null);
    try {
      const res = await fetch("/api/admin/reservation-actions", {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actions }),
      });
      const json = await res.json();
      if (json.ok) {
        onMessage({ type: "success", text: "アクション設定を保存しました" });
        mutate(ACTIONS_KEY);
      } else {
        onMessage({ type: "error", text: json.message || "保存に失敗しました" });
      }
    } catch {
      onMessage({ type: "error", text: "通信エラーが発生しました" });
    } finally {
      setSaving(false);
    }
  }

  const sortedActions = [...actions].sort(
    (a, b) => EVENT_ORDER.indexOf(a.event_type) - EVENT_ORDER.indexOf(b.event_type)
  );

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {sortedActions.map((action) => {
        const meta = EVENT_LABELS[action.event_type];
        if (!meta) return null;
        return (
          <div key={action.event_type} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-800">{meta.label}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{meta.description}</p>
              </div>
              <button
                onClick={() => updateAction(action.event_type, { is_enabled: !action.is_enabled })}
                className={`relative w-12 h-6 rounded-full transition-colors ${action.is_enabled ? "bg-blue-500" : "bg-slate-300"}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${action.is_enabled ? "translate-x-6" : ""}`} />
              </button>
            </div>

            {action.is_enabled && (
              <div className="p-6">
                <div className="flex flex-wrap gap-2 mb-4">
                  {Object.entries(ACTION_TYPE_LABELS).map(([type, meta]) => (
                    <button key={type} onClick={() => addItem(action.event_type, type)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium hover:opacity-80 transition ${meta.color}`}>
                      + {meta.label}
                    </button>
                  ))}
                </div>

                {action.items.length > 0 ? (
                  <div className="space-y-3">
                    {action.items.map((item, idx) => (
                      <ActionItemCard
                        key={`${item.action_type}-${idx}`}
                        item={item} index={idx} total={action.items.length}
                        tags={tags} marks={marks} menus={menus}
                        onRemove={() => removeItem(action.event_type, idx)}
                        onUpdateConfig={(config) => updateItemConfig(action.event_type, idx, config)}
                        onMove={(dir) => moveItem(action.event_type, idx, dir)}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 text-center py-4">アクションが設定されていません</p>
                )}

                <div className="mt-4 pt-4 border-t border-slate-100">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={action.repeat_on_subsequent}
                      onChange={(e) => updateAction(action.event_type, { repeat_on_subsequent: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                    <span className="text-sm text-slate-700">発動2回目以降も各動作を実行する</span>
                  </label>
                </div>
              </div>
            )}
          </div>
        );
      })}

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-xl shadow-sm hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 transition">
          {saving ? "保存中..." : "アクション設定を保存"}
        </button>
      </div>
    </div>
  );
}

// ============================================
// 共通コンポーネント
// ============================================
function SettingRow({ label, description, children }: { label: string; description: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div className="min-w-0">
        <div className="text-sm font-medium text-slate-700">{label}</div>
        <div className="text-xs text-slate-400 mt-0.5">{description}</div>
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

function ItemRow({ item, color, onEdit, onDelete }: { item: Slot | Course; color: string; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50/50 transition">
      <div className="flex-1 min-w-0">
        <div className="font-medium text-slate-800">{item.title}</div>
        {item.description && <div className="text-sm text-slate-500 mt-0.5">{item.description}</div>}
        <div className="flex gap-2 mt-1.5">
          <span className={`px-2 py-0.5 bg-${color}-50 text-${color}-700 text-xs rounded-full font-medium`}>{item.duration_minutes}分</span>
          <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs rounded-full">順序: {item.sort_order}</span>
        </div>
      </div>
      <div className="flex gap-1.5 flex-shrink-0">
        <button onClick={onEdit} className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition font-medium">編集</button>
        <button onClick={onDelete} className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition font-medium">無効化</button>
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
      <div className="w-12 h-12 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-3">
        <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      </div>
      <p className="text-slate-500 text-sm">{text}</p>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="p-12 text-center">
      <div className="inline-block w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
    </div>
  );
}

function ActionItemCard({
  item, index, total, tags, marks, menus,
  onRemove, onUpdateConfig, onMove,
}: {
  item: ActionItem; index: number; total: number;
  tags: TagDef[]; marks: MarkDef[]; menus: RichMenu[];
  onRemove: () => void; onUpdateConfig: (config: Record<string, unknown>) => void; onMove: (dir: "up" | "down") => void;
}) {
  const meta = ACTION_TYPE_LABELS[item.action_type];
  if (!meta) return null;

  return (
    <div className="border border-slate-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="flex flex-col gap-0.5">
            <button onClick={() => onMove("up")} disabled={index === 0} className="text-slate-400 hover:text-slate-600 disabled:opacity-30 p-0.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
            </button>
            <button onClick={() => onMove("down")} disabled={index === total - 1} className="text-slate-400 hover:text-slate-600 disabled:opacity-30 p-0.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
          </div>
          <span className={`px-3 py-1 rounded-lg border text-xs font-bold ${meta.color}`}>{index + 1}. {meta.label}</span>
        </div>
        <button onClick={onRemove} className="text-slate-400 hover:text-red-500 transition p-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>
      </div>
      <div className="pl-10">
        {item.action_type === "text_send" && (
          <textarea value={(item.config.message as string) || ""} onChange={(e) => onUpdateConfig({ ...item.config, message: e.target.value })}
            placeholder={"送信するテキストメッセージを入力\n\n変数: {date}=予約日時, {name}=患者名"}
            rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none" />
        )}
        {item.action_type === "template_send" && (
          <div className="text-sm text-slate-500">
            <p className="mb-1">デフォルトのFlex Messageテンプレートが送信されます</p>
            <p className="text-xs text-slate-400">配色・文言はFlex Message設定から変更できます</p>
          </div>
        )}
        {(item.action_type === "tag_add" || item.action_type === "tag_remove") && (
          <select value={(item.config.tag_id as number) || ""} onChange={(e) => onUpdateConfig({ ...item.config, tag_id: Number(e.target.value) })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
            <option value="">{item.action_type === "tag_add" ? "追加する" : "削除する"}タグを選択</option>
            {tags.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        )}
        {item.action_type === "mark_change" && (
          <select value={(item.config.mark as string) || ""} onChange={(e) => onUpdateConfig({ ...item.config, mark: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
            <option value="">対応マークを選択</option>
            <option value="none">なし</option>
            {marks.filter((m) => m.value !== "none").map((m) => <option key={m.value} value={m.value}>{m.icon} {m.label}</option>)}
          </select>
        )}
        {item.action_type === "menu_change" && (
          <select value={(item.config.rich_menu_id as number) || ""} onChange={(e) => onUpdateConfig({ ...item.config, rich_menu_id: Number(e.target.value) })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
            <option value="">リッチメニューを選択</option>
            {menus.map((m) => <option key={m.id} value={m.id}>{m.name} {m.is_active ? "" : "(無効)"}</option>)}
          </select>
        )}
      </div>
    </div>
  );
}

function getDefaultConfig(actionType: string): Record<string, unknown> {
  switch (actionType) {
    case "text_send": return { message: "" };
    case "template_send": return {};
    case "tag_add": return { tag_id: null };
    case "tag_remove": return { tag_id: null };
    case "mark_change": return { mark: "" };
    case "menu_change": return { rich_menu_id: null };
    default: return {};
  }
}
