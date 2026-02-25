"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { FlexPreviewRenderer, type FlexPreset } from "@/app/admin/line/flex-builder/page";

/** Flex送信前にバブルの type:"bubble" を補完（LINE API必須）v4 */
function fixFlexForSend(data: unknown): unknown {
  if (!data || typeof data !== "object") return data;
  if (Array.isArray(data)) return data.map(fixFlexForSend);
  const o = data as Record<string, unknown>;
  // carousel → 内部を再帰
  if (o.type === "carousel" && Array.isArray(o.contents)) {
    return { ...o, contents: o.contents.map(fixFlexForSend) };
  }
  // bubble構造（header/hero/body/footer）でtypeがbubbleでない → 強制上書き
  if ((o.header || o.hero || o.body || o.footer) && o.type !== "bubble") {
    return { ...o, type: "bubble" };
  }
  return o;
}

interface Template {
  id: number;
  name: string;
  content: string;
  message_type: string;
  category: string | null;
  flex_content: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

interface Category {
  id: number;
  name: string;
  sort_order: number;
}

type TemplateTab = "text" | "image" | "carousel" | "flex";

/* ボタン・カルーセル用の型 */
interface PanelButton {
  label: string;
  actionType: "url" | "postback" | "message";
  actionValue: string;
}

interface CarouselPanel {
  title: string;
  body: string;
  imageUrl: string;
  buttons: PanelButton[];
}

const EMPTY_BUTTON: PanelButton = { label: "", actionType: "url", actionValue: "" };
const EMPTY_PANEL: CarouselPanel = { title: "", body: "", imageUrl: "", buttons: [{ ...EMPTY_BUTTON }] };

/** カルーセルパネルからLINE Flex Message JSONを生成 */
function panelsToFlex(panels: CarouselPanel[]): Record<string, unknown> {
  const bubbles = panels.map(panel => {
    const bodyContents: Record<string, unknown>[] = [];
    if (panel.title) {
      bodyContents.push({ type: "text", text: panel.title, weight: "bold", size: "lg", wrap: true });
    }
    if (panel.body) {
      bodyContents.push({ type: "text", text: panel.body, size: "sm", color: "#666666", wrap: true, margin: "md" });
    }
    const footerContents: Record<string, unknown>[] = panel.buttons
      .filter(b => b.label.trim())
      .map(b => ({
        type: "button",
        style: "primary",
        color: "#06C755",
        action: b.actionType === "url"
          ? { type: "uri", label: b.label, uri: b.actionValue || "https://example.com" }
          : b.actionType === "postback"
            ? { type: "postback", label: b.label, data: b.actionValue }
            : { type: "message", label: b.label, text: b.actionValue || b.label },
      }));

    const bubble: Record<string, unknown> = { type: "bubble" };
    if (panel.imageUrl) {
      bubble.hero = { type: "image", url: panel.imageUrl, size: "full", aspectRatio: "20:13", aspectMode: "cover" };
    }
    if (bodyContents.length > 0) {
      bubble.body = { type: "box", layout: "vertical", contents: bodyContents, spacing: "sm" };
    }
    if (footerContents.length > 0) {
      bubble.footer = { type: "box", layout: "vertical", contents: footerContents, spacing: "sm" };
    }
    return bubble;
  });

  if (bubbles.length === 1) return bubbles[0];
  return { type: "carousel", contents: bubbles };
}

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
  // ボタン・カルーセル
  const [panels, setPanels] = useState<CarouselPanel[]>([{ ...EMPTY_PANEL, buttons: [{ ...EMPTY_BUTTON }] }]);
  // Flex JSON直接編集
  const [flexJson, setFlexJson] = useState("");
  const [flexError, setFlexError] = useState("");
  // Flexプリセット
  const [flexPresets, setFlexPresets] = useState<FlexPreset[]>([]);
  // テスト送信（複数アカウント対応）
  type TestAccount = { patient_id: string; patient_name: string; has_line_uid: boolean };
  const [testAccounts, setTestAccounts] = useState<TestAccount[]>([]);
  const [testSendingId, setTestSendingId] = useState<number | null>(null);
  const [testSendResult, setTestSendResult] = useState<{ id: number; ok: boolean; message: string } | null>(null);
  const [showTestSendModal, setShowTestSendModal] = useState<Template | null>(null);
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([]);

