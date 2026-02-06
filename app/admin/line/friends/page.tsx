"use client";

import { useState, useEffect, useCallback } from "react";

interface Tag {
  id: number;
  name: string;
  color: string;
}

interface PatientRow {
  patient_id: string;
  patient_name: string;
  line_id: string | null;
  mark: string;
  tags: Tag[];
  fields: Record<string, string>;
}

interface FieldDef {
  id: number;
  name: string;
  field_type: string;
}

interface FollowerStats {
  followers: number;
  targetedReaches: number;
  blocks: number;
}

const MARK_COLORS: Record<string, { emoji: string; label: string; bg: string }> = {
  none: { emoji: "\u26AA", label: "未設定", bg: "bg-gray-100" },
  red: { emoji: "\uD83D\uDD34", label: "要対応", bg: "bg-red-100" },
  yellow: { emoji: "\uD83D\uDFE1", label: "対応中", bg: "bg-yellow-100" },
  green: { emoji: "\uD83D\uDFE2", label: "対応済み", bg: "bg-green-100" },
  blue: { emoji: "\uD83D\uDD35", label: "重要", bg: "bg-blue-100" },
  gray: { emoji: "\u26AB", label: "保留", bg: "bg-gray-200" },
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

  const fetchData = useCallback(async () => {
    setLoading(true);

    // 並列でデータ取得
    const [patientsRes, tagsRes, fieldsRes, followersRes] = await Promise.all([
      fetch("/api/admin/line/friends-list", { credentials: "include" }),
      fetch("/api/admin/tags", { credentials: "include" }),
      fetch("/api/admin/friend-fields", { credentials: "include" }),
      fetch("/api/admin/line/followers", { credentials: "include" }).catch(() => null),
    ]);

    const patientsData = await patientsRes.json();
    const tagsData = await tagsRes.json();
    const fieldsData = await fieldsRes.json();

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

  const handleMarkChange = async (patientId: string, mark: string) => {
    await fetch(`/api/admin/patients/${patientId}/mark`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ mark }),
    });
    setPatients(prev => prev.map(p => p.patient_id === patientId ? { ...p, mark } : p));
  };

  const handleToggleTag = async (patientId: string, tagId: number, hasTag: boolean) => {
    if (hasTag) {
      await fetch(`/api/admin/patients/${patientId}/tags?tag_id=${tagId}`, {
        method: "DELETE",
        credentials: "include",
      });
    } else {
      await fetch(`/api/admin/patients/${patientId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ tag_id: tagId }),
      });
    }
    await fetchData();
  };

  const handleSaveFields = async () => {
    if (!selectedPatient || savingFields) return;
    setSavingFields(true);

    const values = Object.entries(editingFields).map(([fieldId, value]) => ({
      field_id: Number(fieldId),
      value,
    }));

    await fetch(`/api/admin/patients/${selectedPatient.patient_id}/fields`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ values }),
    });

    // マーク更新
    if (editingMark !== selectedPatient.mark) {
      await fetch(`/api/admin/patients/${selectedPatient.patient_id}/mark`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
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
    for (const f of fieldDefs) {
      fieldMap[f.id] = p.fields[f.name] || "";
    }
    setEditingFields(fieldMap);
  };

  // フィルタ適用
  const filtered = patients.filter(p => {
    if (searchName && !p.patient_name?.includes(searchName) && !p.patient_id.includes(searchName)) return false;
    if (filterTag && !p.tags.some(t => t.id === filterTag)) return false;
    if (filterMark && p.mark !== filterMark) return false;
    if (filterLine === "yes" && !p.line_id) return false;
    if (filterLine === "no" && p.line_id) return false;
    return true;
  });

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-2xl font-bold mb-4">友達一覧</h1>

      {/* フォロワー統計 */}
      {followerStats && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white border rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{followerStats.followers.toLocaleString()}</div>
            <div className="text-xs text-gray-500 mt-1">友達数</div>
          </div>
          <div className="bg-white border rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{followerStats.targetedReaches.toLocaleString()}</div>
            <div className="text-xs text-gray-500 mt-1">ターゲットリーチ</div>
          </div>
          <div className="bg-white border rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{followerStats.blocks.toLocaleString()}</div>
            <div className="text-xs text-gray-500 mt-1">ブロック</div>
          </div>
        </div>
      )}

      {/* フィルタバー */}
      <div className="bg-white border rounded-lg p-3 mb-4 flex flex-wrap gap-3 items-center">
        <input
          type="text"
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
          placeholder="氏名 or ID"
          className="px-3 py-1.5 border rounded text-sm w-40 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <select
          value={filterTag || ""}
          onChange={(e) => setFilterTag(e.target.value ? Number(e.target.value) : null)}
          className="px-3 py-1.5 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">タグ: 全て</option>
          {allTags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select
          value={filterMark}
          onChange={(e) => setFilterMark(e.target.value)}
          className="px-3 py-1.5 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">対応マーク: 全て</option>
          {Object.entries(MARK_COLORS).map(([k, v]) => (
            <option key={k} value={k}>{v.emoji} {v.label}</option>
          ))}
        </select>
        <select
          value={filterLine}
          onChange={(e) => setFilterLine(e.target.value)}
          className="px-3 py-1.5 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">LINE: 全て</option>
          <option value="yes">LINE有り</option>
          <option value="no">LINE無し</option>
        </select>
        <span className="text-xs text-gray-400 ml-auto">{filtered.length}人</span>
      </div>

      {/* テーブル */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">読み込み中...</div>
      ) : (
        <div className="bg-white border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-3 py-3 text-left w-12">対応</th>
                <th className="px-3 py-3 text-left">患者名</th>
                <th className="px-3 py-3 text-left">タグ</th>
                {fieldDefs.slice(0, 3).map(f => (
                  <th key={f.id} className="px-3 py-3 text-left hidden md:table-cell">{f.name}</th>
                ))}
                <th className="px-3 py-3 text-center w-16">LINE</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 100).map((p) => (
                <tr key={p.patient_id} className="border-b last:border-0 hover:bg-gray-50 cursor-pointer" onClick={() => openDetail(p)}>
                  <td className="px-3 py-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); }}
                      className="relative group"
                    >
                      <span className="text-lg">{MARK_COLORS[p.mark]?.emoji || "\u26AA"}</span>
                      <div className="hidden group-hover:block absolute left-0 top-8 bg-white border rounded shadow-lg p-1 z-10">
                        {Object.entries(MARK_COLORS).map(([k, v]) => (
                          <button
                            key={k}
                            onClick={(e) => { e.stopPropagation(); handleMarkChange(p.patient_id, k); }}
                            className="block w-full text-left px-2 py-1 hover:bg-gray-100 text-xs whitespace-nowrap"
                          >
                            {v.emoji} {v.label}
                          </button>
                        ))}
                      </div>
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium">{p.patient_name}</div>
                    <div className="text-xs text-gray-400">{p.patient_id}</div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {p.tags.map(t => (
                        <span key={t.id} className="px-2 py-0.5 rounded-full text-white text-[10px]" style={{ backgroundColor: t.color }}>
                          {t.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  {fieldDefs.slice(0, 3).map(f => (
                    <td key={f.id} className="px-3 py-2 text-gray-600 hidden md:table-cell">
                      {p.fields[f.name] || "-"}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-center">
                    {p.line_id ? (
                      <span className="text-green-600 font-bold">&#x2713;</span>
                    ) : (
                      <span className="text-gray-300">&#x2717;</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length > 100 && (
            <div className="px-4 py-3 text-center text-xs text-gray-400 border-t">
              先頭100件を表示（全{filtered.length}件）
            </div>
          )}
        </div>
      )}

      {/* 詳細パネル（モーダル） */}
      {selectedPatient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedPatient(null)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <div>
                <h2 className="font-bold text-lg">{selectedPatient.patient_name}</h2>
                <span className="text-xs text-gray-400">{selectedPatient.patient_id}</span>
              </div>
              <button onClick={() => setSelectedPatient(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* 対応マーク */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">対応マーク</label>
                <div className="flex gap-2">
                  {Object.entries(MARK_COLORS).map(([k, v]) => (
                    <button
                      key={k}
                      onClick={() => setEditingMark(k)}
                      className={`px-3 py-1.5 rounded text-sm border ${editingMark === k ? "ring-2 ring-blue-500 border-blue-500" : "border-gray-200"} ${v.bg}`}
                    >
                      {v.emoji} {v.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* タグ */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">タグ</label>
                <div className="flex flex-wrap gap-2">
                  {allTags.map(tag => {
                    const hasTag = selectedPatient.tags.some(t => t.id === tag.id);
                    return (
                      <button
                        key={tag.id}
                        onClick={() => handleToggleTag(selectedPatient.patient_id, tag.id, hasTag)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border ${hasTag ? "text-white" : "text-gray-600 bg-white"}`}
                        style={hasTag ? { backgroundColor: tag.color, borderColor: tag.color } : {}}
                      >
                        {hasTag ? "\u2713 " : ""}{tag.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 友達情報欄 */}
              {fieldDefs.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">友達情報</label>
                  <div className="space-y-2">
                    {fieldDefs.map(f => (
                      <div key={f.id} className="flex items-center gap-3">
                        <span className="text-sm text-gray-600 w-24 flex-shrink-0">{f.name}</span>
                        {f.field_type === "select" ? (
                          <select
                            value={editingFields[f.id] || ""}
                            onChange={(e) => setEditingFields(prev => ({ ...prev, [f.id]: e.target.value }))}
                            className="flex-1 px-3 py-1.5 border rounded text-sm"
                          >
                            <option value="">--</option>
                            {(f as any).options?.map((o: string) => <option key={o} value={o}>{o}</option>)}
                          </select>
                        ) : (
                          <input
                            type={f.field_type === "number" ? "number" : f.field_type === "date" ? "date" : "text"}
                            value={editingFields[f.id] || ""}
                            onChange={(e) => setEditingFields(prev => ({ ...prev, [f.id]: e.target.value }))}
                            className="flex-1 px-3 py-1.5 border rounded text-sm"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* メモ */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">対応メモ</label>
                <textarea
                  value={markNote}
                  onChange={(e) => setMarkNote(e.target.value)}
                  placeholder="対応に関するメモ"
                  className="w-full px-3 py-2 border rounded text-sm h-20"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleSaveFields}
                  disabled={savingFields}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
                >
                  {savingFields ? "保存中..." : "保存"}
                </button>
                <button onClick={() => setSelectedPatient(null)} className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm">
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
