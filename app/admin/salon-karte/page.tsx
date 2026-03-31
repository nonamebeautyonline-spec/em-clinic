"use client";
// SALON: 施術カルテ（来店記録）管理ページ

import { useState, useCallback, useMemo } from "react";
import useSWR from "swr";

// --- 型定義 ---
interface Patient {
  id: number;
  name: string | null;
}

interface Stylist {
  id: string;
  name: string;
}

interface MenuItem {
  menu_id?: string;
  name: string;
  price: number;
}

interface SalonVisit {
  id: string;
  patient_id: number;
  stylist_id: string | null;
  visit_date: string;
  menu_items: MenuItem[];
  total_amount: number;
  payment_method: string | null;
  notes: string | null;
  photo_urls: string[] | null;
  patients: { id: number; name: string | null } | null;
  stylists: { id: string; name: string } | null;
  created_at: string;
}

interface TreatmentMenu {
  id: string;
  name: string;
  price: number;
  duration_min: number | null;
  is_active: boolean;
  treatment_categories: { id: string; name: string } | null;
}

const fetcher = (url: string) =>
  fetch(url, { credentials: "include" }).then((r) => r.json());

const PAYMENT_METHODS = ["現金", "クレジットカード", "電子マネー", "QR決済", "その他"];

export default function SalonKartePage() {
  const [page, setPage] = useState(1);
  const limit = 30;
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingVisit, setEditingVisit] = useState<SalonVisit | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, mutate } = useSWR<{
    visits: SalonVisit[];
    total: number;
    page: number;
    limit: number;
  }>(`/api/admin/salon-visits?page=${page}&limit=${limit}`, fetcher);

  const visits = data?.visits ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const fmt = (n: number) => new Intl.NumberFormat("ja-JP").format(n);

  // 来店記録の保存
  const handleSave = useCallback(
    async (formData: Record<string, unknown>) => {
      if (editingVisit) {
        await fetch(`/api/admin/salon-visits/${editingVisit.id}`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
      } else {
        await fetch("/api/admin/salon-visits", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
      }
      mutate();
      setShowAddDialog(false);
      setEditingVisit(null);
    },
    [editingVisit, mutate],
  );

  // 来店記録の削除
  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm("この来店記録を削除しますか？")) return;
      await fetch(`/api/admin/salon-visits/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      mutate();
    },
    [mutate],
  );

  // 施術内容をテキスト表示
  const menuItemsText = (items: MenuItem[]) => {
    if (!items || items.length === 0) return "-";
    return items.map((i) => i.name).join("、");
  };

  // 患者名表示
  const patientName = (p: { id: number; name: string | null } | null) => {
    if (!p) return "-";
    return p.name?.trim() || "-";
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">施術カルテ</h1>
          <p className="text-sm text-slate-500 mt-1">全{total}件</p>
        </div>
        <button
          onClick={() => {
            setEditingVisit(null);
            setShowAddDialog(true);
          }}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium"
        >
          + 来店記録を追加
        </button>
      </div>

      {/* テーブル */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                <th className="text-left px-4 py-3 text-slate-600 font-medium">来店日</th>
                <th className="text-left px-4 py-3 text-slate-600 font-medium">お客様名</th>
                <th className="text-left px-4 py-3 text-slate-600 font-medium">スタイリスト</th>
                <th className="text-left px-4 py-3 text-slate-600 font-medium">施術内容</th>
                <th className="text-right px-4 py-3 text-slate-600 font-medium">金額</th>
                <th className="text-left px-4 py-3 text-slate-600 font-medium">支払方法</th>
                <th className="text-center px-4 py-3 text-slate-600 font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visits.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    来店記録がありません
                  </td>
                </tr>
              )}
              {visits.map((v) => (
                <VisitRow
                  key={v.id}
                  visit={v}
                  expanded={expandedId === v.id}
                  onToggle={() => setExpandedId(expandedId === v.id ? null : v.id)}
                  onEdit={() => { setEditingVisit(v); setShowAddDialog(true); }}
                  onDelete={() => handleDelete(v.id)}
                  patientName={patientName(v.patients)}
                  menuText={menuItemsText(v.menu_items)}
                  fmt={fmt}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ページネーション */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1 text-sm bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 disabled:opacity-40"
          >
            前へ
          </button>
          <span className="text-sm text-slate-600">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1 text-sm bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 disabled:opacity-40"
          >
            次へ
          </button>
        </div>
      )}

      {/* 追加/編集ダイアログ */}
      {showAddDialog && (
        <VisitDialog
          initial={editingVisit}
          onSave={handleSave}
          onClose={() => { setShowAddDialog(false); setEditingVisit(null); }}
        />
      )}
    </div>
  );
}

// --- テーブル行コンポーネント ---
function VisitRow({
  visit,
  expanded,
  onToggle,
  onEdit,
  onDelete,
  patientName,
  menuText,
  fmt,
}: {
  visit: SalonVisit;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  patientName: string;
  menuText: string;
  fmt: (n: number) => string;
}) {
  return (
    <>
      <tr
        className="hover:bg-slate-50 cursor-pointer"
        onClick={onToggle}
      >
        <td className="px-4 py-3 whitespace-nowrap">{visit.visit_date}</td>
        <td className="px-4 py-3 font-medium text-slate-900">{patientName}</td>
        <td className="px-4 py-3">{visit.stylists?.name ?? "-"}</td>
        <td className="px-4 py-3 max-w-[200px] truncate">{menuText}</td>
        <td className="px-4 py-3 text-right font-medium">¥{fmt(visit.total_amount)}</td>
        <td className="px-4 py-3">{visit.payment_method ?? "-"}</td>
        <td className="px-4 py-3 text-center">
          <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
            <button onClick={onEdit} className="p-1 text-slate-400 hover:text-purple-600" title="編集">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
            </button>
            <button onClick={onDelete} className="p-1 text-slate-400 hover:text-red-500" title="削除">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          </div>
        </td>
      </tr>
      {/* 展開: ノート・写真表示 */}
      {expanded && (
        <tr>
          <td colSpan={7} className="px-4 py-4 bg-slate-50 border-b border-slate-200">
            <div className="space-y-2">
              {visit.notes && (
                <div>
                  <span className="text-xs font-medium text-slate-500">メモ:</span>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap mt-0.5">{visit.notes}</p>
                </div>
              )}
              {visit.photo_urls && visit.photo_urls.length > 0 && (
                <div>
                  <span className="text-xs font-medium text-slate-500">写真:</span>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    {visit.photo_urls.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                        <img src={url} alt={`写真${i + 1}`} className="w-20 h-20 object-cover rounded-lg border border-slate-200" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
              {!visit.notes && (!visit.photo_urls || visit.photo_urls.length === 0) && (
                <p className="text-sm text-slate-400">メモ・写真なし</p>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// --- 来店記録追加/編集ダイアログ ---
function VisitDialog({
  initial,
  onSave,
  onClose,
}: {
  initial: SalonVisit | null;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  onClose: () => void;
}) {
  // お客様検索
  const [patientSearch, setPatientSearch] = useState("");
  const [patientId, setPatientId] = useState<number | null>(initial?.patient_id ?? null);
  const [patientDisplay, setPatientDisplay] = useState(
    initial?.patients?.name?.trim() ?? "",
  );

  // スタイリスト一覧
  const { data: stylistData } = useSWR<{ stylists: { id: string; name: string }[] }>(
    "/api/admin/stylists",
    fetcher,
  );
  const stylists = stylistData?.stylists ?? [];

  // 施術メニュー一覧
  const { data: menuData } = useSWR<{ menus: TreatmentMenu[] }>(
    "/api/admin/treatments",
    fetcher,
  );
  const allMenus = useMemo(
    () => (menuData?.menus ?? []).filter((m) => m.is_active),
    [menuData],
  );

  // フォーム状態
  const [stylistId, setStylistId] = useState(initial?.stylist_id ?? "");
  const [visitDate, setVisitDate] = useState(initial?.visit_date ?? new Date().toISOString().slice(0, 10));
  const [selectedMenuItems, setSelectedMenuItems] = useState<MenuItem[]>(initial?.menu_items ?? []);
  const [totalAmount, setTotalAmount] = useState(initial?.total_amount?.toString() ?? "0");
  const [paymentMethod, setPaymentMethod] = useState(initial?.payment_method ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [saving, setSaving] = useState(false);

  // お客様検索（patient-lookupのname検索を利用）
  const { data: searchResult } = useSWR<{
    found: boolean;
    candidates?: { id: string; name: string }[];
    patient?: { id: string; name: string };
  }>(
    patientSearch.length >= 2
      ? `/api/admin/patient-lookup?q=${encodeURIComponent(patientSearch)}&type=name`
      : null,
    fetcher,
  );
  // candidatesがある場合はリスト表示、1件ヒットの場合はpatientを使う
  const searchPatients: { id: number; name: string }[] = useMemo(() => {
    if (!searchResult) return [];
    if (searchResult.candidates) {
      return searchResult.candidates.map((c) => ({ id: Number(c.id), name: c.name }));
    }
    if (searchResult.found && searchResult.patient) {
      return [{ id: Number(searchResult.patient.id), name: searchResult.patient.name }];
    }
    return [];
  }, [searchResult]);

  // お客様選択
  const selectPatient = (p: { id: number; name: string }) => {
    setPatientId(p.id);
    setPatientDisplay(p.name);
    setPatientSearch("");
  };

  // メニュー追加
  const addMenu = (menu: TreatmentMenu) => {
    const item: MenuItem = { menu_id: menu.id, name: menu.name, price: menu.price };
    const updated = [...selectedMenuItems, item];
    setSelectedMenuItems(updated);
    // 合計金額を自動計算
    const sum = updated.reduce((s, i) => s + (i.price || 0), 0);
    setTotalAmount(sum.toString());
  };

  // メニュー削除
  const removeMenu = (index: number) => {
    const updated = selectedMenuItems.filter((_, i) => i !== index);
    setSelectedMenuItems(updated);
    const sum = updated.reduce((s, i) => s + (i.price || 0), 0);
    setTotalAmount(sum.toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId) return;
    setSaving(true);
    await onSave({
      patient_id: patientId,
      stylist_id: stylistId || null,
      visit_date: visitDate,
      menu_items: selectedMenuItems,
      total_amount: parseInt(totalAmount, 10) || 0,
      payment_method: paymentMethod || null,
      notes: notes || null,
    });
    setSaving(false);
  };

  const fmt = (n: number) => new Intl.NumberFormat("ja-JP").format(n);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-slate-900 mb-4">
          {initial ? "来店記録を編集" : "来店記録を追加"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* お客様選択 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">お客様 *</label>
            {patientDisplay ? (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-900 bg-slate-100 px-3 py-1.5 rounded-lg">
                  {patientDisplay}
                </span>
                <button
                  type="button"
                  onClick={() => { setPatientId(null); setPatientDisplay(""); }}
                  className="text-xs text-slate-500 hover:text-red-500"
                >
                  変更
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="名前で検索（2文字以上）"
                />
                {searchPatients.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 max-h-40 overflow-y-auto">
                    {searchPatients.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => selectPatient(p)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-purple-50 border-b border-slate-100 last:border-0"
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* スタイリスト */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">スタイリスト</label>
            <select
              value={stylistId}
              onChange={(e) => setStylistId(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">未選択</option>
              {stylists.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* 来店日 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">来店日 *</label>
            <input
              type="date"
              value={visitDate}
              onChange={(e) => setVisitDate(e.target.value)}
              required
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* メニュー選択（複数可） */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">施術メニュー</label>
            {/* 選択済みメニュー */}
            {selectedMenuItems.length > 0 && (
              <div className="space-y-1 mb-2">
                {selectedMenuItems.map((item, i) => (
                  <div key={i} className="flex items-center justify-between bg-purple-50 px-3 py-1.5 rounded-lg text-sm">
                    <span>{item.name} - ¥{fmt(item.price)}</span>
                    <button
                      type="button"
                      onClick={() => removeMenu(i)}
                      className="text-red-400 hover:text-red-600 text-xs ml-2"
                    >
                      削除
                    </button>
                  </div>
                ))}
              </div>
            )}
            {/* メニュー追加ドロップダウン */}
            <select
              value=""
              onChange={(e) => {
                const menu = allMenus.find((m) => m.id === e.target.value);
                if (menu) addMenu(menu);
              }}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">メニューを追加...</option>
              {allMenus.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} (¥{fmt(m.price)})
                </option>
              ))}
            </select>
          </div>

          {/* 金額 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">合計金額（円）</label>
            <input
              type="number"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              min={0}
            />
          </div>

          {/* 支払方法 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">支払方法</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">未選択</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* メモ */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">メモ</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              placeholder="施術メモ..."
            />
          </div>

          {/* ボタン */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={saving || !patientId}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
            >
              {saving ? "保存中..." : "保存"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
