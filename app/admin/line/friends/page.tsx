"use client";

import { useState, useEffect, useCallback } from "react";

interface Tag { id: number; name: string; color: string; }
interface PatientRow { patient_id: string; patient_name: string; line_id: string | null; mark: string; tags: Tag[]; fields: Record<string, string>; }
interface FieldDef { id: number; name: string; field_type: string; options?: string[]; }
interface MarkDef { id: number; value: string; label: string; color: string; icon: string; }

const PAGE_SIZE = 50;

export default function FriendsListPage() {
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [fieldDefs, setFieldDefs] = useState<FieldDef[]>([]);
  const [markDefs, setMarkDefs] = useState<MarkDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTag, setFilterTag] = useState<number | null>(null);
  const [filterMark, setFilterMark] = useState<string>("");
  const [filterLine, setFilterLine] = useState<string>("");
  const [searchName, setSearchName] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<PatientRow | null>(null);
  const [editingFields, setEditingFields] = useState<Record<number, string>>({});
  const [editingMark, setEditingMark] = useState<string>("");
  const [markNote, setMarkNote] = useState("");
  const [savingFields, setSavingFields] = useState(false);
  const [openMarkDropdown, setOpenMarkDropdown] = useState<string | null>(null);

  // ページネーション
  const [page, setPage] = useState(0);

  // チェックボックス選択
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // 一括操作
  const [bulkTab, setBulkTab] = useState<"mark" | "tag">("mark");
  const [bulkTagAction, setBulkTagAction] = useState<"add" | "remove">("add");
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [bulkSelectedMark, setBulkSelectedMark] = useState("");
  const [bulkSelectedTag, setBulkSelectedTag] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [patientsRes, tagsRes, fieldsRes, marksRes] = await Promise.all([
      fetch("/api/admin/line/friends-list", { credentials: "include" }),
      fetch("/api/admin/tags", { credentials: "include" }),
      fetch("/api/admin/friend-fields", { credentials: "include" }),
      fetch("/api/admin/line/marks", { credentials: "include" }),
    ]);
    const [patientsData, tagsData, fieldsData, marksData] = await Promise.all([
      patientsRes.json(), tagsRes.json(), fieldsRes.json(), marksRes.json(),
    ]);
    if (patientsData.patients) setPatients(patientsData.patients);
    if (tagsData.tags) setAllTags(tagsData.tags);
    if (fieldsData.fields) setFieldDefs(fieldsData.fields);
    if (marksData.marks) setMarkDefs(marksData.marks);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    const close = () => setOpenMarkDropdown(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  // マーク定義から色・ラベルを取得
  const getMarkStyle = (mark: string) => {
    const def = markDefs.find(m => m.value === mark);
    if (!def || def.value === "none") return { color: "bg-gray-200", label: "未設定", hex: "#D1D5DB" };
    return { color: "", label: def.label, hex: def.color };
  };

  const handleMarkChange = async (patientId: string, mark: string) => {
    setOpenMarkDropdown(null);
    await fetch(`/api/admin/patients/${patientId}/mark`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ mark }),
    });
    setPatients(prev => prev.map(p => p.patient_id === patientId ? { ...p, mark } : p));
  };

  const handleToggleTag = async (patientId: string, tagId: number, hasTag: boolean) => {
    if (hasTag) {
      await fetch(`/api/admin/patients/${patientId}/tags?tag_id=${tagId}`, { method: "DELETE", credentials: "include" });
    } else {
      await fetch(`/api/admin/patients/${patientId}/tags`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ tag_id: tagId }),
      });
    }
    await fetchData();
  };

  const handleSaveFields = async () => {
    if (!selectedPatient || savingFields) return;
    setSavingFields(true);
    const values = Object.entries(editingFields).map(([fieldId, value]) => ({ field_id: Number(fieldId), value }));
    await fetch(`/api/admin/patients/${selectedPatient.patient_id}/fields`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ values }),
    });
    if (editingMark !== selectedPatient.mark) {
      await fetch(`/api/admin/patients/${selectedPatient.patient_id}/mark`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ mark: editingMark, note: markNote }),
      });
    }
    await fetchData();
    setSelectedPatient(null);
    setSavingFields(false);
  };

  const openDetail = (p: PatientRow) => {
    setSelectedPatient(p);
    setEditingMark(p.mark);
    setMarkNote("");
    const fieldMap: Record<number, string> = {};
    for (const f of fieldDefs) fieldMap[f.id] = p.fields[f.name] || "";
    setEditingFields(fieldMap);
  };

  // 一括操作実行
  const handleBulkMarkExec = async () => {
    if (selectedIds.size === 0 || !bulkSelectedMark) return;
    setBulkProcessing(true);
    await fetch("/api/admin/patients/bulk/mark", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ patient_ids: [...selectedIds], mark: bulkSelectedMark }),
    });
    setPatients(prev => prev.map(p => selectedIds.has(p.patient_id) ? { ...p, mark: bulkSelectedMark } : p));
    setSelectedIds(new Set());
    setBulkSelectedMark("");
    setBulkProcessing(false);
  };

  const handleBulkTagExec = async () => {
    if (selectedIds.size === 0 || !bulkSelectedTag) return;
    setBulkProcessing(true);
    await fetch("/api/admin/patients/bulk/tags", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ patient_ids: [...selectedIds], tag_id: bulkSelectedTag, action: bulkTagAction }),
    });
    await fetchData();
    setSelectedIds(new Set());
    setBulkSelectedTag(null);
    setBulkProcessing(false);
  };

  // フィルタリング
  const filtered = patients.filter(p => {
    if (searchName && !p.patient_name?.includes(searchName) && !p.patient_id.includes(searchName)) return false;
    if (filterTag && !p.tags.some(t => t.id === filterTag)) return false;
    if (filterMark && p.mark !== filterMark) return false;
    if (filterLine === "yes" && !p.line_id) return false;
    if (filterLine === "no" && p.line_id) return false;
    return true;
  });

  // フィルタ変更時にページリセット
  useEffect(() => { setPage(0); }, [searchName, filterTag, filterMark, filterLine]);

  // ページネーション
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // 全選択（現在のページ）
  const allPageSelected = paged.length > 0 && paged.every(p => selectedIds.has(p.patient_id));
  const toggleSelectAll = () => {
    const next = new Set(selectedIds);
    if (allPageSelected) {
      for (const p of paged) next.delete(p.patient_id);
    } else {
      for (const p of paged) next.add(p.patient_id);
    }
    setSelectedIds(next);
  };
  const toggleSelect = (pid: string) => {
    const next = new Set(selectedIds);
    if (next.has(pid)) next.delete(pid); else next.add(pid);
    setSelectedIds(next);
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto pb-24">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">友達一覧</h1>
          <p className="text-sm text-gray-500 mt-0.5">LINE連携済みの患者を管理</p>
        </div>
      </div>

      {/* フィルタバー */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              type="text" value={searchName} onChange={(e) => setSearchName(e.target.value)}
              placeholder="氏名 or IDで検索"
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 bg-gray-50"
            />
          </div>
          <select value={filterTag || ""} onChange={(e) => setFilterTag(e.target.value ? Number(e.target.value) : null)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/30">
            <option value="">タグ: 全て</option>
            {allTags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select value={filterMark} onChange={(e) => setFilterMark(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/30">
            <option value="">マーク: 全て</option>
            {markDefs.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <select value={filterLine} onChange={(e) => setFilterLine(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/30">
            <option value="">LINE: 全て</option>
            <option value="yes">連携済み</option>
            <option value="no">未連携</option>
          </select>
          <div className="ml-auto bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg text-xs font-semibold">
            {filtered.length} 人
          </div>
        </div>
      </div>

      {/* テーブル */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-3 py-3.5 w-10">
                    <input
                      type="checkbox"
                      checked={allPageSelected}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500/30"
                    />
                  </th>
                  <th className="px-4 py-3.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider w-14">状態</th>
                  <th className="px-4 py-3.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">患者</th>
                  <th className="px-4 py-3.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">タグ</th>
                  {fieldDefs.slice(0, 3).map(f => (
                    <th key={f.id} className="px-4 py-3.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">{f.name}</th>
                  ))}
                  <th className="px-4 py-3.5 text-center text-[11px] font-semibold text-gray-400 uppercase tracking-wider w-16">LINE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paged.map((p) => {
                  const ms = getMarkStyle(p.mark);
                  return (
                    <tr key={p.patient_id} className={`hover:bg-gray-50/50 cursor-pointer transition-colors ${selectedIds.has(p.patient_id) ? "bg-emerald-50/40" : ""}`} onClick={() => openDetail(p)}>
                      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(p.patient_id)}
                          onChange={() => toggleSelect(p.patient_id)}
                          className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500/30"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="relative" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => { e.stopPropagation(); setOpenMarkDropdown(openMarkDropdown === p.patient_id ? null : p.patient_id); }}
                            className="w-7 h-7 rounded-full ring-2 ring-offset-1 ring-gray-300 transition-transform hover:scale-110"
                            style={{ backgroundColor: ms.hex || "#D1D5DB" }}
                          />
                          {openMarkDropdown === p.patient_id && (
                            <div className="absolute left-0 top-9 bg-white border border-gray-100 rounded-xl shadow-xl p-1.5 z-20 min-w-[120px]">
                              {markDefs.map(m => (
                                <button key={m.value} onClick={() => handleMarkChange(p.patient_id, m.value)} className="flex items-center gap-2 w-full px-2.5 py-1.5 hover:bg-gray-50 rounded-lg text-xs transition-colors">
                                  <span className="w-4 h-4 rounded-full" style={{ backgroundColor: m.value === "none" ? "#D1D5DB" : m.color }} />
                                  <span>{m.label}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 text-sm">{p.patient_name}</div>
                        <div className="text-[11px] text-gray-400 font-mono">{p.patient_id}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {p.tags.map(t => (
                            <span key={t.id} className="px-2 py-0.5 rounded-md text-white text-[10px] font-medium shadow-sm" style={{ backgroundColor: t.color }}>
                              {t.name}
                            </span>
                          ))}
                        </div>
                      </td>
                      {fieldDefs.slice(0, 3).map(f => (
                        <td key={f.id} className="px-4 py-3 text-sm text-gray-500 hidden lg:table-cell">
                          {p.fields[f.name] || <span className="text-gray-300">-</span>}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-center">
                        {p.line_id ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 bg-[#00B900] rounded-full">
                            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-6 h-6 bg-gray-100 rounded-full">
                            <svg className="w-3.5 h-3.5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ページネーション */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 px-4 py-3 border-t border-gray-100 bg-gray-50/50">
              <button onClick={() => setPage(0)} disabled={page === 0}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
              </button>
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <div className="flex items-center gap-1 px-3">
                <span className="text-sm font-medium text-gray-900">{page + 1}</span>
                <span className="text-sm text-gray-400">/</span>
                <span className="text-sm text-gray-400">{totalPages}</span>
              </div>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
              <button onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
              </button>
              <span className="text-xs text-gray-400 ml-2">（全{filtered.length}件）</span>
            </div>
          )}
        </div>
      )}

      {/* 友だち一括操作パネル */}
      {selectedIds.size > 0 && (
        <div className="sticky bottom-0 z-30 bg-slate-800 border-t border-slate-700 shadow-2xl rounded-t-2xl mt-6">
          {/* ヘッダー: 選択数 + 選択解除 */}
          <div className="px-5 py-3 flex items-center gap-3 border-b border-slate-700">
            <span className="text-white text-sm font-bold">友だち一括操作</span>
            <span className="bg-emerald-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{selectedIds.size}人選択中</span>
            <button onClick={() => setSelectedIds(new Set())} className="text-slate-400 hover:text-white text-xs ml-1">
              選択解除
            </button>
            {bulkProcessing && (
              <div className="ml-auto w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
          </div>

          {/* タブ */}
          <div className="flex items-center border-b border-slate-700 px-2">
            <button
              onClick={() => setBulkTab("mark")}
              className={`px-4 py-2.5 text-xs font-medium transition-colors relative ${
                bulkTab === "mark" ? "text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              対応マーク
              {bulkTab === "mark" && <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-emerald-400 rounded-full" />}
            </button>
            <button
              onClick={() => setBulkTab("tag")}
              className={`px-4 py-2.5 text-xs font-medium transition-colors relative ${
                bulkTab === "tag" ? "text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              タグ
              {bulkTab === "tag" && <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-emerald-400 rounded-full" />}
            </button>
          </div>

          {/* タブコンテンツ */}
          <div className="px-5 py-4">
            {bulkTab === "mark" && (
              <div>
                <p className="text-slate-300 text-xs mb-3">チェックした友だちの対応マークを変更</p>
                <div className="flex items-center gap-3">
                  <select
                    value={bulkSelectedMark}
                    onChange={(e) => setBulkSelectedMark(e.target.value)}
                    className="flex-1 max-w-xs px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  >
                    <option value="">マークを選択...</option>
                    {markDefs.map(m => (
                      <option key={m.value} value={m.value}>{m.icon} {m.label}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleBulkMarkExec}
                    disabled={bulkProcessing || !bulkSelectedMark}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    変更
                  </button>
                </div>
              </div>
            )}

            {bulkTab === "tag" && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <button
                    onClick={() => setBulkTagAction("add")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      bulkTagAction === "add" ? "bg-emerald-600 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                    }`}
                  >
                    追加
                  </button>
                  <button
                    onClick={() => setBulkTagAction("remove")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      bulkTagAction === "remove" ? "bg-rose-600 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                    }`}
                  >
                    削除
                  </button>
                  <span className="text-slate-400 text-xs ml-1">
                    チェックした友だちのタグを{bulkTagAction === "add" ? "追加" : "削除"}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={bulkSelectedTag || ""}
                    onChange={(e) => setBulkSelectedTag(e.target.value ? Number(e.target.value) : null)}
                    className="flex-1 max-w-xs px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  >
                    <option value="">タグを選択...</option>
                    {allTags.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleBulkTagExec}
                    disabled={bulkProcessing || !bulkSelectedTag}
                    className={`px-5 py-2 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                      bulkTagAction === "add" ? "bg-emerald-600 hover:bg-emerald-500" : "bg-rose-600 hover:bg-rose-500"
                    }`}
                  >
                    {bulkTagAction === "add" ? "追加" : "削除"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 詳細パネル */}
      {selectedPatient && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedPatient(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* ヘッダー */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-5 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full ring-2 ring-white/30 flex items-center justify-center text-white text-sm font-bold"
                    style={{ backgroundColor: getMarkStyle(selectedPatient.mark).hex || "#D1D5DB" }}
                  >
                    {selectedPatient.patient_name?.charAt(0) || "?"}
                  </div>
                  <div>
                    <h2 className="font-bold text-lg">{selectedPatient.patient_name}</h2>
                    <span className="text-slate-300 text-xs font-mono">{selectedPatient.patient_id}</span>
                  </div>
                </div>
                <button onClick={() => setSelectedPatient(null)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>

            <div className="overflow-y-auto max-h-[calc(85vh-120px)] p-6 space-y-5">
              {/* 対応マーク */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">対応マーク</label>
                <div className="flex gap-2 flex-wrap">
                  {markDefs.map(m => (
                    <button key={m.value} onClick={() => setEditingMark(m.value)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border-2 transition-all ${editingMark === m.value ? "border-gray-400 shadow-sm scale-105" : "border-gray-100 hover:border-gray-200"}`}
                    >
                      <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: m.value === "none" ? "#D1D5DB" : m.color }} />
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* タグ */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">タグ</label>
                <div className="flex flex-wrap gap-2">
                  {allTags.map(tag => {
                    const hasTag = selectedPatient.tags.some(t => t.id === tag.id);
                    return (
                      <button key={tag.id} onClick={() => handleToggleTag(selectedPatient.patient_id, tag.id, hasTag)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${hasTag ? "text-white shadow-sm scale-105" : "text-gray-500 bg-white border-gray-200 hover:border-gray-300"}`}
                        style={hasTag ? { backgroundColor: tag.color, borderColor: tag.color } : {}}
                      >
                        {hasTag && <span className="mr-1">&#x2713;</span>}{tag.name}
                      </button>
                    );
                  })}
                  {allTags.length === 0 && <p className="text-xs text-gray-400">タグ管理から先にタグを作成してください</p>}
                </div>
              </div>

              {/* 友達情報欄 */}
              {fieldDefs.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">友達情報</label>
                  <div className="bg-gray-50 rounded-xl p-3 space-y-2.5">
                    {fieldDefs.map(f => (
                      <div key={f.id} className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 w-24 flex-shrink-0 font-medium">{f.name}</span>
                        {f.field_type === "select" ? (
                          <select value={editingFields[f.id] || ""} onChange={(e) => setEditingFields(prev => ({ ...prev, [f.id]: e.target.value }))}
                            className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30">
                            <option value="">--</option>
                            {f.options?.map((o: string) => <option key={o} value={o}>{o}</option>)}
                          </select>
                        ) : (
                          <input type={f.field_type === "number" ? "number" : f.field_type === "date" ? "date" : "text"}
                            value={editingFields[f.id] || ""} onChange={(e) => setEditingFields(prev => ({ ...prev, [f.id]: e.target.value }))}
                            className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* メモ */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">対応メモ</label>
                <textarea value={markNote} onChange={(e) => setMarkNote(e.target.value)} placeholder="対応に関するメモ"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm h-20 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:bg-white" />
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={handleSaveFields} disabled={savingFields}
                  className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl font-medium text-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm">
                  {savingFields ? "保存中..." : "保存する"}
                </button>
                <button onClick={() => setSelectedPatient(null)}
                  className="px-6 py-2.5 bg-gray-100 text-gray-600 rounded-xl font-medium text-sm hover:bg-gray-200 transition-colors">
                  閉じる
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
