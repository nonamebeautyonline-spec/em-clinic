"use client";
// SALON: スタイリスト管理ページ

import { useState, useCallback } from "react";
import useSWR from "swr";

// ─── 型定義 ───
interface StylistShift {
  id: string;
  stylist_id: string;
  day_of_week: number;
  specific_date: string | null;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

interface Stylist {
  id: string;
  tenant_id: string;
  name: string;
  display_name: string | null;
  photo_url: string | null;
  specialties: string[];
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  stylist_shifts: StylistShift[];
}

// 曜日ラベル
const DAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

// SWR fetcher
const fetcher = (url: string) => fetch(url).then((r) => r.json());

// ─── メインページ ───
export default function StylistsPage() {
  const { data, error, mutate } = useSWR<{ ok: boolean; stylists: Stylist[] }>(
    "/api/admin/stylists",
    fetcher
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);

  const stylists = data?.stylists ?? [];
  const selected = stylists.find((s) => s.id === selectedId) ?? null;

  // スタイリスト追加
  const handleAdd = useCallback(
    async (form: { name: string; display_name: string; specialties: string[] }) => {
      const res = await fetch("/api/admin/stylists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.ok) {
        setShowAddDialog(false);
        mutate();
        setSelectedId(json.stylist?.id ?? null);
      } else {
        alert(json.message || json.error || "作成に失敗しました");
      }
    },
    [mutate]
  );

  // スタイリスト更新
  const handleUpdate = useCallback(
    async (id: string, updates: Partial<Stylist>) => {
      const res = await fetch(`/api/admin/stylists/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const json = await res.json();
      if (!json.ok) alert(json.message || json.error || "更新に失敗しました");
      mutate();
    },
    [mutate]
  );

  // 有効/無効切り替え
  const handleToggleActive = useCallback(
    async (s: Stylist) => {
      await handleUpdate(s.id, { is_active: !s.is_active });
    },
    [handleUpdate]
  );

  // シフト更新
  const handleSaveShifts = useCallback(
    async (stylistId: string, shifts: Array<{ day_of_week: number; start_time: string; end_time: string; is_available: boolean }>) => {
      const res = await fetch(`/api/admin/stylists/${stylistId}/shifts`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shifts }),
      });
      const json = await res.json();
      if (!json.ok) alert(json.message || json.error || "シフト保存に失敗しました");
      mutate();
    },
    [mutate]
  );

  if (error) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600 font-medium">データの取得に失敗しました</p>
          <button onClick={() => mutate()} className="mt-2 text-sm text-red-500 underline">再試行</button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">スタッフ管理</h1>
        <button
          onClick={() => setShowAddDialog(true)}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium transition-colors"
        >
          + スタッフ追加
        </button>
      </div>

      {/* メインレイアウト: 左一覧 + 右詳細 */}
      <div className="flex gap-6">
        {/* 左: スタイリスト一覧 */}
        <div className="w-80 shrink-0 space-y-3">
          {!data ? (
            // ローディング
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-slate-200 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-24" />
                    <div className="h-3 bg-slate-100 rounded w-32" />
                  </div>
                </div>
              </div>
            ))
          ) : stylists.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
              <p className="text-4xl mb-3">💇</p>
              <p className="text-slate-500 text-sm">スタイリストが登録されていません</p>
            </div>
          ) : (
            stylists.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedId(s.id)}
                className={`w-full text-left bg-white rounded-xl border p-4 transition-all hover:shadow-md ${
                  selectedId === s.id
                    ? "border-purple-400 ring-2 ring-purple-100 shadow-md"
                    : "border-slate-200 hover:border-slate-300"
                } ${!s.is_active ? "opacity-50" : ""}`}
              >
                <div className="flex items-center gap-3">
                  {/* アバター */}
                  {s.photo_url ? (
                    <img
                      src={s.photo_url}
                      alt={s.display_name || s.name}
                      className="w-12 h-12 rounded-full object-cover border border-slate-200"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-lg">
                      {(s.display_name || s.name).charAt(0)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-900 truncate">
                        {s.display_name || s.name}
                      </p>
                      {!s.is_active && (
                        <span className="text-xs bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded">無効</span>
                      )}
                    </div>
                    {s.display_name && s.display_name !== s.name && (
                      <p className="text-xs text-slate-400">{s.name}</p>
                    )}
                    {s.specialties.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {s.specialties.slice(0, 3).map((sp) => (
                          <span key={sp} className="text-xs bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded">
                            {sp}
                          </span>
                        ))}
                        {s.specialties.length > 3 && (
                          <span className="text-xs text-slate-400">+{s.specialties.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        {/* 右: 詳細・編集エリア */}
        <div className="flex-1 min-w-0">
          {selected ? (
            <StylistDetail
              stylist={selected}
              onUpdate={handleUpdate}
              onToggleActive={handleToggleActive}
              onSaveShifts={handleSaveShifts}
            />
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
              <p className="text-slate-400 text-sm">
                左のリストからスタイリストを選択してください
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 追加ダイアログ */}
      {showAddDialog && (
        <AddStylistDialog
          onClose={() => setShowAddDialog(false)}
          onAdd={handleAdd}
        />
      )}
    </div>
  );
}

// ─── スタイリスト詳細/編集パネル ───
function StylistDetail({
  stylist,
  onUpdate,
  onToggleActive,
  onSaveShifts,
}: {
  stylist: Stylist;
  onUpdate: (id: string, updates: Partial<Stylist>) => Promise<void>;
  onToggleActive: (s: Stylist) => Promise<void>;
  onSaveShifts: (stylistId: string, shifts: Array<{ day_of_week: number; start_time: string; end_time: string; is_available: boolean }>) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(stylist.name);
  const [displayName, setDisplayName] = useState(stylist.display_name || "");
  const [photoUrl, setPhotoUrl] = useState(stylist.photo_url || "");
  const [specialtyInput, setSpecialtyInput] = useState("");
  const [specialties, setSpecialties] = useState<string[]>(stylist.specialties);
  const [saving, setSaving] = useState(false);

  // スタイリスト変更時にフォーム値をリセット
  const resetForm = useCallback(() => {
    setName(stylist.name);
    setDisplayName(stylist.display_name || "");
    setPhotoUrl(stylist.photo_url || "");
    setSpecialties(stylist.specialties);
    setSpecialtyInput("");
  }, [stylist]);

  // 編集保存
  const handleSave = async () => {
    if (!name.trim()) {
      alert("名前は必須です");
      return;
    }
    setSaving(true);
    await onUpdate(stylist.id, {
      name: name.trim(),
      display_name: displayName.trim() || null,
      photo_url: photoUrl.trim() || null,
      specialties,
    });
    setSaving(false);
    setEditing(false);
  };

  // 専門分野タグ追加
  const addSpecialty = () => {
    const val = specialtyInput.trim();
    if (val && !specialties.includes(val)) {
      setSpecialties([...specialties, val]);
    }
    setSpecialtyInput("");
  };

  const removeSpecialty = (sp: string) => {
    setSpecialties(specialties.filter((s) => s !== sp));
  };

  return (
    <div className="space-y-6">
      {/* プロフィールカード */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">プロフィール</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleActive(stylist)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                stylist.is_active
                  ? "border-red-200 text-red-600 hover:bg-red-50"
                  : "border-green-200 text-green-600 hover:bg-green-50"
              }`}
            >
              {stylist.is_active ? "無効にする" : "有効にする"}
            </button>
            {!editing ? (
              <button
                onClick={() => { resetForm(); setEditing(true); }}
                className="text-xs px-3 py-1.5 rounded-lg border border-purple-200 text-purple-600 hover:bg-purple-50 transition-colors"
              >
                編集
              </button>
            ) : (
              <div className="flex gap-1">
                <button
                  onClick={() => { resetForm(); setEditing(false); }}
                  className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="text-xs px-3 py-1.5 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  {saving ? "保存中..." : "保存"}
                </button>
              </div>
            )}
          </div>
        </div>

        {editing ? (
          // 編集モード
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">名前 *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="山田 太郎"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">表示名</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="TARO"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">写真URL</label>
              <input
                type="text"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">専門分野</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={specialtyInput}
                  onChange={(e) => setSpecialtyInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addSpecialty();
                    }
                  }}
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="カット、カラー等を入力してEnter"
                />
                <button
                  type="button"
                  onClick={addSpecialty}
                  className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm hover:bg-slate-200 transition-colors"
                >
                  追加
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {specialties.map((sp) => (
                  <span
                    key={sp}
                    className="inline-flex items-center gap-1 text-xs bg-purple-50 text-purple-600 px-2 py-1 rounded-lg"
                  >
                    {sp}
                    <button
                      onClick={() => removeSpecialty(sp)}
                      className="text-purple-400 hover:text-purple-700"
                    >
                      x
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : (
          // 表示モード
          <div className="flex items-start gap-4">
            {stylist.photo_url ? (
              <img
                src={stylist.photo_url}
                alt={stylist.display_name || stylist.name}
                className="w-20 h-20 rounded-full object-cover border border-slate-200"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-2xl">
                {(stylist.display_name || stylist.name).charAt(0)}
              </div>
            )}
            <div className="flex-1">
              <h3 className="text-lg font-bold text-slate-900">
                {stylist.display_name || stylist.name}
              </h3>
              {stylist.display_name && stylist.display_name !== stylist.name && (
                <p className="text-sm text-slate-500">{stylist.name}</p>
              )}
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    stylist.is_active ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {stylist.is_active ? "有効" : "無効"}
                </span>
                <span className="text-xs text-slate-400">
                  並び順: {stylist.sort_order}
                </span>
              </div>
              {stylist.specialties.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {stylist.specialties.map((sp) => (
                    <span key={sp} className="text-xs bg-purple-50 text-purple-600 px-2 py-1 rounded-lg">
                      {sp}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 週間シフト */}
      <ShiftEditor
        stylistId={stylist.id}
        shifts={stylist.stylist_shifts?.filter((s) => s.specific_date === null) ?? []}
        onSave={onSaveShifts}
      />
    </div>
  );
}

// ─── 週間シフト編集コンポーネント ───
function ShiftEditor({
  stylistId,
  shifts,
  onSave,
}: {
  stylistId: string;
  shifts: StylistShift[];
  onSave: (stylistId: string, shifts: Array<{ day_of_week: number; start_time: string; end_time: string; is_available: boolean }>) => Promise<void>;
}) {
  // 曜日ごとのシフトデータを初期化（月〜日 = 1,2,3,4,5,6,0）
  const displayOrder = [1, 2, 3, 4, 5, 6, 0]; // 月〜日
  const initShifts = () =>
    displayOrder.map((dow) => {
      const existing = shifts.find((s) => s.day_of_week === dow);
      return {
        day_of_week: dow,
        start_time: existing?.start_time ?? "09:00",
        end_time: existing?.end_time ?? "18:00",
        is_available: existing?.is_available ?? false,
      };
    });

  const [weekShifts, setWeekShifts] = useState(initShifts);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // stylistId変更時にリセット
  const resetShifts = useCallback(() => {
    setWeekShifts(
      displayOrder.map((dow) => {
        const existing = shifts.find((s) => s.day_of_week === dow);
        return {
          day_of_week: dow,
          start_time: existing?.start_time ?? "09:00",
          end_time: existing?.end_time ?? "18:00",
          is_available: existing?.is_available ?? false,
        };
      })
    );
    setDirty(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stylistId, shifts]);

  // propsの変更でリセット
  useState(() => resetShifts());

  const updateShift = (idx: number, field: string, value: string | boolean) => {
    setWeekShifts((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(stylistId, weekShifts);
    setSaving(false);
    setDirty(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-900">週間シフト</h2>
        <div className="flex gap-2">
          {dirty && (
            <button
              onClick={resetShifts}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              リセット
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            className="text-xs px-4 py-1.5 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            {saving ? "保存中..." : "シフト保存"}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {weekShifts.map((ws, idx) => (
          <div
            key={ws.day_of_week}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors ${
              ws.is_available
                ? "border-purple-100 bg-purple-50/50"
                : "border-slate-100 bg-slate-50/50"
            }`}
          >
            {/* 曜日ラベル */}
            <span
              className={`w-8 text-center text-sm font-bold ${
                ws.day_of_week === 0
                  ? "text-red-500"
                  : ws.day_of_week === 6
                  ? "text-blue-500"
                  : "text-slate-700"
              }`}
            >
              {DAY_LABELS[ws.day_of_week]}
            </span>

            {/* 出勤トグル */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={ws.is_available}
                onChange={(e) => updateShift(idx, "is_available", e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-xs text-slate-600 w-8">
                {ws.is_available ? "出勤" : "休み"}
              </span>
            </label>

            {/* 時間入力 */}
            {ws.is_available ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="time"
                  value={ws.start_time}
                  onChange={(e) => updateShift(idx, "start_time", e.target.value)}
                  className="px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
                <span className="text-slate-400 text-sm">〜</span>
                <input
                  type="time"
                  value={ws.end_time}
                  onChange={(e) => updateShift(idx, "end_time", e.target.value)}
                  className="px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
            ) : (
              <span className="text-xs text-slate-400">---</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 追加ダイアログ ───
function AddStylistDialog({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (form: { name: string; display_name: string; specialties: string[] }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [specialtyInput, setSpecialtyInput] = useState("");
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const addSpecialty = () => {
    const val = specialtyInput.trim();
    if (val && !specialties.includes(val)) {
      setSpecialties([...specialties, val]);
    }
    setSpecialtyInput("");
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      alert("名前は必須です");
      return;
    }
    setSubmitting(true);
    await onAdd({ name: name.trim(), display_name: displayName.trim(), specialties });
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* オーバーレイ */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      {/* ダイアログ */}
      <div className="relative bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6 mx-4">
        <h2 className="text-lg font-bold text-slate-900 mb-4">スタッフ追加</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">名前 *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="山田 太郎"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">表示名</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="TARO（省略可）"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">専門分野</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={specialtyInput}
                onChange={(e) => setSpecialtyInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSpecialty();
                  }
                }}
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="カット、カラー等"
              />
              <button
                type="button"
                onClick={addSpecialty}
                className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm hover:bg-slate-200 transition-colors"
              >
                追加
              </button>
            </div>
            {specialties.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {specialties.map((sp) => (
                  <span
                    key={sp}
                    className="inline-flex items-center gap-1 text-xs bg-purple-50 text-purple-600 px-2 py-1 rounded-lg"
                  >
                    {sp}
                    <button
                      onClick={() => setSpecialties(specialties.filter((s) => s !== sp))}
                      className="text-purple-400 hover:text-purple-700"
                    >
                      x
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            {submitting ? "作成中..." : "追加"}
          </button>
        </div>
      </div>
    </div>
  );
}
