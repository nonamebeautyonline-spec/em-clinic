"use client";

import { useState, useEffect, useRef } from "react";

interface Template {
  id: number;
  name: string;
  content: string;
  message_type: string;
  category: string | null;
  created_at: string;
  updated_at: string;
}

interface Category {
  id: number;
  name: string;
  sort_order: number;
}

type TemplateTab = "text" | "image";

export default function TemplateManagementPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [activeTab, setActiveTab] = useState<TemplateTab>("text");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState<string>("未分類");
  const [folderName, setFolderName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    const [tRes, cRes] = await Promise.all([
      fetch("/api/admin/line/templates", { credentials: "include" }),
      fetch("/api/admin/line/template-categories", { credentials: "include" }),
    ]);
    const tData = await tRes.json();
    const cData = await cRes.json();
    if (tData.templates) setTemplates(tData.templates);
    if (cData.categories) {
      setCategories(cData.categories);
      if (cData.categories.length > 0 && selectedCategory === null) {
        setSelectedCategory(cData.categories[0].name);
      }
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const filteredTemplates = selectedCategory === null
    ? templates
    : templates.filter(t => (t.category || "未分類") === selectedCategory);

  const getCategoryCount = (catName: string) =>
    templates.filter(t => (t.category || "未分類") === catName).length;

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/line/upload-template-image", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "画像アップロード失敗");
        return;
      }

      const data = await res.json();
      setImageUrl(data.url);
    } catch {
      alert("画像アップロード中にエラーが発生しました");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim() || saving) return;

    const isImage = activeTab === "image";
    const saveContent = isImage ? imageUrl : content.trim();
    const saveType = isImage ? "image" : "text";

    if (!saveContent) {
      alert(isImage ? "画像をアップロードしてください" : "本文を入力してください");
      return;
    }

    setSaving(true);

    const url = editingTemplate ? `/api/admin/line/templates/${editingTemplate.id}` : "/api/admin/line/templates";
    const method = editingTemplate ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name: name.trim(), content: saveContent, message_type: saveType, category }),
    });

    if (res.ok) {
      await fetchData();
      resetForm();
    } else {
      const data = await res.json();
      alert(data.error || "保存失敗");
    }
    setSaving(false);
  };

  const handleCreateFolder = async () => {
    if (!folderName.trim()) return;
    setSaving(true);

    const res = await fetch("/api/admin/line/template-categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name: folderName.trim() }),
    });

    if (res.ok) {
      await fetchData();
      setShowFolderModal(false);
      setFolderName("");
    } else {
      const data = await res.json();
      alert(data.error || "作成失敗");
    }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    const res = await fetch(`/api/admin/line/templates/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (res.ok) {
      await fetchData();
      setDeleteConfirm(null);
    }
  };

  const handleEdit = (t: Template) => {
    setEditingTemplate(t);
    setName(t.name);
    setCategory(t.category || "未分類");
    if (t.message_type === "image") {
      setActiveTab("image");
      setImageUrl(t.content);
      setContent("");
    } else {
      setActiveTab("text");
      setContent(t.content);
      setImageUrl("");
    }
    setShowModal(true);
  };

  const resetForm = () => {
    setShowModal(false);
    setEditingTemplate(null);
    setName("");
    setContent("");
    setActiveTab("text");
    setImageUrl("");
    setCategory("未分類");
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
  };

  const canSave = name.trim() && (activeTab === "text" ? content.trim() : imageUrl);

  return (
    <div className="min-h-full bg-gray-50/50">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                テンプレート
              </h1>
              <p className="text-sm text-gray-400 mt-1">友だちに送信するメッセージのテンプレートを管理できます</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFolderModal(true)}
                className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                新しいフォルダ
              </button>
              <button
                onClick={() => { resetForm(); setCategory(selectedCategory || "未分類"); setShowModal(true); }}
                className="px-5 py-2.5 bg-gradient-to-r from-[#06C755] to-[#05a648] text-white rounded-xl text-sm font-medium hover:from-[#05b34d] hover:to-[#049a42] shadow-lg shadow-green-500/25 transition-all duration-200 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                新しいテンプレート
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6">
        <div className="flex gap-6">
          {/* 左サイドバー - フォルダ */}
          <div className="w-56 flex-shrink-0">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {categories.map((cat, idx) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`w-full px-4 py-3 text-left text-sm flex items-center justify-between transition-colors ${idx > 0 ? "border-t border-gray-50" : ""} ${
                    selectedCategory === cat.name ? "bg-green-50 text-[#06C755] font-medium border-l-3 border-[#06C755]" : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    {cat.name}
                  </span>
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{getCategoryCount(cat.name)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 右メインエリア - テンプレート一覧 */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
                  <span className="text-sm text-gray-400">読み込み中...</span>
                </div>
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-gray-400 text-sm">テンプレートがありません</p>
                <p className="text-gray-300 text-xs mt-1">「新しいテンプレート」ボタンから作成しましょう</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* テーブルヘッダー */}
                <div className="grid grid-cols-[1fr_140px_100px_100px] gap-4 px-6 py-3 bg-gray-50/80 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <div>テンプレート名</div>
                  <div className="text-center">登録日</div>
                  <div className="text-center">プレビュー</div>
                  <div className="text-center">操作</div>
                </div>

                {filteredTemplates.map((t) => (
                  <div
                    key={t.id}
                    className="grid grid-cols-[1fr_140px_100px_100px] gap-4 items-center px-6 py-3.5 border-b border-gray-50 hover:bg-gray-50/50 transition-colors group"
                  >
                    {/* テンプレート名 */}
                    <div>
                      <button
                        onClick={() => handleEdit(t)}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline text-left"
                      >
                        {t.name}
                      </button>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${
                          t.message_type === "image" ? "bg-purple-100 text-purple-600" : "bg-gray-100 text-gray-500"
                        }`}>
                          {t.message_type === "image" ? "画像" : "テキスト"}
                        </span>
                        {t.message_type === "image" ? (
                          <img src={t.content} alt="" className="h-6 w-6 rounded object-cover" />
                        ) : (
                          <span className="text-xs text-gray-400 truncate max-w-[300px]">
                            {t.content.substring(0, 50)}{t.content.length > 50 ? "..." : ""}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 登録日 */}
                    <div className="text-center text-sm text-gray-500">
                      {formatDate(t.created_at)}
                    </div>

                    {/* プレビュー */}
                    <div className="text-center">
                      <button
                        onClick={() => setPreviewTemplate(t)}
                        className="px-3 py-1.5 text-xs font-medium border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        プレビュー
                      </button>
                    </div>

                    {/* 操作 */}
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleEdit(t)}
                        className="px-3 py-1.5 text-xs font-medium border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        別窓
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(t.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* テンプレート作成/編集モーダル */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => resetForm()}>
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-gray-900 text-lg">
                  {editingTemplate ? "テンプレート編集" : "テンプレート登録"}
                </h2>
                <button onClick={resetForm} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1">
              {/* テンプレート名 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  テンプレート名 <span className="text-red-500 text-xs px-1.5 py-0.5 bg-red-50 rounded">必須</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="テンプレート名を入力"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 bg-gray-50/50 transition-all"
                  autoFocus
                />
              </div>

              {/* フォルダ */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  テンプレートフォルダ <span className="text-gray-400 text-xs px-1.5 py-0.5 bg-gray-50 rounded">任意</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 bg-gray-50/50 transition-all"
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* タブ切替 */}
              <div>
                <div className="flex border-b border-gray-200">
                  <button
                    onClick={() => setActiveTab("text")}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      activeTab === "text"
                        ? "text-[#06C755] border-b-2 border-[#06C755]"
                        : "text-gray-400 hover:text-gray-600"
                    }`}
                  >
                    テキスト
                  </button>
                  <button
                    onClick={() => setActiveTab("image")}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      activeTab === "image"
                        ? "text-[#06C755] border-b-2 border-[#06C755]"
                        : "text-gray-400 hover:text-gray-600"
                    }`}
                  >
                    画像
                  </button>
                </div>
              </div>

              {/* テキスト入力 */}
              {activeTab === "text" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    本文 <span className="text-red-500 text-xs px-1.5 py-0.5 bg-red-50 rounded">必須</span>
                  </label>
                  {/* ツールバー */}
                  <div className="flex items-center gap-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-t-xl border-b-0">
                    <button className="p-1 text-gray-400 hover:text-gray-600 rounded" title="元に戻す">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                    </button>
                    <button className="p-1 text-gray-400 hover:text-gray-600 rounded" title="やり直し">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" /></svg>
                    </button>
                    <div className="w-px h-4 bg-gray-300 mx-1" />
                    <button className="px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded hover:bg-gray-300">名前</button>
                    <button className="px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded hover:bg-gray-300">友だち情報</button>
                  </div>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="メッセージ本文を入力してください..."
                    rows={8}
                    className="w-full px-4 py-3 border border-gray-200 rounded-b-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 resize-none transition-all"
                  />
                  <div className="flex justify-end mt-1">
                    <span className="text-xs text-gray-400">{content.length}/22500</span>
                  </div>
                </div>
              )}

              {/* 画像アップロード */}
              {activeTab === "image" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    画像 <span className="text-red-500 text-xs px-1.5 py-0.5 bg-red-50 rounded">必須</span>
                  </label>

                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file);
                      e.target.value = "";
                    }}
                  />

                  {imageUrl ? (
                    <div className="space-y-3">
                      <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                        <img src={imageUrl} alt="プレビュー" className="w-full max-h-[300px] object-contain" />
                        <button
                          onClick={() => setImageUrl("")}
                          className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <button
                        onClick={() => imageInputRef.current?.click()}
                        disabled={uploading}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        画像を変更
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => imageInputRef.current?.click()}
                      disabled={uploading}
                      className="w-full py-12 border-2 border-dashed border-gray-300 rounded-xl hover:border-green-400 hover:bg-green-50/30 transition-all flex flex-col items-center gap-3"
                    >
                      {uploading ? (
                        <>
                          <div className="w-8 h-8 border-2 border-green-200 border-t-green-500 rounded-full animate-spin" />
                          <span className="text-sm text-gray-500">アップロード中...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <div className="text-center">
                            <span className="text-sm font-medium text-gray-600">クリックして画像を選択</span>
                            <p className="text-xs text-gray-400 mt-1">JPEG, PNG, WebP (10MBまで)</p>
                          </div>
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 flex-shrink-0">
              <button onClick={resetForm} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 text-sm font-medium transition-colors">
                キャンセル
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !canSave}
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

      {/* フォルダ作成モーダル */}
      {showFolderModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowFolderModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">新しいフォルダ</h2>
            </div>
            <div className="px-6 py-5">
              <input
                type="text"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder="フォルダ名"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 bg-gray-50/50"
                autoFocus
              />
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
              <button onClick={() => setShowFolderModal(false)} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 text-sm font-medium">
                キャンセル
              </button>
              <button
                onClick={handleCreateFolder}
                disabled={!folderName.trim() || saving}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[#06C755] to-[#05a648] text-white rounded-xl disabled:opacity-40 text-sm font-medium shadow-lg shadow-green-500/25"
              >
                作成
              </button>
            </div>
          </div>
        </div>
      )}

      {/* プレビューモーダル */}
      {previewTemplate && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setPreviewTemplate(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900 text-sm">プレビュー: {previewTemplate.name}</h2>
              <button onClick={() => setPreviewTemplate(null)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* LINE風プレビュー */}
            <div className="p-6 bg-[#7494C0] min-h-[300px]">
              {previewTemplate.message_type === "image" ? (
                <img src={previewTemplate.content} alt="" className="max-w-[280px] rounded-2xl rounded-tl-sm shadow-sm" />
              ) : (
                <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 max-w-[280px] shadow-sm">
                  <p className="text-sm whitespace-pre-wrap text-gray-800">{previewTemplate.content}</p>
                </div>
              )}
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
              <h3 className="font-bold text-gray-900 mb-1">テンプレートを削除</h3>
              <p className="text-sm text-gray-500 mb-5">このテンプレートを削除しますか？この操作は取り消せません。</p>
              <div className="flex gap-3 w-full">
                <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 text-sm font-medium">
                  キャンセル
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 text-sm font-medium shadow-lg shadow-red-500/25"
                >
                  削除する
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