  // 変数プレビュー用state
  const [previewResult, setPreviewResult] = useState<string | null>(null);
  const [previewVars, setPreviewVars] = useState<Record<string, string> | null>(null);
  const [previewSource, setPreviewSource] = useState<"sample" | "patient" | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");
  const [patientCandidates, setPatientCandidates] = useState<{ id: string; name: string }[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<{ id: string; name: string } | null>(null);
  const [patientSearching, setPatientSearching] = useState(false);
  const patientSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchData = async () => {
    const [tRes, cRes, fpRes, taRes] = await Promise.all([
      fetch("/api/admin/line/templates", { credentials: "include" }),
      fetch("/api/admin/line/template-categories", { credentials: "include" }),
      fetch("/api/admin/line/flex-presets", { credentials: "include" }),
      fetch("/api/admin/line/test-account", { credentials: "include" }),
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
    // Flexプリセット取得
    if (fpRes.ok) {
      const fpData = await fpRes.json();
      if (fpData.presets) setFlexPresets(fpData.presets);
    }
    // テスト送信アカウント取得（複数対応）
    if (taRes.ok) {
      const taData = await taRes.json();
      if (taData.accounts && taData.accounts.length > 0) {
        setTestAccounts(taData.accounts);
      } else if (taData.patient_id) {
        // 後方互換
        setTestAccounts([{ patient_id: taData.patient_id, patient_name: taData.patient_name, has_line_uid: taData.has_line_uid }]);
      }
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // 患者検索（デバウンス付き）
  const searchPatients = async (query: string) => {
    if (!query.trim()) {
      setPatientCandidates([]);
      return;
    }
    setPatientSearching(true);
    try {
      const res = await fetch(
        `/api/admin/patient-lookup?q=${encodeURIComponent(query.trim())}&type=name`,
        { credentials: "include" },
      );
      const data = await res.json();
      if (data.candidates) {
        setPatientCandidates(data.candidates);
      } else if (data.found && data.patient) {
        setPatientCandidates([{ id: data.patient.id, name: data.patient.name }]);
      } else {
        setPatientCandidates([]);
      }
    } catch {
      setPatientCandidates([]);
    } finally {
      setPatientSearching(false);
    }
  };

  // 患者検索入力のデバウンス
  const handlePatientSearchChange = (value: string) => {
    setPatientSearch(value);
    if (patientSearchTimerRef.current) clearTimeout(patientSearchTimerRef.current);
    patientSearchTimerRef.current = setTimeout(() => searchPatients(value), 400);
  };

  // テンプレートプレビューを取得
  const fetchPreview = async (templateContent: string, patientId?: string) => {
    setPreviewLoading(true);
    try {
      const res = await fetch("/api/admin/line/templates/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          template_content: templateContent,
          patient_id: patientId,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setPreviewResult(data.preview);
        setPreviewVars(data.variables);
        setPreviewSource(data.source);
      } else {
        setPreviewResult(null);
        setPreviewVars(null);
        setPreviewSource(null);
      }
    } catch {
      setPreviewResult(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  // プレビューモーダルを開く
  const openPreviewModal = (t: Template) => {
    setPreviewTemplate(t);
    setPreviewResult(null);
    setPreviewVars(null);
    setPreviewSource(null);
    setPatientSearch("");
    setPatientCandidates([]);
    setSelectedPatient(null);
    // テキストテンプレートの場合、サンプルデータでプレビューを自動取得
    if (t.message_type === "text" && t.content) {
      fetchPreview(t.content);
    }
  };

  // プレビューモーダルを閉じる
  const closePreviewModal = () => {
    setPreviewTemplate(null);
    setPreviewResult(null);
    setPreviewVars(null);
    setPreviewSource(null);
    setPatientSearch("");
    setPatientCandidates([]);
    setSelectedPatient(null);
  };

  // テスト送信確認画面を開く
  const openTestSendModal = (t: Template) => {
    if (testAccounts.length === 0 || testSendingId) return;
    setShowTestSendModal(t);
    // デフォルトで全アカウント選択
    setSelectedTestIds(testAccounts.filter(a => a.has_line_uid).map(a => a.patient_id));
  };

  // テスト送信実行（選択されたアカウントに送信）
  const executeTestSend = async () => {
    const t = showTestSendModal;
    if (!t || selectedTestIds.length === 0 || testSendingId) return;
    setShowTestSendModal(null);
    setTestSendingId(t.id);
    setTestSendResult(null);

    const results: string[] = [];
    let allOk = true;
    for (const pid of selectedTestIds) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const body: any = { patient_id: pid };
        if (t.message_type === "flex" && t.flex_content) {
          body.message_type = "flex";
          body.flex = { type: "flex", altText: t.name, contents: fixFlexForSend(t.flex_content) };
          body.message = "";
        } else if (t.message_type === "image") {
          body.message_type = "image";
          body.message = t.content;
          body.template_name = t.name;
        } else {
          body.message = t.content;
        }
        const res = await fetch("/api/admin/line/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        });
        const data = await res.json();
        const account = testAccounts.find(a => a.patient_id === pid);
        const name = account?.patient_name || pid;
        if (data.ok) {
          results.push(`${name}: 送信完了`);
        } else {
          allOk = false;
          results.push(`${name}: ${data.error || "失敗"} [FE4]`);
        }
      } catch {
        allOk = false;
        const account = testAccounts.find(a => a.patient_id === pid);
        results.push(`${account?.patient_name || pid}: 通信エラー`);
      }
    }
    setTestSendResult({
      id: t.id,
      ok: allOk,
      message: results.join(" / "),
    });
    setTestSendingId(null);
    setTimeout(() => setTestSendResult(null), 6000);
  };

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

    let saveContent = "";
    let saveType = "text";
    let flexContent: Record<string, unknown> | null = null;

    if (activeTab === "image") {
      if (!imageUrl) { alert("画像をアップロードしてください"); return; }
      saveContent = imageUrl;
      saveType = "image";
    } else if (activeTab === "carousel") {
      const validPanels = panels.filter(p => p.title.trim() || p.body.trim() || p.imageUrl);
      if (validPanels.length === 0) { alert("パネルを1つ以上作成してください"); return; }
      flexContent = panelsToFlex(validPanels);
      saveType = "flex";
      saveContent = `[カルーセル: ${validPanels.length}パネル]`;
    } else if (activeTab === "flex") {
      if (!flexJson.trim()) { alert("Flex JSONを入力してください"); return; }
      try {
        flexContent = JSON.parse(flexJson);
      } catch {
        alert("JSON形式が不正です"); return;
      }
      saveType = "flex";
      saveContent = "";
    } else {
      if (!content.trim()) { alert("本文を入力してください"); return; }
      saveContent = content.trim();
      saveType = "text";
    }

    setSaving(true);

    const url = editingTemplate ? `/api/admin/line/templates/${editingTemplate.id}` : "/api/admin/line/templates";
    const method = editingTemplate ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name: name.trim(), content: saveContent, message_type: saveType, category, flex_content: flexContent }),
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
    } else if (t.message_type === "flex" && t.flex_content) {
      // Flexテンプレート → JSON直接編集で開く
      setActiveTab("flex");
      setFlexJson(JSON.stringify(t.flex_content, null, 2));
      setContent("");
      setImageUrl("");
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
    setPanels([{ ...EMPTY_PANEL, buttons: [{ ...EMPTY_BUTTON }] }]);
    setFlexJson("");
    setFlexError("");
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
  };

  const canSave = name.trim() && (
    activeTab === "text" ? content.trim() :
    activeTab === "image" ? imageUrl :
    activeTab === "carousel" ? panels.some(p => p.title.trim() || p.body.trim()) :
    activeTab === "flex" ? flexJson.trim() && !flexError :
    false
  );

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
                <div className={`grid gap-4 px-6 py-3 bg-gray-50/80 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider ${
                  testAccounts.length > 0 ? "grid-cols-[1fr_100px_80px_80px_110px]" : "grid-cols-[1fr_100px_80px_100px]"
                }`}>
                  <div>テンプレート名</div>
                  <div className="text-center">登録日</div>
                  <div className="text-center">プレビュー</div>
                  {testAccounts.length > 0 && <div className="text-center">テスト</div>}
                  <div className="text-center">操作</div>
                </div>

                {filteredTemplates.map((t) => (
                  <div
                    key={t.id}
                    className={`grid gap-4 items-center px-6 py-3.5 border-b border-gray-50 hover:bg-gray-50/50 transition-colors group ${
                      testAccounts.length > 0 ? "grid-cols-[1fr_100px_80px_80px_110px]" : "grid-cols-[1fr_100px_80px_100px]"
                    }`}
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
                          t.message_type === "image" ? "bg-purple-100 text-purple-600" :
                          t.message_type === "flex" ? "bg-blue-100 text-blue-600" :
                          "bg-gray-100 text-gray-500"
                        }`}>
                          {t.message_type === "image" ? "画像" : t.message_type === "flex" ? (t.content?.includes("カルーセル") ? "カルーセル" : "Flex") : "テキスト"}
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
                        onClick={() => openPreviewModal(t)}
                        className="px-3 py-1.5 text-xs font-medium border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        プレビュー
                      </button>
                    </div>

                    {/* テスト送信 */}
                    {testAccounts.length > 0 && (
                      <div className="text-center">
                        {testSendResult?.id === t.id ? (
                          <span
                            className={`text-[11px] font-medium ${testSendResult.ok ? "text-emerald-600" : "text-red-500"}`}
                            title={testSendResult.message}
                          >
                            {testSendResult.ok ? "送信完了" : testSendResult.message || "失敗"}
                          </span>
                        ) : testSendingId === t.id ? (
                          <span className="text-[11px] text-amber-600">送信中...</span>
                        ) : (
                          <button
                            onClick={() => openTestSendModal(t)}
                            disabled={testSendingId !== null}
                            className="px-3 py-1.5 text-xs font-medium border border-amber-200 text-amber-700 bg-amber-50 rounded-lg hover:bg-amber-100 disabled:opacity-40 transition-colors"
                          >
                            テスト
                          </button>
                        )}
                      </div>
                    )}

                    {/* 操作 */}
                    <div className="flex items-center justify-center gap-1">
                      {t.message_type === "flex" && t.flex_content ? (
                        <Link
                          href={`/admin/line/flex-builder?template=${t.id}`}
                          className="px-3 py-1.5 text-xs font-medium border border-blue-200 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          エディタ
                        </Link>
                      ) : (
                        <button
                          onClick={() => handleEdit(t)}
                          className="px-3 py-1.5 text-xs font-medium border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          編集
                        </button>
                      )}
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
          <div className={`bg-white rounded-2xl w-full shadow-2xl max-h-[90vh] flex flex-col transition-all ${activeTab === "flex" ? "max-w-6xl" : "max-w-2xl"}`} onClick={(e) => e.stopPropagation()}>
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
                <div className="flex border-b border-gray-200 overflow-x-auto">
                  {([
                    { key: "text" as TemplateTab, label: "テキスト" },
                    { key: "image" as TemplateTab, label: "画像" },
                    { key: "carousel" as TemplateTab, label: "ボタン・カルーセル" },
                    { key: "flex" as TemplateTab, label: "Flex" },
                  ]).map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                        activeTab === tab.key
                          ? "text-[#06C755] border-b-2 border-[#06C755]"
                          : "text-gray-400 hover:text-gray-600"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
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

              {/* ボタン・カルーセル ビルダー */}
              {activeTab === "carousel" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                      パネル {panels.length}/10（1枚ならボタン型、複数枚でカルーセル）
                    </p>
                    {panels.length < 10 && (
                      <button
                        onClick={() => setPanels([...panels, { ...EMPTY_PANEL, buttons: [{ ...EMPTY_BUTTON }] }])}
                        className="text-xs text-[#06C755] hover:text-[#05a648] font-medium flex items-center gap-1"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        パネル追加
                      </button>
                    )}
                  </div>

                  {panels.map((panel, pi) => (
                    <div key={pi} className="border border-gray-200 rounded-xl overflow-hidden">
                      {/* パネルヘッダー */}
                      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-100">
                        <span className="text-xs font-bold text-gray-600">パネル {pi + 1}/{panels.length}</span>
                        <div className="flex items-center gap-1">
                          {pi > 0 && (
                            <button
                              onClick={() => { const n = [...panels]; [n[pi-1], n[pi]] = [n[pi], n[pi-1]]; setPanels(n); }}
                              className="p-1 text-gray-400 hover:text-gray-600 rounded"
                              title="前に移動"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                            </button>
                          )}
                          {pi < panels.length - 1 && (
                            <button
                              onClick={() => { const n = [...panels]; [n[pi], n[pi+1]] = [n[pi+1], n[pi]]; setPanels(n); }}
                              className="p-1 text-gray-400 hover:text-gray-600 rounded"
                              title="後に移動"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </button>
                          )}
                          {panels.length > 1 && (
                            <button
                              onClick={() => setPanels(panels.filter((_, i) => i !== pi))}
                              className="p-1 text-gray-400 hover:text-red-500 rounded"
                              title="削除"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="p-4 space-y-3">
                        {/* 画像URL */}
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">画像URL</label>
                          <input
                            type="url"
                            value={panel.imageUrl}
                            onChange={(e) => { const n = [...panels]; n[pi] = { ...n[pi], imageUrl: e.target.value }; setPanels(n); }}
                            placeholder="https://example.com/image.jpg"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30"
                          />
                        </div>

                        {/* タイトル */}
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">タイトル</label>
                          <input
                            type="text"
                            value={panel.title}
                            onChange={(e) => { const n = [...panels]; n[pi] = { ...n[pi], title: e.target.value }; setPanels(n); }}
                            placeholder="タイトルを入力"
                            maxLength={40}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30"
                          />
                          <div className="text-right text-[10px] text-gray-400 mt-0.5">{panel.title.length}/40</div>
                        </div>

                        {/* 本文 */}
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">本文</label>
                          <textarea
                            value={panel.body}
                            onChange={(e) => { const n = [...panels]; n[pi] = { ...n[pi], body: e.target.value }; setPanels(n); }}
                            placeholder="本文を入力"
                            rows={2}
                            maxLength={60}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 resize-none"
                          />
                          <div className="text-right text-[10px] text-gray-400 mt-0.5">{panel.body.length}/60</div>
                        </div>

                        {/* ボタン */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-medium text-gray-600">ボタン</label>
                            {panel.buttons.length < (panels.length === 1 ? 4 : 3) && (
                              <button
                                onClick={() => { const n = [...panels]; n[pi] = { ...n[pi], buttons: [...n[pi].buttons, { ...EMPTY_BUTTON }] }; setPanels(n); }}
                                className="text-[10px] text-[#06C755] hover:text-[#05a648] font-medium"
                              >
                                + 追加
                              </button>
                            )}
                          </div>
                          {panel.buttons.map((btn, bi) => (
                            <div key={bi} className="flex items-center gap-2 mb-2">
                              <input
                                type="text"
                                value={btn.label}
                                onChange={(e) => {
                                  const n = [...panels];
                                  const btns = [...n[pi].buttons];
                                  btns[bi] = { ...btns[bi], label: e.target.value };
                                  n[pi] = { ...n[pi], buttons: btns };
                                  setPanels(n);
                                }}
                                placeholder="ボタン名"
                                maxLength={20}
                                className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-green-500/30"
                              />
                              <select
                                value={btn.actionType}
                                onChange={(e) => {
                                  const n = [...panels];
                                  const btns = [...n[pi].buttons];
                                  btns[bi] = { ...btns[bi], actionType: e.target.value as PanelButton["actionType"] };
                                  n[pi] = { ...n[pi], buttons: btns };
                                  setPanels(n);
                                }}
                                className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none"
                              >
                                <option value="url">URL</option>
                                <option value="postback">ポストバック</option>
                                <option value="message">メッセージ</option>
                              </select>
                              <input
                                type="text"
                                value={btn.actionValue}
                                onChange={(e) => {
                                  const n = [...panels];
                                  const btns = [...n[pi].buttons];
                                  btns[bi] = { ...btns[bi], actionValue: e.target.value };
                                  n[pi] = { ...n[pi], buttons: btns };
                                  setPanels(n);
                                }}
                                placeholder={btn.actionType === "url" ? "https://..." : btn.actionType === "postback" ? "action=xxx" : "返信テキスト"}
                                className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-green-500/30"
                              />
                              {panel.buttons.length > 1 && (
                                <button
                                  onClick={() => {
                                    const n = [...panels];
                                    n[pi] = { ...n[pi], buttons: n[pi].buttons.filter((_, i) => i !== bi) };
                                    setPanels(n);
                                  }}
                                  className="p-1 text-gray-400 hover:text-red-500"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* カルーセルプレビュー */}
                  {panels.some(p => p.title || p.body || p.imageUrl) && (
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                        <span className="text-xs font-medium text-gray-600">プレビュー</span>
                      </div>
                      <div className="p-4 bg-[#7494c0]">
                        <div className="flex gap-2 overflow-x-auto pb-2">
                          {panels.filter(p => p.title || p.body || p.imageUrl).map((panel, i) => (
                            <div key={i} className="flex-shrink-0 w-[220px] bg-white rounded-xl overflow-hidden shadow-lg">
                              {panel.imageUrl && (
                                <div className="w-full h-28 bg-gray-200 bg-cover bg-center" style={{ backgroundImage: `url(${panel.imageUrl})` }} />
                              )}
                              <div className="px-3 py-2">
                                {panel.title && <p className="text-sm font-bold text-gray-900">{panel.title}</p>}
                                {panel.body && <p className="text-xs text-gray-500 mt-0.5">{panel.body}</p>}
                              </div>
                              {panel.buttons.filter(b => b.label).length > 0 && (
                                <div className="px-3 pb-2 space-y-1">
                                  {panel.buttons.filter(b => b.label).map((btn, bi) => (
                                    <div key={bi} className="py-1.5 text-center text-xs font-medium text-white rounded-lg" style={{ backgroundColor: "#06C755" }}>
                                      {btn.label}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Flex JSON編集（プリセット + エディタ + プレビュー） */}
              {activeTab === "flex" && (
                <div className="space-y-3">
                  {/* ビジュアルエディタへのリンク */}
                  <Link
                    href={editingTemplate ? `/admin/line/flex-builder?template=${editingTemplate.id}` : "/admin/line/flex-builder"}
                    className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl hover:from-blue-100 hover:to-indigo-100 transition-colors"
                  >
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    <div>
                      <span className="text-sm font-medium text-blue-700">ノーコードエディタで開く</span>
                      <span className="text-xs text-blue-500 ml-2">JSONを書かずにビジュアルで編集</span>
                    </div>
                    <svg className="w-4 h-4 text-blue-400 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>

                  {/* プリセットボタン */}
                  {flexPresets.length > 0 && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">プリセットから選択</label>
                      <div className="flex flex-wrap gap-2">
                        {flexPresets.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => {
                              setFlexJson(JSON.stringify(p.flex_json, null, 2));
                              setFlexError("");
                            }}
                            className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:border-[#06C755] hover:bg-green-50 transition-colors text-gray-700"
                          >
                            {p.name}
                            {p.description && (
                              <span className="ml-1.5 text-[10px] text-gray-400">{p.description}</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* JSONエディタ + プレビュー 横並び */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* JSONエディタ */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-sm font-medium text-gray-700">
                          Flex Message JSON <span className="text-red-500 text-xs px-1.5 py-0.5 bg-red-50 rounded">必須</span>
                        </label>
                        <button
                          onClick={() => {
                            try {
                              const parsed = JSON.parse(flexJson);
                              setFlexJson(JSON.stringify(parsed, null, 2));
                              setFlexError("");
                            } catch { setFlexError("JSON形式が不正です"); }
                          }}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          整形
                        </button>
                      </div>
                      <p className="text-xs text-gray-400 mb-2">
                        プリセットを選択するか、LINE Flex Message Simulator で作成したJSONを貼り付けてください
                      </p>
                      <textarea
                        value={flexJson}
                        onChange={(e) => {
                          setFlexJson(e.target.value);
                          if (e.target.value.trim()) {
                            try { JSON.parse(e.target.value); setFlexError(""); } catch { setFlexError("JSON形式が不正です"); }
                          } else { setFlexError(""); }
                        }}
                        placeholder='{"type":"bubble","body":{"type":"box",...}}'
                        rows={16}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-xs font-mono text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500/30 resize-none"
                        spellCheck={false}
                      />
                      {flexError && (
                        <p className="text-xs text-red-500 mt-1">{flexError}</p>
                      )}
                    </div>

                    {/* リアルタイムプレビュー */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">プレビュー</label>
                      <div className="bg-[#7494c0] rounded-xl p-4 min-h-[350px]">
                        {(() => {
                          if (!flexJson.trim()) {
                            return (
                              <div className="text-center text-white/60 text-sm py-20">
                                プリセットを選択またはJSONを入力してください
                              </div>
                            );
                          }
                          try {
                            const parsed = JSON.parse(flexJson);
                            return <FlexPreviewRenderer data={parsed} />;
                          } catch {
                            return (
                              <div className="text-center text-white/60 text-sm py-20">
                                JSONを修正してください
                              </div>
                            );
                          }
                        })()}
                      </div>
                    </div>
                  </div>
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

      {/* プレビューモーダル（変数置換対応） */}
      {previewTemplate && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={closePreviewModal}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <h2 className="font-bold text-gray-900 text-sm">テンプレートプレビュー: {previewTemplate.name}</h2>
              <button onClick={closePreviewModal} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              {/* テキストテンプレートの場合のみ変数プレビュー機能を表示 */}
              {previewTemplate.message_type === "text" && (
                <div className="px-6 py-4 border-b border-gray-100 space-y-3">
                  {/* 患者検索 */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">患者を選択（任意）</label>
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          value={patientSearch}
                          onChange={(e) => handlePatientSearchChange(e.target.value)}
                          placeholder="患者名で検索..."
                          className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 bg-gray-50/50"
                        />
                        <svg className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        {/* 患者候補リスト */}
                        {patientCandidates.length > 0 && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
                            {patientCandidates.map((c) => (
                              <button
                                key={c.id}
                                onClick={() => {
                                  setSelectedPatient(c);
                                  setPatientSearch(c.name);
                                  setPatientCandidates([]);
                                  fetchPreview(previewTemplate.content, c.id);
                                }}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-green-50 transition-colors flex items-center justify-between border-b border-gray-50 last:border-b-0"
                              >
                                <span className="text-gray-800">{c.name}</span>
                                <span className="text-xs text-gray-400">{c.id}</span>
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
                      <button
                        onClick={() => {
                          setSelectedPatient(null);
                          setPatientSearch("");
                          setPatientCandidates([]);
                          fetchPreview(previewTemplate.content);
                        }}
                        className="px-3 py-2 text-xs font-medium bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap"
                      >
                        サンプル
                      </button>
                    </div>
                    {selectedPatient && (
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-700">
                          選択中: {selectedPatient.name}（{selectedPatient.id}）
                        </span>
                        <button
                          onClick={() => {
                            setSelectedPatient(null);
                            setPatientSearch("");
                            fetchPreview(previewTemplate.content);
                          }}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 変数置換テーブル */}
                  {previewVars && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">
                        変数の値
                        <span className="ml-2 text-[10px] font-normal text-gray-400">
                          {previewSource === "sample" ? "（サンプルデータ）" : "（実データ）"}
                        </span>
                      </p>
                      <div className="bg-gray-50 rounded-lg overflow-hidden border border-gray-100">
                        <table className="w-full text-xs">
                          <tbody>
                            {Object.entries(previewVars).map(([key, val]) => (
                              <tr key={key} className="border-b border-gray-100 last:border-b-0">
                                <td className="px-3 py-1.5 font-mono text-blue-600 bg-blue-50/50 w-[180px]">{`{${key}}`}</td>
                                <td className="px-3 py-1.5 text-gray-700">{val || <span className="text-gray-300">（空）</span>}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 元テンプレート（テキストのみ・変数ハイライト表示） */}
              {previewTemplate.message_type === "text" && (
                <div className="px-6 py-3 border-b border-gray-100">
                  <p className="text-xs font-medium text-gray-500 mb-2">元テンプレート</p>
                  <div className="bg-gray-50 rounded-lg px-3 py-2">
                    <p className="text-sm whitespace-pre-wrap text-gray-700 leading-relaxed">
                      <HighlightVariables text={previewTemplate.content} />
                    </p>
                  </div>
                </div>
              )}

              {/* LINE風プレビュー */}
              <div className="px-6 py-3">
                <p className="text-xs font-medium text-gray-500 mb-2">
                  {previewTemplate.message_type === "text" ? "プレビュー結果" : "プレビュー"}
                </p>
              </div>
              <div className="px-6 pb-6">
                <div className="bg-[#7494C0] rounded-xl p-4 min-h-[120px]">
                  {previewLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    </div>
                  ) : previewTemplate.message_type === "image" ? (
                    <img src={previewTemplate.content} alt="" className="max-w-[280px] rounded-2xl rounded-tl-sm shadow-sm" />
                  ) : previewTemplate.message_type === "flex" && previewTemplate.flex_content ? (
                    <FlexPreviewRenderer data={previewTemplate.flex_content} />
                  ) : (
                    <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 max-w-[280px] shadow-sm">
                      <p className="text-sm whitespace-pre-wrap text-gray-800">
                        {previewResult ?? previewTemplate.content}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-3 border-t border-gray-100 flex-shrink-0">
              <button
                onClick={closePreviewModal}
                className="w-full px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 text-sm font-medium transition-colors"
              >
                閉じる
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

      {/* テスト送信確認モーダル */}
      {showTestSendModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowTestSendModal(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">テスト送信</h3>
              <p className="text-xs text-gray-500 mt-1">
                「{showTestSendModal.name}」を送信する宛先を選択してください
              </p>
            </div>
            <div className="px-6 py-4 space-y-2 max-h-[300px] overflow-y-auto">
              {testAccounts.map((a) => (
                <label
                  key={a.patient_id}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors cursor-pointer ${
                    selectedTestIds.includes(a.patient_id)
                      ? "border-amber-300 bg-amber-50"
                      : "border-gray-200 hover:bg-gray-50"
                  } ${!a.has_line_uid ? "opacity-50" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={selectedTestIds.includes(a.patient_id)}
                    disabled={!a.has_line_uid}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedTestIds(prev => [...prev, a.patient_id]);
                      } else {
                        setSelectedTestIds(prev => prev.filter(id => id !== a.patient_id));
                      }
                    }}
                    className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-800">{a.patient_name || a.patient_id}</span>
                    {!a.has_line_uid && (
                      <span className="ml-2 text-[10px] text-red-500">LINE未連携</span>
                    )}
                  </div>
                </label>
              ))}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setShowTestSendModal(null)}
                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 text-sm font-medium transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={executeTestSend}
                disabled={selectedTestIds.length === 0}
                className="flex-1 px-4 py-2.5 bg-amber-500 text-white rounded-xl hover:bg-amber-600 disabled:opacity-40 text-sm font-medium transition-colors"
              >
                {selectedTestIds.length}人に送信
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- テンプレート変数ハイライト ---------- */
function HighlightVariables({ text }: { text: string }) {
  // {変数名} を色付きで表示するためにパーツに分割
  const parts = text.split(/(\{[^}]+\})/g);
  return (
    <>
      {parts.map((part, i) =>
        /^\{[^}]+\}$/.test(part) ? (
          <span key={i} className="bg-blue-100 text-blue-700 rounded px-0.5 font-mono text-xs">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

/* Flex簡易プレビュー（FlexPreviewRenderer に統合済み・削除） */
