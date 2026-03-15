"use client";

import { useState, useEffect, useRef } from "react";
import useSWR, { mutate } from "swr";
import { ErrorFallback } from "@/components/admin/ErrorFallback";

import type { Template, Category, TestAccount, FlexPreset } from "./_components/template-types";
import {
  TEMPLATES_KEY, CATEGORIES_KEY, PRESETS_KEY, TEST_ACCOUNT_KEY,
  HighlightVariables,
} from "./_components/template-types";
import { TemplateList } from "./_components/TemplateList";
import { TemplateEditor } from "./_components/TemplateEditor";
import { TestSendModal } from "./_components/TestSendModal";
import { FlexPreviewRenderer } from "@/app/admin/line/flex-builder/page";

export default function TemplateManagementPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("__all__");
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [flexPresets, setFlexPresets] = useState<FlexPreset[]>([]);

  // カテゴリ管理
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [deleteCategoryConfirm, setDeleteCategoryConfirm] = useState<Category | null>(null);
  const [categoryMenuId, setCategoryMenuId] = useState<number | null>(null);
  const [showCategoryManager, setShowCategoryManager] = useState(false);

  // 共有テンプレートインポート
  const [showImportModal, setShowImportModal] = useState(false);
  const [sharedTemplates, setSharedTemplates] = useState<{ id: string; name: string; description: string; category: string; template_type: string; tags: string[] }[]>([]);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [sharedLoading, setSharedLoading] = useState(false);

  // テスト送信
  const [testAccounts, setTestAccounts] = useState<TestAccount[]>([]);
  const [testSendingId, setTestSendingId] = useState<number | null>(null);
  const [testSendResult, setTestSendResult] = useState<{ id: number; ok: boolean; message: string } | null>(null);
  const [showTestSendModal, setShowTestSendModal] = useState<Template | null>(null);
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([]);

  // 名前変更
  const [renameTarget, setRenameTarget] = useState<Template | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // プレビュー
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [previewResult, setPreviewResult] = useState<string | null>(null);
  const [previewVars, setPreviewVars] = useState<Record<string, string> | null>(null);
  const [previewSource, setPreviewSource] = useState<"sample" | "patient" | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");
  const [patientCandidates, setPatientCandidates] = useState<{ id: string; name: string }[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<{ id: string; name: string } | null>(null);
  const [patientSearching, setPatientSearching] = useState(false);
  const patientSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── SWR データ取得 ───
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: tData, isLoading: loading, error: tError } = useSWR<any>(TEMPLATES_KEY);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: cData } = useSWR<any>(CATEGORIES_KEY);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: fpData } = useSWR<any>(PRESETS_KEY);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: taData } = useSWR<any>(TEST_ACCOUNT_KEY);

  useEffect(() => { if (tData?.templates) setTemplates(tData.templates); }, [tData]);
  useEffect(() => { if (cData?.categories) setCategories(cData.categories); }, [cData]);
  useEffect(() => { if (fpData?.presets) setFlexPresets(fpData.presets); }, [fpData]);
  useEffect(() => {
    if (!taData) return;
    if (taData.accounts?.length > 0) {
      setTestAccounts(taData.accounts);
    } else if (taData.patient_id) {
      setTestAccounts([{ patient_id: taData.patient_id, patient_name: taData.patient_name, has_line_uid: taData.has_line_uid }]);
    }
  }, [taData]);

  const revalidateAll = () => { mutate(TEMPLATES_KEY); mutate(CATEGORIES_KEY); };

  // ─── ハンドラ ───
  const handleEdit = (t: Template) => {
    if (t.message_type === "flex" && t.flex_content) {
      window.location.href = `/admin/line/flex-builder?template=${t.id}`;
      return;
    }
    setEditingTemplate(t);
    setShowEditor(true);
  };

  const handleDuplicate = async (t: Template) => {
    try {
      const res = await fetch("/api/admin/line/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: `${t.name}（コピー）`,
          content: t.content || "",
          message_type: t.message_type,
          category: t.category || "未分類",
          flex_content: t.flex_content || null,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        alert(d.error || "コピーに失敗しました");
        return;
      }
      mutate(TEMPLATES_KEY);
    } catch {
      alert("コピー中にエラーが発生しました");
    }
  };

  const handleDelete = async (id: number) => {
    const res = await fetch(`/api/admin/line/templates/${id}`, { method: "DELETE", credentials: "include" });
    if (res.ok) { mutate(TEMPLATES_KEY); setDeleteConfirm(null); }
  };

  const handleRename = async () => {
    if (!renameTarget || !renameValue.trim()) return;
    try {
      const res = await fetch(`/api/admin/line/templates/${renameTarget.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: renameValue.trim(),
          content: renameTarget.content || "",
          message_type: renameTarget.message_type,
          category: renameTarget.category || "未分類",
          flex_content: renameTarget.flex_content || null,
        }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); alert(d.error || "名前変更に失敗しました"); return; }
      setRenameTarget(null);
      mutate(TEMPLATES_KEY);
    } catch { alert("名前変更中にエラーが発生しました"); }
  };

  const openTestSendModal = (t: Template) => {
    if (testAccounts.length === 0 || testSendingId) return;
    setShowTestSendModal(t);
    setSelectedTestIds(testAccounts.filter(a => a.has_line_uid).map(a => a.patient_id));
  };

  // カテゴリ操作
  const handleCreateFolder = async () => {
    if (!folderName.trim()) return;
    setSaving(true);
    const res = await fetch("/api/admin/line/template-categories", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ name: folderName.trim() }),
    });
    if (res.ok) { mutate(CATEGORIES_KEY); setShowFolderModal(false); setFolderName(""); }
    else { const data = await res.json(); alert((data.message || data.error) || "作成失敗"); }
    setSaving(false);
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory || !editCategoryName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/line/template-categories/${editingCategory.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ name: editCategoryName.trim() }),
      });
      if (res.ok) {
        if (selectedCategory === editingCategory.name) setSelectedCategory(editCategoryName.trim());
        revalidateAll(); setEditingCategory(null); setEditCategoryName("");
      } else { const data = await res.json(); alert((data.message || data.error) || "カテゴリ名変更に失敗しました"); }
    } catch { alert("カテゴリ名変更中にエラーが発生しました"); }
    setSaving(false);
  };

  const handleDeleteCategory = async (cat: Category) => {
    try {
      const res = await fetch(`/api/admin/line/template-categories/${cat.id}`, { method: "DELETE", credentials: "include" });
      if (res.ok) {
        if (selectedCategory === cat.name) setSelectedCategory("__all__");
        revalidateAll(); setDeleteCategoryConfirm(null);
      } else { const data = await res.json(); alert((data.message || data.error) || "カテゴリ削除に失敗しました"); }
    } catch { alert("カテゴリ削除中にエラーが発生しました"); }
  };

  const handleMoveCategory = async (catIndex: number, direction: "up" | "down") => {
    const swapIndex = direction === "up" ? catIndex - 1 : catIndex + 1;
    if (swapIndex < 0 || swapIndex >= categories.length) return;
    const newCategories = [...categories];
    [newCategories[catIndex], newCategories[swapIndex]] = [newCategories[swapIndex], newCategories[catIndex]];
    const orders = newCategories.map((c, i) => ({ id: c.id, sort_order: i }));
    setCategories(newCategories.map((c, i) => ({ ...c, sort_order: i })));
    try {
      await fetch("/api/admin/line/template-categories/reorder", {
        method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ orders }),
      });
      mutate(CATEGORIES_KEY);
    } catch { mutate(CATEGORIES_KEY); }
  };

  // プレビュー
  const searchPatients = async (query: string) => {
    if (!query.trim()) { setPatientCandidates([]); return; }
    setPatientSearching(true);
    try {
      const res = await fetch(`/api/admin/patient-lookup?q=${encodeURIComponent(query.trim())}&type=name`, { credentials: "include" });
      const data = await res.json();
      if (data.candidates) setPatientCandidates(data.candidates);
      else if (data.found && data.patient) setPatientCandidates([{ id: data.patient.id, name: data.patient.name }]);
      else setPatientCandidates([]);
    } catch { setPatientCandidates([]); }
    finally { setPatientSearching(false); }
  };

  const handlePatientSearchChange = (value: string) => {
    setPatientSearch(value);
    if (patientSearchTimerRef.current) clearTimeout(patientSearchTimerRef.current);
    patientSearchTimerRef.current = setTimeout(() => searchPatients(value), 400);
  };

  const fetchPreview = async (templateContent: string, patientId?: string) => {
    setPreviewLoading(true);
    try {
      const res = await fetch("/api/admin/line/templates/preview", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ template_content: templateContent, patient_id: patientId }),
      });
      const data = await res.json();
      if (data.ok) { setPreviewResult(data.preview); setPreviewVars(data.variables); setPreviewSource(data.source); }
      else { setPreviewResult(null); setPreviewVars(null); setPreviewSource(null); }
    } catch { setPreviewResult(null); }
    finally { setPreviewLoading(false); }
  };

  const openPreviewModal = (t: Template) => {
    setPreviewTemplate(t);
    setPreviewResult(null); setPreviewVars(null); setPreviewSource(null);
    setPatientSearch(""); setPatientCandidates([]); setSelectedPatient(null);
    if (t.message_type === "text" && t.content) fetchPreview(t.content);
  };

  const closePreviewModal = () => {
    setPreviewTemplate(null); setPreviewResult(null); setPreviewVars(null); setPreviewSource(null);
    setPatientSearch(""); setPatientCandidates([]); setSelectedPatient(null);
  };

  const filteredTemplates = selectedCategory === "__all__"
    ? templates
    : templates.filter(t => (t.category || "未分類") === selectedCategory);

  const getCategoryCount = (catName: string) => templates.filter(t => (t.category || "未分類") === catName).length;

  if (tError) return <ErrorFallback error={tError} retry={() => { mutate(TEMPLATES_KEY); mutate(CATEGORIES_KEY); }} />;

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
                onClick={() => setShowImportModal(true)}
                className="px-4 py-2.5 bg-white border border-blue-200 text-blue-700 rounded-xl text-sm font-medium hover:bg-blue-50 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                共有テンプレートからインポート
              </button>
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
                onClick={() => { setEditingTemplate(null); setShowEditor(true); }}
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
              <button
                onClick={() => setSelectedCategory("__all__")}
                className={`w-full px-4 py-3 text-left text-sm flex items-center justify-between transition-colors ${
                  selectedCategory === "__all__" ? "bg-green-50 text-[#06C755] font-medium border-l-3 border-[#06C755]" : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                  全て
                </span>
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{templates.length}</span>
              </button>

              {categories.map((cat, idx) => (
                <div key={cat.id} className="relative">
                  <button
                    onClick={() => setSelectedCategory(cat.name)}
                    className={`w-full px-4 py-3 text-left text-sm flex items-center justify-between transition-colors border-t border-gray-50 ${
                      selectedCategory === cat.name ? "bg-green-50 text-[#06C755] font-medium border-l-3 border-[#06C755]" : "text-gray-600 hover:bg-gray-50"
                    } group`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                      <span className="truncate">{cat.name}</span>
                    </span>
                    <span className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{getCategoryCount(cat.name)}</span>
                      <span
                        onClick={(e) => { e.stopPropagation(); setCategoryMenuId(categoryMenuId === cat.id ? null : cat.id); }}
                        className="p-0.5 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                          <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
                        </svg>
                      </span>
                    </span>
                  </button>
                  {categoryMenuId === cat.id && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setCategoryMenuId(null)} />
                      <div className="absolute right-2 top-full mt-0.5 bg-white border border-gray-200 rounded-xl shadow-lg z-20 w-[140px] py-1">
                        <button onClick={() => { setCategoryMenuId(null); setEditCategoryName(cat.name); setEditingCategory(cat); }} className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          名前変更
                        </button>
                        {idx > 0 && (
                          <button onClick={() => { setCategoryMenuId(null); handleMoveCategory(idx, "up"); }} className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                            上に移動
                          </button>
                        )}
                        {idx < categories.length - 1 && (
                          <button onClick={() => { setCategoryMenuId(null); handleMoveCategory(idx, "down"); }} className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            下に移動
                          </button>
                        )}
                        {cat.name !== "未分類" && (
                          <>
                            <div className="border-t border-gray-100 my-1" />
                            <button onClick={() => { setCategoryMenuId(null); setDeleteCategoryConfirm(cat); }} className="w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 flex items-center gap-2">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              削除
                            </button>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowCategoryManager(true)}
              className="mt-3 w-full px-4 py-2 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors flex items-center justify-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              フォルダ管理
            </button>
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
            ) : (
              <TemplateList
                templates={filteredTemplates}
                testAccounts={testAccounts}
                testSendingId={testSendingId}
                testSendResult={testSendResult}
                onEdit={handleEdit}
                onDuplicate={handleDuplicate}
                onDelete={(id) => setDeleteConfirm(id)}
                onPreview={openPreviewModal}
                onTestSend={openTestSendModal}
                onRename={(t) => { setRenameValue(t.name); setRenameTarget(t); }}
              />
            )}
          </div>
        </div>
      </div>

      {/* テンプレート作成/編集モーダル */}
      {showEditor && (
        <TemplateEditor
          editingTemplate={editingTemplate}
          categories={categories}
          flexPresets={flexPresets}
          initialCategory={selectedCategory === "__all__" ? "未分類" : selectedCategory}
          onClose={() => { setShowEditor(false); setEditingTemplate(null); }}
        />
      )}

      {/* テスト送信モーダル */}
      {showTestSendModal && (
        <TestSendModal
          template={showTestSendModal}
          testAccounts={testAccounts}
          selectedTestIds={selectedTestIds}
          setSelectedTestIds={setSelectedTestIds}
          onClose={() => setShowTestSendModal(null)}
          onSendComplete={(result) => {
            setTestSendingId(result.id);
            setTestSendResult(result);
            setTestSendingId(null);
            setTimeout(() => setTestSendResult(null), 6000);
          }}
        />
      )}

      {/* フォルダ作成モーダル */}
      {showFolderModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowFolderModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100"><h2 className="font-bold text-gray-900">新しいフォルダ</h2></div>
            <div className="px-6 py-5">
              <input type="text" value={folderName} onChange={(e) => setFolderName(e.target.value)} placeholder="フォルダ名"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 bg-gray-50/50" autoFocus />
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
              <button onClick={() => setShowFolderModal(false)} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 text-sm font-medium">キャンセル</button>
              <button onClick={handleCreateFolder} disabled={!folderName.trim() || saving}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[#06C755] to-[#05a648] text-white rounded-xl disabled:opacity-40 text-sm font-medium shadow-lg shadow-green-500/25">作成</button>
            </div>
          </div>
        </div>
      )}

      {/* プレビューモーダル */}
      {previewTemplate && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={closePreviewModal}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <h2 className="font-bold text-gray-900 text-sm">テンプレートプレビュー: {previewTemplate.name}</h2>
              <button onClick={closePreviewModal} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              {previewTemplate.message_type === "text" && (
                <div className="px-6 py-4 border-b border-gray-100 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">患者を選択（任意）</label>
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <input type="text" value={patientSearch} onChange={(e) => handlePatientSearchChange(e.target.value)} placeholder="患者名で検索..."
                          className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 bg-gray-50/50" />
                        <svg className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        {patientCandidates.length > 0 && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
                            {patientCandidates.map((c) => (
                              <button key={c.id} onClick={() => { setSelectedPatient(c); setPatientSearch(c.name); setPatientCandidates([]); fetchPreview(previewTemplate.content, c.id); }}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-green-50 transition-colors flex items-center justify-between border-b border-gray-50 last:border-b-0">
                                <span className="text-gray-800">{c.name}</span><span className="text-xs text-gray-400">{c.id}</span>
                              </button>
                            ))}
                          </div>
                        )}
                        {patientSearching && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 px-3 py-2">
                            <span className="text-xs text-gray-400">検索中...</span>
                          </div>
                        )}
                      </div>
                      <button onClick={() => { setSelectedPatient(null); setPatientSearch(""); setPatientCandidates([]); fetchPreview(previewTemplate.content); }}
                        className="px-3 py-2 text-xs font-medium bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap">サンプル</button>
                    </div>
                    {selectedPatient && (
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-700">
                          選択中: {selectedPatient.name}（{selectedPatient.id}）
                        </span>
                        <button onClick={() => { setSelectedPatient(null); setPatientSearch(""); fetchPreview(previewTemplate.content); }} className="text-gray-400 hover:text-gray-600">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    )}
                  </div>
                  {previewVars && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">変数の値<span className="ml-2 text-[10px] font-normal text-gray-400">{previewSource === "sample" ? "（サンプルデータ）" : "（実データ）"}</span></p>
                      <div className="bg-gray-50 rounded-lg overflow-hidden border border-gray-100">
                        <table className="w-full text-xs"><tbody>
                          {Object.entries(previewVars).map(([key, val]) => (
                            <tr key={key} className="border-b border-gray-100 last:border-b-0">
                              <td className="px-3 py-1.5 font-mono text-blue-600 bg-blue-50/50 w-[180px]">{`{${key}}`}</td>
                              <td className="px-3 py-1.5 text-gray-700">{val || <span className="text-gray-300">（空）</span>}</td>
                            </tr>
                          ))}
                        </tbody></table>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {previewTemplate.message_type === "text" && (
                <div className="px-6 py-3 border-b border-gray-100">
                  <p className="text-xs font-medium text-gray-500 mb-2">元テンプレート</p>
                  <div className="bg-gray-50 rounded-lg px-3 py-2">
                    <p className="text-sm whitespace-pre-wrap text-gray-700 leading-relaxed"><HighlightVariables text={previewTemplate.content} /></p>
                  </div>
                </div>
              )}
              <div className="px-6 py-3"><p className="text-xs font-medium text-gray-500 mb-2">{previewTemplate.message_type === "text" ? "プレビュー結果" : "プレビュー"}</p></div>
              <div className="px-6 pb-6">
                <div className="bg-[#7494C0] rounded-xl p-4 min-h-[120px]">
                  {previewLoading ? (
                    <div className="flex items-center justify-center py-8"><div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /></div>
                  ) : previewTemplate.message_type === "image" ? (
                    <img src={previewTemplate.content} alt="" className="max-w-[280px] rounded-2xl rounded-tl-sm shadow-sm" />
                  ) : previewTemplate.message_type === "flex" && previewTemplate.flex_content ? (
                    <FlexPreviewRenderer data={previewTemplate.flex_content} />
                  ) : (
                    <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 max-w-[280px] shadow-sm">
                      <p className="text-sm whitespace-pre-wrap text-gray-800">{previewResult ?? previewTemplate.content}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="px-6 py-3 border-t border-gray-100 flex-shrink-0">
              <button onClick={closePreviewModal} className="w-full px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 text-sm font-medium transition-colors">閉じる</button>
            </div>
          </div>
        </div>
      )}

      {/* 名前変更モーダル */}
      {renameTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setRenameTarget(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-gray-900 mb-3">テンプレート名を変更</h3>
            <input type="text" value={renameValue} onChange={(e) => setRenameValue(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="テンプレート名" autoFocus onKeyDown={(e) => { if (e.key === "Enter") handleRename(); }} />
            <div className="flex gap-3 w-full mt-4">
              <button onClick={() => setRenameTarget(null)} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 text-sm font-medium">キャンセル</button>
              <button onClick={handleRename} disabled={!renameValue.trim()}
                className="flex-1 px-4 py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 text-sm font-medium shadow-lg shadow-blue-500/25 disabled:opacity-50">変更</button>
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
                <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 text-sm font-medium">キャンセル</button>
                <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 text-sm font-medium shadow-lg shadow-red-500/25">削除する</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* カテゴリ名変更モーダル */}
      {editingCategory && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setEditingCategory(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-gray-900 mb-3">フォルダ名を変更</h3>
            <input type="text" value={editCategoryName} onChange={(e) => setEditCategoryName(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
              placeholder="フォルダ名" autoFocus onKeyDown={(e) => { if (e.key === "Enter") handleUpdateCategory(); }} />
            <div className="flex gap-3 w-full mt-4">
              <button onClick={() => setEditingCategory(null)} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 text-sm font-medium">キャンセル</button>
              <button onClick={handleUpdateCategory} disabled={!editCategoryName.trim() || saving}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[#06C755] to-[#05a648] text-white rounded-xl disabled:opacity-40 text-sm font-medium shadow-lg shadow-green-500/25">変更</button>
            </div>
          </div>
        </div>
      )}

      {/* カテゴリ削除確認モーダル */}
      {deleteCategoryConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setDeleteCategoryConfirm(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="font-bold text-gray-900 mb-1">フォルダを削除</h3>
              <p className="text-sm text-gray-500 mb-2">「{deleteCategoryConfirm.name}」フォルダを削除しますか？</p>
              <p className="text-xs text-gray-400 mb-5">フォルダ内のテンプレート（{getCategoryCount(deleteCategoryConfirm.name)}件）は「未分類」に移動されます。</p>
              <div className="flex gap-3 w-full">
                <button onClick={() => setDeleteCategoryConfirm(null)} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 text-sm font-medium">キャンセル</button>
                <button onClick={() => handleDeleteCategory(deleteCategoryConfirm)} className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 text-sm font-medium shadow-lg shadow-red-500/25">削除する</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* フォルダ管理モーダル */}
      {showCategoryManager && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowCategoryManager(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">フォルダ管理</h2>
              <button onClick={() => setShowCategoryManager(false)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="overflow-y-auto flex-1 px-6 py-4">
              <p className="text-xs text-gray-400 mb-4">フォルダの並び順を変更できます。テンプレートはフォルダごとに整理されます。</p>
              <div className="space-y-2">
                {categories.map((cat, idx) => (
                  <div key={cat.id} className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="flex items-center gap-2 text-sm text-gray-700 min-w-0">
                      <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                      <span className="truncate font-medium">{cat.name}</span>
                      <span className="text-xs text-gray-400 flex-shrink-0">({getCategoryCount(cat.name)})</span>
                    </span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => handleMoveCategory(idx, "up")} disabled={idx === 0} className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors" title="上に移動">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                      </button>
                      <button onClick={() => handleMoveCategory(idx, "down")} disabled={idx === categories.length - 1} className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors" title="下に移動">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                      </button>
                      <button onClick={() => { setEditCategoryName(cat.name); setEditingCategory(cat); }} className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors" title="名前変更">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      {cat.name !== "未分類" && (
                        <button onClick={() => setDeleteCategoryConfirm(cat)} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors" title="削除">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100">
              <button onClick={() => { setShowCategoryManager(false); setShowFolderModal(true); }}
                className="w-full px-4 py-2.5 border border-dashed border-gray-300 text-gray-600 rounded-xl hover:border-[#06C755] hover:text-[#06C755] hover:bg-green-50/50 text-sm font-medium transition-colors flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                新しいフォルダを追加
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 共有テンプレートインポートモーダル */}
      {showImportModal && (
        <SharedTemplateImportModal
          open={showImportModal}
          onClose={() => setShowImportModal(false)}
          sharedTemplates={sharedTemplates}
          sharedLoading={sharedLoading}
          importingId={importingId}
          onFetch={async () => {
            setSharedLoading(true);
            try {
              const res = await fetch("/api/admin/shared-templates?limit=100", { credentials: "include" });
              if (res.ok) { const data = await res.json(); setSharedTemplates(data.templates || []); }
            } catch (e) { console.error("共有テンプレート取得エラー:", e); }
            finally { setSharedLoading(false); }
          }}
          onImport={async (id: string) => {
            setImportingId(id);
            try {
              const res = await fetch(`/api/admin/shared-templates/${id}/import`, { method: "POST", credentials: "include" });
              if (res.ok) { const data = await res.json(); alert(data.message || "インポートしました"); setShowImportModal(false); mutate(TEMPLATES_KEY); }
              else { const err = await res.json(); alert(err.message || "インポートに失敗しました"); }
            } catch { alert("インポートに失敗しました"); }
            finally { setImportingId(null); }
          }}
        />
      )}
    </div>
  );
}

/* ---------- 共有テンプレートインポートモーダル ---------- */
function SharedTemplateImportModal({ open, onClose, sharedTemplates, sharedLoading, importingId, onFetch, onImport }: {
  open: boolean; onClose: () => void;
  sharedTemplates: { id: string; name: string; description: string; category: string; template_type: string; tags: string[] }[];
  sharedLoading: boolean; importingId: string | null;
  onFetch: () => void; onImport: (id: string) => void;
}) {
  useEffect(() => { if (open) onFetch(); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!open) return null;
  const typeLabels: Record<string, string> = { message: "メッセージ", flex: "Flex", workflow: "ワークフロー" };
  const typeColors: Record<string, string> = { message: "bg-blue-100 text-blue-700", flex: "bg-purple-100 text-purple-700", workflow: "bg-amber-100 text-amber-700" };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-900">共有テンプレートからインポート</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {sharedLoading ? (
            <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" /></div>
          ) : sharedTemplates.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">共有テンプレートがありません</div>
          ) : (
            <div className="space-y-2">
              {sharedTemplates.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:bg-gray-50/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-gray-800">{t.name}</div>
                    {t.description && <div className="text-xs text-gray-400 mt-0.5 truncate">{t.description}</div>}
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${typeColors[t.template_type] || "bg-gray-100 text-gray-600"}`}>
                        {typeLabels[t.template_type] || t.template_type}
                      </span>
                      {t.category && <span className="text-[10px] text-gray-400">{t.category}</span>}
                    </div>
                  </div>
                  <button onClick={() => onImport(t.id)} disabled={importingId === t.id}
                    className="ml-3 px-3 py-1.5 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 shrink-0">
                    {importingId === t.id ? "..." : "インポート"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
