"use client";

import { useState, useEffect } from "react";

interface MarkDef {
  id: number;
  value: string;
  label: string;
  color: string;
  icon: string;
  sort_order: number;
  patient_count: number;
}

interface MarkPatient {
  patient_id: string;
  patient_name: string;
  has_line: boolean;
}

const PRESET_COLORS = [
  "#EF4444", "#F97316", "#EAB308", "#84CC16", "#22C55E",
  "#14B8A6", "#06B6D4", "#3B82F6", "#8B5CF6", "#EC4899",
  "#D97706", "#65A30D", "#0D9488", "#7C3AED", "#6B7280",
];

export default function MarkManagementPage() {
  const [marks, setMarks] = useState<MarkDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMark, setEditingMark] = useState<MarkDef | null>(null);
  const [label, setLabel] = useState("");
  const [color, setColor] = useState("#6B7280");
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [showPatients, setShowPatients] = useState(false);
  const [patientList, setPatientList] = useState<MarkPatient[]>([]);
  const [patientListMark, setPatientListMark] = useState<MarkDef | null>(null);
  const [loadingPatients, setLoadingPatients] = useState(false);

  const fetchMarks = async () => {
    const res = await fetch("/api/admin/line/marks", { credentials: "include" });
    const data = await res.json();
    if (data.marks) setMarks(data.marks);
    setLoading(false);
  };

  useEffect(() => { fetchMarks(); }, []);

  const handleSave = async () => {
    if (!label.trim() || saving) return;
    setSaving(true);

    const url = editingMark ? `/api/admin/line/marks/${editingMark.id}` : "/api/admin/line/marks";
    const method = editingMark ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ label: label.trim(), color, icon: "●" }),
    });

    if (res.ok) {
      await fetchMarks();
      resetForm();
    } else {
      const data = await res.json();
      alert(data.error || "保存失敗");
    }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    const res = await fetch(`/api/admin/line/marks/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (res.ok) {
      await fetchMarks();
      setDeleteConfirm(null);
    } else {
      const data = await res.json();
      alert(data.error || "削除失敗");
    }
  };

  const handleShowPatients = async (mark: MarkDef) => {
    setPatientListMark(mark);
    setShowPatients(true);
    setLoadingPatients(true);
    const res = await fetch(`/api/admin/line/marks/${mark.id}`, { credentials: "include" });
    const data = await res.json();
    if (data.patients) setPatientList(data.patients);
    setLoadingPatients(false);
  };

  const handleEdit = (mark: MarkDef) => {
    setEditingMark(mark);
    setLabel(mark.label);
    setColor(mark.color);
    setShowModal(true);
  };

  const resetForm = () => {
    setShowModal(false);
    setEditingMark(null);
    setLabel("");
    setColor("#6B7280");
  };

  return (
    <div className="min-h-full bg-gray-50/50">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                </div>
                対応マーク管理
              </h1>
              <p className="text-sm text-gray-400 mt-1">トーク一覧で使用する対応マークの選択肢を管理</p>
            </div>
            <button
              onClick={() => { resetForm(); setShowModal(true); }}
              className="px-5 py-2.5 bg-gradient-to-r from-[#06C755] to-[#05a648] text-white rounded-xl text-sm font-medium hover:from-[#05b34d] hover:to-[#049a42] shadow-lg shadow-green-500/25 transition-all duration-200 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              新しい選択肢を追加
            </button>
          </div>
        </div>
      </div>

      {/* マーク一覧テーブル - Lステップ風 */}
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-green-200 border-t-green-500 rounded-full animate-spin" />
              <span className="text-sm text-gray-400">読み込み中...</span>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* テーブルヘッダー */}
            <div className="grid grid-cols-[60px_1fr_80px_80px_120px] gap-4 px-6 py-3 bg-gray-50/80 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <div className="text-center">#</div>
              <div>選択肢</div>
              <div className="text-center">カラー</div>
              <div className="text-center">人数</div>
              <div className="text-center">操作</div>
            </div>

            <div className="text-xs text-gray-400 px-6 py-2 bg-amber-50/50 border-b border-gray-100">
              選択肢の1番上が初期値となります
            </div>

            {marks.map((mark, index) => (
              <div
                key={mark.id}
                className="grid grid-cols-[60px_1fr_80px_80px_120px] gap-4 items-center px-6 py-3.5 border-b border-gray-50 hover:bg-gray-50/50 transition-colors group"
              >
                {/* 番号 */}
                <div className="flex items-center justify-center">
                  <span className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-500">
                    {index + 1}
                  </span>
                </div>

                {/* ラベル */}
                <div className="flex items-center gap-3">
                  {mark.value !== "none" ? (
                    <span className="w-4 h-4 rounded-full flex-shrink-0 shadow-sm" style={{ backgroundColor: mark.color }} />
                  ) : (
                    <span className="w-4 h-4 rounded-full border-2 border-gray-300 flex-shrink-0" />
                  )}
                  <span className="text-sm font-medium text-gray-800">{mark.label}</span>
                </div>

                {/* カラー表示 */}
                <div className="flex justify-center">
                  <div
                    className="w-6 h-6 rounded-lg border border-gray-200 shadow-inner"
                    style={{ backgroundColor: mark.color === "#FFFFFF" ? "#F3F4F6" : mark.color }}
                  />
                </div>

                {/* 人数 */}
                <div className="flex justify-center">
                  <button
                    onClick={() => handleShowPatients(mark)}
                    className="text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                  >
                    {mark.patient_count}人
                  </button>
                </div>

                {/* 操作 */}
                <div className="flex items-center justify-center gap-1">
                  <button
                    onClick={() => handleEdit(mark)}
                    className="px-3 py-1.5 text-xs font-medium bg-[#06C755] text-white rounded-lg hover:bg-[#05b34d] transition-colors"
                  >
                    設定
                  </button>
                  {mark.value !== "none" && (
                    <button
                      onClick={() => setDeleteConfirm(mark.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* 注意書き */}
            <div className="px-6 py-3 bg-rose-50/50 text-xs text-rose-400">
              ※保存を押すと変更が即座に反映されます。
            </div>
          </div>
        )}
      </div>

      {/* 編集/作成モーダル - Lステップ風 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => resetForm()}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-gray-900 text-lg">
                  {editingMark ? "対応マーク編集" : "新しい対応マーク"}
                </h2>
                <button onClick={resetForm} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* 選択肢名 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">選択肢名</label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="例: 未対応、処方ずみ、電話番号確認中"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 bg-gray-50/50 transition-all"
                  autoFocus
                />
              </div>

              {/* カラー */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">カラー</label>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={`w-7 h-7 rounded-full transition-all duration-150 ${
                        color === c
                          ? "ring-2 ring-offset-1 ring-gray-400 scale-110"
                          : "hover:scale-105"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* プレビュー */}
              <div className="bg-gray-50 rounded-xl p-4">
                <span className="text-xs text-gray-400 block mb-2">プレビュー</span>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-sm font-medium text-gray-800">{label || "マーク名"}</span>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
              <button onClick={resetForm} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 text-sm font-medium transition-colors">
                キャンセル
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !label.trim()}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[#06C755] to-[#05a648] text-white rounded-xl hover:from-[#05b34d] hover:to-[#049a42] disabled:opacity-40 text-sm font-medium shadow-lg shadow-green-500/25 transition-all"
              >
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    保存中...
                  </span>
                ) : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 削除確認モーダル */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="font-bold text-gray-900 mb-1">対応マークを削除</h3>
              <p className="text-sm text-gray-500 mb-5">この対応マークを削除しますか？使用中の患者からもマークが解除されます。</p>
              <div className="flex gap-3 w-full">
                <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 text-sm font-medium transition-colors">
                  キャンセル
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 text-sm font-medium shadow-lg shadow-red-500/25 transition-all"
                >
                  削除する
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 患者リストモーダル */}
      {showPatients && patientListMark && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => { setShowPatients(false); setPatientList([]); }}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col" style={{ maxHeight: "70vh" }} onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full" style={{ backgroundColor: patientListMark.color }} />
                <h3 className="font-bold text-gray-900">{patientListMark.label}</h3>
                <span className="text-sm text-gray-400">({patientList.length}人)</span>
              </div>
              <button onClick={() => { setShowPatients(false); setPatientList([]); }} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0">
              {loadingPatients ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-gray-200 border-t-green-500 rounded-full animate-spin" />
                </div>
              ) : patientList.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">該当する患者がいません</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {patientList.map(p => (
                    <div key={p.patient_id} className="flex items-center gap-3 px-5 py-2.5 hover:bg-gray-50/50">
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-gray-800 block truncate">{p.patient_name}</span>
                        <span className="text-[10px] text-gray-400 font-mono">{p.patient_id}</span>
                      </div>
                      {p.has_line ? (
                        <span className="text-[9px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">LINE連携</span>
                      ) : (
                        <span className="text-[9px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-full">未連携</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
