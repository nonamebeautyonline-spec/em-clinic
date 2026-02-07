"use client";

import { useState, useEffect, useCallback } from "react";

interface Folder {
  id: number;
  name: string;
  action_count: number;
}

interface ActionStep {
  type: "send_text" | "send_template" | "tag_add" | "tag_remove" | "mark_change";
  content?: string;
  template_id?: number;
  template_name?: string;
  tag_id?: number;
  tag_name?: string;
  mark?: string;
  note?: string;
}

interface Action {
  id: number;
  name: string;
  folder_id: number | null;
  steps: ActionStep[];
  repeat_enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface TagDef {
  id: number;
  name: string;
  color: string;
}

interface Template {
  id: number;
  name: string;
  content: string;
}

interface MarkDef {
  id: number;
  value: string;
  label: string;
  color: string;
}

const STEP_TYPES = [
  { type: "send_text", label: "テキスト送信" },
  { type: "send_template", label: "テンプレート送信" },
  { type: "tag_add", label: "タグ追加" },
  { type: "tag_remove", label: "タグ削除" },
  { type: "mark_change", label: "対応マーク変更" },
] as const;

export default function ActionsPage() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // モーダル
  const [showModal, setShowModal] = useState(false);
  const [editingAction, setEditingAction] = useState<Action | null>(null);
  const [actionName, setActionName] = useState("");
  const [actionFolderId, setActionFolderId] = useState<number | null>(null);
  const [actionSteps, setActionSteps] = useState<ActionStep[]>([]);
  const [repeatEnabled, setRepeatEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  // フォルダ
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [editingFolder, setEditingFolder] = useState<number | null>(null);
  const [editFolderName, setEditFolderName] = useState("");

  // タグ・テンプレート・マーク一覧
  const [allTags, setAllTags] = useState<TagDef[]>([]);
  const [allTemplates, setAllTemplates] = useState<Template[]>([]);
  const [allMarks, setAllMarks] = useState<MarkDef[]>([]);

  const fetchFolders = useCallback(async () => {
    const res = await fetch("/api/admin/line/action-folders", { credentials: "include" });
    const data = await res.json();
    if (data.folders) setFolders(data.folders);
  }, []);

  const fetchActions = useCallback(async () => {
    const url = selectedFolder
      ? `/api/admin/line/actions?folder_id=${selectedFolder}`
      : "/api/admin/line/actions";
    const res = await fetch(url, { credentials: "include" });
    const data = await res.json();
    if (data.actions) setActions(data.actions);
  }, [selectedFolder]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchFolders(),
      fetch("/api/admin/tags", { credentials: "include" }).then(r => r.json()),
      fetch("/api/admin/line/templates", { credentials: "include" }).then(r => r.json()),
      fetch("/api/admin/line/marks", { credentials: "include" }).then(r => r.json()),
    ]).then(([, tagsData, tmplData, marksData]) => {
      if (tagsData.tags) setAllTags(tagsData.tags);
      if (tmplData.templates) setAllTemplates(tmplData.templates);
      if (marksData.marks) setAllMarks(marksData.marks);
      setLoading(false);
    });
  }, [fetchFolders]);

  useEffect(() => {
    fetchActions();
  }, [fetchActions]);

  // フォルダ操作
  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    await fetch("/api/admin/line/action-folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name: newFolderName }),
    });
    setNewFolderName("");
    setShowNewFolder(false);
    fetchFolders();
  };

  const renameFolder = async (id: number) => {
    if (!editFolderName.trim()) return;
    await fetch("/api/admin/line/action-folders", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id, name: editFolderName }),
    });
    setEditingFolder(null);
    fetchFolders();
  };

  const deleteFolder = async (id: number) => {
    if (!confirm("フォルダを削除しますか？中のアクションは未分類に移動されます。")) return;
    await fetch(`/api/admin/line/action-folders?id=${id}`, { method: "DELETE", credentials: "include" });
    if (selectedFolder === id) setSelectedFolder(null);
    fetchFolders();
    fetchActions();
  };

  // アクション操作
  const openNewAction = () => {
    setEditingAction(null);
    setActionName("");
    setActionFolderId(selectedFolder);
    setActionSteps([]);
    setRepeatEnabled(true);
    setShowModal(true);
  };

  const openEditAction = (a: Action) => {
    setEditingAction(a);
    setActionName(a.name);
    setActionFolderId(a.folder_id);
    setActionSteps([...a.steps]);
    setRepeatEnabled(a.repeat_enabled);
    setShowModal(true);
  };

  const saveAction = async () => {
    if (!actionName.trim() || actionSteps.length === 0) return;
    setSaving(true);
    const body = {
      id: editingAction?.id,
      name: actionName,
      folder_id: actionFolderId,
      steps: actionSteps,
      repeat_enabled: repeatEnabled,
    };
    await fetch("/api/admin/line/actions", {
      method: editingAction ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
    setSaving(false);
    setShowModal(false);
    fetchActions();
    fetchFolders();
  };

  const deleteAction = async (id: number) => {
    if (!confirm("このアクションを削除しますか？")) return;
    await fetch(`/api/admin/line/actions?id=${id}`, { method: "DELETE", credentials: "include" });
    fetchActions();
    fetchFolders();
  };

  // ステップ操作
  const addStep = (type: ActionStep["type"]) => {
    const step: ActionStep = { type };
    if (type === "send_text") step.content = "";
    if (type === "mark_change") step.mark = "none";
    setActionSteps(prev => [...prev, step]);
  };

  const updateStep = (index: number, updates: Partial<ActionStep>) => {
    setActionSteps(prev => prev.map((s, i) => i === index ? { ...s, ...updates } : s));
  };

  const removeStep = (index: number) => {
    setActionSteps(prev => prev.filter((_, i) => i !== index));
  };

  const formatStepSummary = (step: ActionStep): string => {
    switch (step.type) {
      case "send_text": return `テキスト送信: ${step.content?.slice(0, 30) || "（空）"}${(step.content?.length || 0) > 30 ? "…" : ""}`;
      case "send_template": return `テンプレート送信: ${step.template_name || `ID:${step.template_id}`}`;
      case "tag_add": return `タグ[${step.tag_name || `ID:${step.tag_id}`}]を追加`;
      case "tag_remove": return `タグ[${step.tag_name || `ID:${step.tag_id}`}]を解除`;
      case "mark_change": return `対応マークを「${allMarks.find(m => m.value === step.mark)?.label || step.mark}」に変更`;
      default: return "不明な動作";
    }
  };

  // フィルタ
  const filteredActions = actions.filter(a =>
    !search || a.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalActions = folders.reduce((sum, f) => sum + f.action_count, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-[#00B900] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">アクション管理</h1>
          <p className="text-sm text-gray-400 mt-1">友だちリストから実行できるアクションを登録できます。</p>
        </div>
      </div>

      {/* ボタン行 */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => setShowNewFolder(true)}
          className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
          新しいフォルダ
        </button>
        <button
          onClick={openNewAction}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#00B900] text-white rounded-lg text-sm font-medium hover:bg-[#009900] transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
          新しいアクション
        </button>
        <div className="ml-auto flex items-center gap-3">
          <div className="relative">
            <svg className="w-4 h-4 text-gray-300 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="検索"
              className="w-48 pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00B900]/20 focus:border-[#00B900]"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        {/* フォルダサイドバー */}
        <div className="w-56 flex-shrink-0">
          <button
            onClick={() => setSelectedFolder(null)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-1 transition-colors flex items-center justify-between ${selectedFolder === null ? "bg-[#00B900]/10 text-[#00B900] font-medium" : "text-gray-600 hover:bg-gray-50"}`}
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
              すべて
            </span>
            <span className="text-xs text-gray-400">{totalActions}</span>
          </button>

          {folders.map(folder => (
            <div key={folder.id} className="group relative">
              {editingFolder === folder.id ? (
                <div className="flex items-center gap-1 px-2 py-1">
                  <input
                    type="text"
                    value={editFolderName}
                    onChange={e => setEditFolderName(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") renameFolder(folder.id); if (e.key === "Escape") setEditingFolder(null); }}
                    className="flex-1 px-2 py-1 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#00B900]"
                    autoFocus
                  />
                  <button onClick={() => renameFolder(folder.id)} className="text-[#00B900] text-xs font-medium">保存</button>
                </div>
              ) : (
                <button
                  onClick={() => setSelectedFolder(folder.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-1 transition-colors flex items-center justify-between ${selectedFolder === folder.id ? "bg-[#00B900]/10 text-[#00B900] font-medium" : "text-gray-600 hover:bg-gray-50"}`}
                >
                  <span className="flex items-center gap-2 truncate">
                    <svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                    <span className="truncate">{folder.name}</span>
                  </span>
                  <span className="text-xs text-gray-400 flex-shrink-0">({folder.action_count})</span>
                </button>
              )}
              {editingFolder !== folder.id && folder.name !== "未分類" && (
                <div className="absolute right-1 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-0.5">
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditingFolder(folder.id); setEditFolderName(folder.name); }}
                    className="p-1 text-gray-300 hover:text-gray-500 transition-colors"
                    title="名前変更"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteFolder(folder.id); }}
                    className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                    title="削除"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              )}
            </div>
          ))}

          {showNewFolder && (
            <div className="flex items-center gap-1 px-2 py-1 mt-1">
              <input
                type="text"
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") createFolder(); if (e.key === "Escape") setShowNewFolder(false); }}
                placeholder="フォルダ名"
                className="flex-1 px-2 py-1 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#00B900]"
                autoFocus
              />
              <button onClick={createFolder} className="text-[#00B900] text-xs font-medium">作成</button>
              <button onClick={() => setShowNewFolder(false)} className="text-gray-400 text-xs">×</button>
            </div>
          )}
        </div>

        {/* アクション一覧 */}
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* ヘッダー */}
            <div className="grid grid-cols-[1fr_120px_48px] items-center px-5 py-3 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500">
              <span>アクション名</span>
              <span>登録日</span>
              <span></span>
            </div>

            {filteredActions.length === 0 ? (
              <div className="text-center py-16 text-gray-300 text-sm">
                {search ? "該当するアクションなし" : "アクションがまだありません"}
              </div>
            ) : (
              filteredActions.map(a => (
                <div
                  key={a.id}
                  className="grid grid-cols-[1fr_120px_48px] items-start px-5 py-4 border-b border-gray-100 hover:bg-gray-50/50 transition-colors group"
                >
                  <div>
                    <button
                      onClick={() => openEditAction(a)}
                      className="text-sm font-medium text-[#00B900] hover:underline text-left"
                    >
                      {a.name}
                    </button>
                    <div className="mt-1 space-y-0.5">
                      {a.steps.map((step, i) => (
                        <p key={i} className="text-[11px] text-gray-400 leading-relaxed">
                          {formatStepSummary(step)}
                        </p>
                      ))}
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 pt-0.5">{a.created_at?.slice(0, 10)}</span>
                  <div className="flex items-center gap-1 pt-0.5">
                    <button
                      onClick={() => deleteAction(a.id)}
                      className="p-1 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                      title="削除"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* アクション作成/編集モーダル */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800">アクション設定</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* アクション名 + フォルダ */}
              <div className="grid grid-cols-[1fr_200px] gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">
                    保存するアクション名 <span className="text-red-500 text-[10px] px-1 py-0.5 bg-red-50 rounded">必須</span>
                  </label>
                  <input
                    type="text"
                    value={actionName}
                    onChange={e => setActionName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00B900]/20 focus:border-[#00B900]"
                    placeholder="アクション名を入力"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">フォルダ</label>
                  <select
                    value={actionFolderId || ""}
                    onChange={e => setActionFolderId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00B900]/20 focus:border-[#00B900]"
                  >
                    <option value="">未分類</option>
                    {folders.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 動作選択ボタン */}
              <div>
                <p className="text-xs text-gray-500 mb-2 text-center">行う動作を選択してください</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {STEP_TYPES.map(st => (
                    <button
                      key={st.type}
                      onClick={() => addStep(st.type)}
                      className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ステップ一覧 */}
              {actionSteps.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-medium text-gray-500">設定済みの動作 ({actionSteps.length})</p>
                  {actionSteps.map((step, i) => (
                    <div key={i} className="border border-gray-200 rounded-lg p-4 relative">
                      <button
                        onClick={() => removeStep(i)}
                        className="absolute top-2 right-2 text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>

                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        {STEP_TYPES.find(s => s.type === step.type)?.label}
                      </span>

                      <div className="mt-2">
                        {step.type === "send_text" && (
                          <textarea
                            value={step.content || ""}
                            onChange={e => updateStep(i, { content: e.target.value })}
                            placeholder="送信テキストを入力（{name}で名前、{patient_id}でIDを挿入）"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00B900]/20 resize-none"
                            rows={3}
                          />
                        )}

                        {step.type === "send_template" && (
                          <select
                            value={step.template_id || ""}
                            onChange={e => {
                              const tmpl = allTemplates.find(t => t.id === Number(e.target.value));
                              updateStep(i, { template_id: Number(e.target.value), template_name: tmpl?.name });
                            }}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00B900]/20"
                          >
                            <option value="">テンプレートを選択</option>
                            {allTemplates.map(t => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </select>
                        )}

                        {(step.type === "tag_add" || step.type === "tag_remove") && (
                          <select
                            value={step.tag_id || ""}
                            onChange={e => {
                              const tag = allTags.find(t => t.id === Number(e.target.value));
                              updateStep(i, { tag_id: Number(e.target.value), tag_name: tag?.name });
                            }}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00B900]/20"
                          >
                            <option value="">タグを選択</option>
                            {allTags.map(t => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </select>
                        )}

                        {step.type === "mark_change" && (
                          <select
                            value={step.mark || "none"}
                            onChange={e => updateStep(i, { mark: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00B900]/20"
                          >
                            {allMarks.map(m => (
                              <option key={m.value} value={m.value}>{m.label}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 繰り返し設定 */}
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={repeatEnabled}
                  onChange={e => setRepeatEnabled(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-[#00B900] focus:ring-[#00B900]"
                />
                発動2回目以降も各動作を実行する
              </label>
            </div>

            {/* フッター */}
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
              <button
                onClick={saveAction}
                disabled={saving || !actionName.trim() || actionSteps.length === 0}
                className="px-6 py-2.5 bg-[#00B900] text-white rounded-lg text-sm font-medium hover:bg-[#009900] transition-colors disabled:opacity-40 shadow-sm"
              >
                {saving ? "保存中..." : "この条件で決定する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
