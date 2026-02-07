"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Folder {
  id: number;
  name: string;
  form_count: number;
}

interface Form {
  id: number;
  name: string;
  folder_id: number | null;
  slug: string;
  title: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export default function FormsPage() {
  const router = useRouter();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [forms, setForms] = useState<Form[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // フォルダ
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [editingFolder, setEditingFolder] = useState<number | null>(null);
  const [editFolderName, setEditFolderName] = useState("");

  // 新規フォーム
  const [showNewForm, setShowNewForm] = useState(false);
  const [newFormName, setNewFormName] = useState("");

  const fetchFolders = useCallback(async () => {
    const res = await fetch("/api/admin/line/form-folders", { credentials: "include" });
    const data = await res.json();
    if (data.folders) setFolders(data.folders);
  }, []);

  const fetchForms = useCallback(async () => {
    const url = selectedFolder
      ? `/api/admin/line/forms?folder_id=${selectedFolder}`
      : "/api/admin/line/forms";
    const res = await fetch(url, { credentials: "include" });
    const data = await res.json();
    if (data.forms) setForms(data.forms);
  }, [selectedFolder]);

  useEffect(() => {
    setLoading(true);
    fetchFolders().then(() => setLoading(false));
  }, [fetchFolders]);

  useEffect(() => {
    fetchForms();
  }, [fetchForms]);

  // フォルダ操作
  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    await fetch("/api/admin/line/form-folders", {
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
    await fetch("/api/admin/line/form-folders", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id, name: editFolderName }),
    });
    setEditingFolder(null);
    fetchFolders();
  };

  const deleteFolder = async (id: number) => {
    if (!confirm("フォルダを削除しますか？中のフォームは未分類に移動されます。")) return;
    await fetch(`/api/admin/line/form-folders?id=${id}`, { method: "DELETE", credentials: "include" });
    if (selectedFolder === id) setSelectedFolder(null);
    fetchFolders();
    fetchForms();
  };

  // フォーム作成
  const createForm = async () => {
    if (!newFormName.trim()) return;
    const res = await fetch("/api/admin/line/forms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name: newFormName, folder_id: selectedFolder }),
    });
    const data = await res.json();
    setShowNewForm(false);
    setNewFormName("");
    if (data.form?.id) {
      router.push(`/admin/line/forms/${data.form.id}`);
    } else {
      fetchForms();
      fetchFolders();
    }
  };

  const deleteForm = async (id: number) => {
    if (!confirm("このフォームを削除しますか？回答データも削除されます。")) return;
    await fetch(`/api/admin/line/forms/${id}`, { method: "DELETE", credentials: "include" });
    fetchForms();
    fetchFolders();
  };

  const filteredForms = forms.filter(f =>
    !search || f.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalForms = folders.reduce((sum, f) => sum + f.form_count, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-[#00B900] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">回答フォーム</h1>
          <p className="text-sm text-gray-400 mt-1">フォームを作成して、LINEユーザーから情報を収集できます。</p>
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
          onClick={() => setShowNewForm(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#00B900] text-white rounded-lg text-sm font-medium hover:bg-[#009900] transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
          新しいフォーム
        </button>
        <div className="ml-auto">
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
            <span className="text-xs text-gray-400">{totalForms}</span>
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
                  <span className="text-xs text-gray-400 flex-shrink-0">({folder.form_count})</span>
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

        {/* フォーム一覧 */}
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="grid grid-cols-[1fr_80px_120px_48px] items-center px-5 py-3 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500">
              <span>フォーム名</span>
              <span>状態</span>
              <span>登録日</span>
              <span></span>
            </div>

            {filteredForms.length === 0 ? (
              <div className="text-center py-16 text-gray-300 text-sm">
                {search ? "該当するフォームなし" : "フォームがまだありません"}
              </div>
            ) : (
              filteredForms.map(f => (
                <div
                  key={f.id}
                  className="grid grid-cols-[1fr_80px_120px_48px] items-center px-5 py-4 border-b border-gray-100 hover:bg-gray-50/50 transition-colors group"
                >
                  <button
                    onClick={() => router.push(`/admin/line/forms/${f.id}`)}
                    className="text-sm font-medium text-[#00B900] hover:underline text-left truncate"
                  >
                    {f.name}
                  </button>
                  <span className={`text-xs px-2 py-0.5 rounded-full inline-block w-fit ${f.is_published ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-400"}`}>
                    {f.is_published ? "公開" : "非公開"}
                  </span>
                  <span className="text-xs text-gray-400">{f.created_at?.slice(0, 10)}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => deleteForm(f.id)}
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

      {/* 新規フォーム作成モーダル */}
      {showNewForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={() => setShowNewForm(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800">新しいフォームを作成</h2>
              <button onClick={() => setShowNewForm(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-6 py-5">
              <label className="text-xs font-medium text-gray-600 mb-1 block">
                フォーム名（管理用） <span className="text-red-500 text-[10px] px-1 py-0.5 bg-red-50 rounded">必須</span>
              </label>
              <input
                type="text"
                value={newFormName}
                onChange={e => setNewFormName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") createForm(); }}
                placeholder="例）初診アンケート"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00B900]/20 focus:border-[#00B900]"
                autoFocus
              />
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setShowNewForm(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">キャンセル</button>
              <button
                onClick={createForm}
                disabled={!newFormName.trim()}
                className="px-6 py-2 bg-[#00B900] text-white rounded-lg text-sm font-medium hover:bg-[#009900] transition-colors disabled:opacity-40 shadow-sm"
              >
                作成して編集へ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
