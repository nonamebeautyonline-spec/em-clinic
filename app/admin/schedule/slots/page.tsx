"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import Link from "next/link";

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

type Tab = "slots" | "courses" | "links";

const SLOTS_KEY = "/api/admin/reservation-slots";
const COURSES_KEY = "/api/admin/reservation-courses";

export default function SlotsAndCoursesPage() {
  const [tab, setTab] = useState<Tab>("slots");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // SWRでデータ取得
  const { data: slotsData, isLoading: slotsLoading } = useSWR<{ ok: boolean; slots: Slot[] }>(SLOTS_KEY);
  const { data: coursesData, isLoading: coursesLoading } = useSWR<{ ok: boolean; courses: Course[] }>(COURSES_KEY);
  const slots = slotsData?.slots ?? [];
  const courses = coursesData?.courses ?? [];
  const loading = slotsLoading || coursesLoading;

  // モーダル
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Slot | Course | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formDuration, setFormDuration] = useState(15);
  const [formSortOrder, setFormSortOrder] = useState(0);
  const [saving, setSaving] = useState(false);

  // リンク設定
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
    setMessage(null);
    const endpoint = tab === "slots" ? "/api/admin/reservation-slots" : "/api/admin/reservation-courses";
    const body = {
      title: formTitle,
      description: formDescription || null,
      duration_minutes: formDuration,
      sort_order: formSortOrder,
    };

    try {
      const url = editingItem ? `${endpoint}/${editingItem.id}` : endpoint;
      const method = editingItem ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.ok) {
        setMessage({ type: "success", text: editingItem ? "更新しました" : "作成しました" });
        setShowModal(false);
        mutate(SLOTS_KEY);
        mutate(COURSES_KEY);
      } else {
        setMessage({ type: "error", text: json.message || "保存に失敗しました" });
      }
    } catch {
      setMessage({ type: "error", text: "通信エラーが発生しました" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("無効化しますか？（予約枠/コースは論理削除されます）")) return;
    const endpoint = tab === "slots" ? "/api/admin/reservation-slots" : "/api/admin/reservation-courses";
    try {
      const res = await fetch(`${endpoint}/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await res.json();
      if (json.ok) {
        setMessage({ type: "success", text: "無効化しました" });
        mutate(SLOTS_KEY);
        mutate(COURSES_KEY);
      }
    } catch {
      setMessage({ type: "error", text: "削除に失敗しました" });
    }
  }

  async function loadSlotCourses(slotId: string) {
    setSelectedSlotId(slotId);
    try {
      const res = await fetch(`/api/admin/reservation-slots/${slotId}/courses`, { credentials: "include" });
      const json = await res.json();
      if (json.ok) {
        setLinkedCourseIds(json.course_ids || []);
      }
    } catch {
      setLinkedCourseIds([]);
    }
  }

  async function saveSlotCourses() {
    if (!selectedSlotId) return;
    setLinkSaving(true);
    try {
      const res = await fetch(`/api/admin/reservation-slots/${selectedSlotId}/courses`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ course_ids: linkedCourseIds }),
      });
      const json = await res.json();
      if (json.ok) {
        setMessage({ type: "success", text: "紐づけを保存しました" });
      }
    } catch {
      setMessage({ type: "error", text: "保存に失敗しました" });
    } finally {
      setLinkSaving(false);
    }
  }

  const activeSlots = slots.filter((s) => s.is_active);
  const activeCourses = courses.filter((c) => c.is_active);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ヘッダー */}
        <div className="mb-6">
          <Link href="/admin/schedule" className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-block">
            ← 予約枠管理に戻る
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">予約枠・コース管理</h1>
          <p className="text-slate-600 mt-1">予約メニューとコースを設定します</p>
        </div>

        {/* メッセージ */}
        {message && (
          <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${
            message.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"
          }`}>
            {message.text}
          </div>
        )}

        {/* タブ */}
        <div className="flex gap-1 bg-white rounded-xl border border-slate-200 p-1 mb-6">
          {[
            { key: "slots" as Tab, label: "予約枠", count: activeSlots.length },
            { key: "courses" as Tab, label: "コース", count: activeCourses.length },
            { key: "links" as Tab, label: "紐づけ" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
                tab === t.key ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {t.label}
              {"count" in t && t.count !== undefined && (
                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${
                  tab === t.key ? "bg-blue-500 text-blue-100" : "bg-slate-100 text-slate-500"
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400">
            <div className="inline-block w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* 予約枠タブ */}
            {tab === "slots" && (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <button onClick={openCreateModal} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition">
                    予約枠を追加
                  </button>
                </div>
                {activeSlots.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500">
                    予約枠がありません。追加してください。
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
                    {activeSlots.map((slot) => (
                      <div key={slot.id} className="px-6 py-4 flex items-center gap-4">
                        <div className="flex-1">
                          <div className="font-medium text-slate-800">{slot.title}</div>
                          {slot.description && <div className="text-sm text-slate-500 mt-0.5">{slot.description}</div>}
                          <div className="flex gap-2 mt-1">
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">{slot.duration_minutes}分</span>
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full">順序: {slot.sort_order}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => openEditModal(slot)} className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition">
                            編集
                          </button>
                          <button onClick={() => handleDelete(slot.id)} className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition">
                            無効化
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* コースタブ */}
            {tab === "courses" && (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <button onClick={openCreateModal} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition">
                    コースを追加
                  </button>
                </div>
                {activeCourses.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500">
                    コースがありません。追加してください。
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
                    {activeCourses.map((course) => (
                      <div key={course.id} className="px-6 py-4 flex items-center gap-4">
                        <div className="flex-1">
                          <div className="font-medium text-slate-800">{course.title}</div>
                          {course.description && <div className="text-sm text-slate-500 mt-0.5">{course.description}</div>}
                          <div className="flex gap-2 mt-1">
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs rounded-full">{course.duration_minutes}分</span>
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full">順序: {course.sort_order}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => openEditModal(course)} className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition">
                            編集
                          </button>
                          <button onClick={() => handleDelete(course.id)} className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition">
                            無効化
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 紐づけタブ */}
            {tab === "links" && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                {activeSlots.length === 0 || activeCourses.length === 0 ? (
                  <div className="text-center text-slate-500 py-8">
                    予約枠とコースの両方が必要です。先にそれぞれを作成してください。
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">予約枠を選択</label>
                      <div className="flex flex-wrap gap-2">
                        {activeSlots.map((slot) => (
                          <button
                            key={slot.id}
                            onClick={() => loadSlotCourses(slot.id)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
                              selectedSlotId === slot.id
                                ? "bg-blue-600 text-white border-blue-600"
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
                        <label className="block text-sm font-medium text-slate-700 mb-2">紐づけるコースを選択（複数可）</label>
                        <div className="space-y-2">
                          {activeCourses.map((course) => (
                            <label key={course.id} className="flex items-center gap-3 px-4 py-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={linkedCourseIds.includes(course.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setLinkedCourseIds([...linkedCourseIds, course.id]);
                                  } else {
                                    setLinkedCourseIds(linkedCourseIds.filter((id) => id !== course.id));
                                  }
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
                          <button
                            onClick={saveSlotCourses}
                            disabled={linkSaving}
                            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                          >
                            {linkSaving ? "保存中..." : "紐づけを保存"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* モーダル */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-4">
                {editingItem ? (tab === "slots" ? "予約枠を編集" : "コースを編集") : (tab === "slots" ? "予約枠を追加" : "コースを追加")}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">タイトル</label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder={tab === "slots" ? "例: オンライン診察" : "例: 初診"}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">説明（任意）</label>
                  <input
                    type="text"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">所要時間（分）</label>
                  <input
                    type="number"
                    min={5}
                    max={480}
                    value={formDuration}
                    onChange={(e) => setFormDuration(Number(e.target.value) || 15)}
                    className="w-32 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">表示順序</label>
                  <input
                    type="number"
                    value={formSortOrder}
                    onChange={(e) => setFormSortOrder(Number(e.target.value) || 0)}
                    className="w-32 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition">
                  キャンセル
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !formTitle}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  {saving ? "保存中..." : "保存"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
