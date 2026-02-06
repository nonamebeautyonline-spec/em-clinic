"use client";

import { useState, useEffect, useCallback } from "react";

interface Tag { id: number; name: string; color: string; }
interface PatientRow { patient_id: string; patient_name: string; line_id: string | null; mark: string; tags: Tag[]; fields: Record<string, string>; }
interface FieldDef { id: number; name: string; field_type: string; options?: string[]; }
interface FollowerStats { followers: number; targetedReaches: number; blocks: number; }

const MARKS: Record<string, { color: string; label: string; ring: string }> = {
  none: { color: "bg-gray-200", label: "未設定", ring: "ring-gray-300" },
  red: { color: "bg-red-500", label: "要対応", ring: "ring-red-400" },
  yellow: { color: "bg-amber-400", label: "対応中", ring: "ring-amber-400" },
  green: { color: "bg-emerald-500", label: "対応済み", ring: "ring-emerald-400" },
  blue: { color: "bg-blue-500", label: "重要", ring: "ring-blue-400" },
  gray: { color: "bg-slate-400", label: "保留", ring: "ring-slate-400" },
};

export default function FriendsListPage() {
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [fieldDefs, setFieldDefs] = useState<FieldDef[]>([]);
  const [followerStats, setFollowerStats] = useState<FollowerStats | null>(null);
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

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [patientsRes, tagsRes, fieldsRes, followersRes] = await Promise.all([
      fetch("/api/admin/line/friends-list", { credentials: "include" }),
      fetch("/api/admin/tags", { credentials: "include" }),
      fetch("/api/admin/friend-fields", { credentials: "include" }),
      fetch("/api/admin/line/followers", { credentials: "include" }).catch(() => null),
    ]);
    const [patientsData, tagsData, fieldsData] = await Promise.all([patientsRes.json(), tagsRes.json(), fieldsRes.json()]);
    if (patientsData.patients) setPatients(patientsData.patients);
    if (tagsData.tags) setAllTags(tagsData.tags);
    if (fieldsData.fields) setFieldDefs(fieldsData.fields);
    if (followersRes?.ok) {
      const fData = await followersRes.json();
      if (fData.followers !== undefined) setFollowerStats(fData);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    const close = () => setOpenMarkDropdown(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

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

  const filtered = patients.filter(p => {
    if (searchName && !p.patient_name?.includes(searchName) && !p.patient_id.includes(searchName)) return false;
    if (filterTag && !p.tags.some(t => t.id === filterTag)) return false;
    if (filterMark && p.mark !== filterMark) return false;
    if (filterLine === "yes" && !p.line_id) return false;
    if (filterLine === "no" && p.line_id) return false;
    return true;
  });

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">友達一覧</h1>
          <p className="text-sm text-gray-500 mt-0.5">LINE連携済みの患者を管理</p>
        </div>
      </div>

      {/* フォロワー統計カード */}
      {followerStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-5 text-white shadow-lg shadow-emerald-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-xs font-medium uppercase tracking-wider">友達数</p>
                <p className="text-3xl font-bold mt-1">{followerStats.followers.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white shadow-lg shadow-blue-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-xs font-medium uppercase tracking-wider">ターゲットリーチ</p>
                <p className="text-3xl font-bold mt-1">{followerStats.targetedReaches.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-rose-500 to-rose-600 rounded-2xl p-5 text-white shadow-lg shadow-rose-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-rose-100 text-xs font-medium uppercase tracking-wider">ブロック</p>
                <p className="text-3xl font-bold mt-1">{followerStats.blocks.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM4 12c0-4.42 3.58-8 8-8 1.85 0 3.55.63 4.9 1.69L5.69 16.9C4.63 15.55 4 13.85 4 12zm8 8c-1.85 0-3.55-.63-4.9-1.69L18.31 7.1C19.37 8.45 20 10.15 20 12c0 4.42-3.58 8-8 8z"/></svg>
              </div>
            </div>
          </div>
        </div>
      )}

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
            {Object.entries(MARKS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
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
                {filtered.slice(0, 100).map((p) => (
                  <tr key={p.patient_id} className="hover:bg-gray-50/50 cursor-pointer transition-colors" onClick={() => openDetail(p)}>
                    <td className="px-4 py-3">
                      <div className="relative" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => { e.stopPropagation(); setOpenMarkDropdown(openMarkDropdown === p.patient_id ? null : p.patient_id); }}
                          className={`w-7 h-7 rounded-full ${MARKS[p.mark]?.color || "bg-gray-200"} ring-2 ring-offset-1 ${MARKS[p.mark]?.ring || "ring-gray-300"} transition-transform hover:scale-110`}
                        />
                        {openMarkDropdown === p.patient_id && (
                          <div className="absolute left-0 top-9 bg-white border border-gray-100 rounded-xl shadow-xl p-1.5 z-20 min-w-[120px]">
                            {Object.entries(MARKS).map(([k, v]) => (
                              <button key={k} onClick={() => handleMarkChange(p.patient_id, k)} className="flex items-center gap-2 w-full px-2.5 py-1.5 hover:bg-gray-50 rounded-lg text-xs transition-colors">
                                <span className={`w-4 h-4 rounded-full ${v.color}`} />
                                <span>{v.label}</span>
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
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length > 100 && (
            <div className="px-4 py-3 text-center text-xs text-gray-400 border-t border-gray-50 bg-gray-50/50">
              先頭100件を表示（全{filtered.length}件）
            </div>
          )}
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
                  <div className={`w-10 h-10 rounded-full ${MARKS[selectedPatient.mark]?.color} ring-2 ring-white/30 flex items-center justify-center text-white text-sm font-bold`}>
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
                  {Object.entries(MARKS).map(([k, v]) => (
                    <button key={k} onClick={() => setEditingMark(k)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border-2 transition-all ${editingMark === k ? `${v.ring} border-current shadow-sm scale-105` : "border-gray-100 hover:border-gray-200"}`}
                    >
                      <span className={`w-3.5 h-3.5 rounded-full ${v.color}`} />
                      {v.label}
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
