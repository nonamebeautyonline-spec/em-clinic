"use client";

import { useState, useRef } from "react";
import type { Template, Category, TemplateTab, CarouselPanel, FlexPreset } from "./template-types";
import {
  EMPTY_BUTTON, EMPTY_PANEL,
  isQaStyleFlex, qaFlexToPanels, qaPanelsToFlex, panelsToFlex,
  TEMPLATES_KEY,
} from "./template-types";
import { CarouselEditor } from "./CarouselEditor";
import { RichMessageEditor } from "./RichMessageEditor";
import { FlexPreviewRenderer } from "@/app/admin/line/flex-builder/page";
import { mutate } from "swr";
import type { ImagemapArea, LayoutKey } from "@/lib/line-imagemap";
import { areasFromLayout } from "@/lib/line-imagemap";

interface TemplateEditorProps {
  editingTemplate: Template | null;
  categories: Category[];
  flexPresets: FlexPreset[];
  initialCategory: string;
  onClose: () => void;
  onOpenFlexBuilder?: (templateId: number | null) => void;
}

/* ---------- タブ定義（アイコン＋説明付きカード化） ---------- */

const TAB_ITEMS: { key: TemplateTab; label: string; description: string; icon: string }[] = [
  {
    key: "text",
    label: "テキスト",
    description: "シンプルなテキストメッセージ",
    icon: "M4 6h16M4 12h16m-7 6h7",
  },
  {
    key: "image",
    label: "画像",
    description: "画像を送信",
    icon: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z",
  },
  {
    key: "carousel",
    label: "カルーセル",
    description: "カード形式で複数の情報を横スクロール",
    icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10",
  },
  {
    key: "imagemap",
    label: "リッチメッセージ",
    description: "画像タップでURLやメッセージを設定",
    icon: "M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122",
  },
  {
    key: "flex",
    label: "Flex",
    description: "自由なレイアウトのリッチメッセージ",
    icon: "M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 8a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zm10 0a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1h-4a1 1 0 01-1-1v-6z",
  },
];

export function TemplateEditor({ editingTemplate, categories, flexPresets, initialCategory, onClose, onOpenFlexBuilder }: TemplateEditorProps) {
  // フォーム状態
  const [name, setName] = useState(editingTemplate?.name || "");
  const [content, setContent] = useState(
    editingTemplate && editingTemplate.message_type !== "image" && editingTemplate.message_type !== "flex"
      ? editingTemplate.content
      : ""
  );
  const [category, setCategory] = useState(editingTemplate?.category || initialCategory);
  const [saving, setSaving] = useState(false);

  // Imagemap
  const getInitialImagemapUrl = () => {
    if (editingTemplate?.message_type === "imagemap") return editingTemplate.content;
    return "";
  };
  const getInitialImagemapAreas = (): ImagemapArea[] => {
    if (editingTemplate?.message_type === "imagemap" && editingTemplate.imagemap_actions) {
      const data = editingTemplate.imagemap_actions as { areas?: ImagemapArea[] };
      return data.areas || areasFromLayout("full");
    }
    return areasFromLayout("full");
  };
  const getInitialImagemapLayout = (): LayoutKey => {
    if (editingTemplate?.message_type === "imagemap" && editingTemplate.imagemap_actions) {
      const data = editingTemplate.imagemap_actions as { layout?: string };
      return (data.layout as LayoutKey) || "full";
    }
    return "full";
  };
  const [imagemapUrl, setImagemapUrl] = useState(getInitialImagemapUrl());
  const [imagemapAreas, setImagemapAreas] = useState<ImagemapArea[]>(getInitialImagemapAreas());
  const [imagemapLayout, setImagemapLayout] = useState<LayoutKey>(getInitialImagemapLayout());

  // タブ判定
  const getInitialTab = (): TemplateTab => {
    if (!editingTemplate) return "text";
    if (editingTemplate.message_type === "imagemap") return "imagemap";
    if (editingTemplate.message_type === "image") return "image";
    if (editingTemplate.message_type === "flex" && editingTemplate.flex_content) {
      return isQaStyleFlex(editingTemplate.flex_content) ? "carousel" : "flex";
    }
    return "text";
  };
  const [activeTab, setActiveTab] = useState<TemplateTab>(getInitialTab());

  // 画像
  const [imageUrl, setImageUrl] = useState(
    editingTemplate?.message_type === "image" ? editingTemplate.content : ""
  );
  const [uploading, setUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // カルーセル
  const getInitialPanels = (): CarouselPanel[] => {
    if (editingTemplate?.message_type === "flex" && editingTemplate.flex_content && isQaStyleFlex(editingTemplate.flex_content)) {
      return qaFlexToPanels(editingTemplate.flex_content);
    }
    return [{ ...EMPTY_PANEL, buttons: [{ ...EMPTY_BUTTON }] }];
  };
  const [panels, setPanels] = useState<CarouselPanel[]>(getInitialPanels());

  // Flex JSON
  const [flexJson, setFlexJson] = useState(
    editingTemplate?.message_type === "flex" && editingTemplate.flex_content && !isQaStyleFlex(editingTemplate.flex_content)
      ? JSON.stringify(editingTemplate.flex_content, null, 2)
      : ""
  );
  const [flexError, setFlexError] = useState("");
  const [showJsonPaste, setShowJsonPaste] = useState(false);
  const [jsonPasteValue, setJsonPasteValue] = useState("");

  const canSave = name.trim() && (
    activeTab === "text" ? content.trim() :
    activeTab === "image" ? imageUrl :
    activeTab === "carousel" ? panels.some(p => p.qaMode ? p.title.trim() : (p.title.trim() || p.body.trim())) :
    activeTab === "flex" ? flexJson.trim() && !flexError :
    activeTab === "imagemap" ? imagemapUrl && imagemapAreas.some(a => a.action.value.trim()) :
    false
  );

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/line/upload-template-image", {
        method: "POST", credentials: "include", body: formData,
      });
      if (!res.ok) {
        const data = await res.json();
        alert((data.message || data.error) || "画像アップロード失敗");
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

    let imagemapActionsPayload: Record<string, unknown> | null = null;

    if (activeTab === "imagemap") {
      if (!imagemapUrl) { alert("画像をアップロードしてください"); return; }
      if (!imagemapAreas.some(a => a.action.value.trim())) { alert("少なくとも1つのエリアにアクションを設定してください"); return; }
      saveContent = imagemapUrl;
      saveType = "imagemap";
      imagemapActionsPayload = {
        baseSize: { width: 1040, height: 1040 },
        layout: imagemapLayout,
        areas: imagemapAreas,
      };
    } else if (activeTab === "image") {
      if (!imageUrl) { alert("画像をアップロードしてください"); return; }
      saveContent = imageUrl;
      saveType = "image";
    } else if (activeTab === "carousel") {
      const isQa = panels.some(p => p.qaMode);
      if (isQa) {
        const validPanels = panels.filter(p => p.qaMode && p.title.trim());
        if (validPanels.length === 0) { alert("カードを1つ以上作成してください"); return; }
        flexContent = qaPanelsToFlex(validPanels);
      } else {
        const validPanels = panels.filter(p => p.title.trim() || p.body.trim() || p.imageUrl);
        if (validPanels.length === 0) { alert("パネルを1つ以上作成してください"); return; }
        flexContent = panelsToFlex(validPanels);
      }
      saveType = "flex";
    } else if (activeTab === "flex") {
      if (!flexJson.trim()) { alert("Flex JSONを入力してください"); return; }
      try {
        flexContent = JSON.parse(flexJson);
      } catch {
        alert("JSON形式が不正です"); return;
      }
      saveType = "flex";
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
      body: JSON.stringify({ name: name.trim(), content: saveContent, message_type: saveType, category, flex_content: flexContent, imagemap_actions: imagemapActionsPayload }),
    });

    if (res.ok) {
      mutate(TEMPLATES_KEY);
      onClose();
    } else {
      const data = await res.json();
      alert((data.message || data.error) || "保存失敗");
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className={`bg-white rounded-2xl w-full shadow-2xl max-h-[90vh] flex flex-col transition-all ${activeTab === "flex" ? "max-w-6xl" : activeTab === "imagemap" ? "max-w-3xl" : "max-w-2xl"}`} onClick={(e) => e.stopPropagation()}>
        {/* ヘッダー */}
        <div className="px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-900 text-lg">
              {editingTemplate ? "テンプレート編集" : "テンプレート登録"}
            </h2>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
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

          {/* タブ切替（カード形式） */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">メッセージタイプ</label>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
              {TAB_ITEMS.map(tab => (
                <button
                  key={tab.key}
                  onClick={async () => {
                    setActiveTab(tab.key);
                  }}
                  className={`relative flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border-2 transition-all text-center ${
                    activeTab === tab.key
                      ? "border-[#06C755] bg-green-50/50 shadow-sm"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <svg className={`w-5 h-5 ${activeTab === tab.key ? "text-[#06C755]" : "text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={tab.icon} />
                  </svg>
                  <span className={`text-xs font-medium ${activeTab === tab.key ? "text-[#06C755]" : "text-gray-600"}`}>
                    {tab.label}
                  </span>
                  <span className="text-[10px] text-gray-400 leading-tight">{tab.description}</span>
                  {activeTab === tab.key && (
                    <div className="absolute -top-px -right-px w-4 h-4 bg-[#06C755] rounded-bl-lg rounded-tr-[10px] flex items-center justify-center">
                      <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
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
              <div className="flex items-center gap-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-t-xl border-b-0">
                <button className="px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded hover:bg-gray-300"
                  onClick={() => { setContent(content + "{name}"); }}
                >名前</button>
                <button className="px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded hover:bg-gray-300"
                  onClick={() => { setContent(content + "{patient_id}"); }}
                >患者ID</button>
                <button className="px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded hover:bg-gray-300"
                  onClick={() => { setContent(content + "{send_date}"); }}
                >送信日</button>
                <button className="px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded hover:bg-gray-300"
                  onClick={() => { setContent(content + "{next_reservation_date}"); }}
                >次回予約日</button>
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

          {/* カルーセル */}
          {activeTab === "carousel" && (
            <CarouselEditor panels={panels} setPanels={setPanels} />
          )}

          {/* リッチメッセージ（Imagemap） */}
          {activeTab === "imagemap" && (
            <RichMessageEditor
              imageUrl={imagemapUrl}
              setImageUrl={setImagemapUrl}
              areas={imagemapAreas}
              setAreas={setImagemapAreas}
              layout={imagemapLayout}
              setLayout={setImagemapLayout}
            />
          )}

          {/* Flex */}
          {activeTab === "flex" && (
            <div className="space-y-5">
              {/* 2モード選択 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* テンプレートから作る */}
                <button
                  onClick={() => {
                    if (onOpenFlexBuilder) {
                      onClose();
                      onOpenFlexBuilder(editingTemplate?.id ?? null);
                    }
                  }}
                  className="group text-left p-5 bg-white rounded-xl border-2 border-green-200 hover:border-green-400 hover:shadow-lg transition-all"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-800">テンプレートから作る</h3>
                      <span className="inline-block px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] font-medium rounded-full">おすすめ</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    テンプレートを選んで、テキストや画像を差し替えるだけで完成
                  </p>
                </button>

                {/* ゼロから作る */}
                <button
                  onClick={async () => {
                    if (onOpenFlexBuilder) {
                      // 新規の場合: 空テンプレートを保存してから遷移
                      if (!editingTemplate) {
                        const tmpName = name.trim() || "FLEXテンプレート";
                        const res = await fetch("/api/admin/line/templates", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          credentials: "include",
                          body: JSON.stringify({ name: tmpName, content: "", message_type: "flex", category, flex_content: null }),
                        });
                        if (res.ok) {
                          const data = await res.json();
                          const newId = data.id || data.template?.id;
                          if (newId) {
                            onClose();
                            onOpenFlexBuilder(newId);
                            return;
                          }
                        }
                        alert("テンプレートの作成に失敗しました");
                        return;
                      }
                      onClose();
                      onOpenFlexBuilder(editingTemplate.id);
                    }
                  }}
                  className="group text-left p-5 bg-white rounded-xl border-2 border-gray-200 hover:border-blue-400 hover:shadow-lg transition-all"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-800">ゼロから作る</h3>
                      <span className="inline-block px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-medium rounded-full">上級者向け</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    空のキャンバスからブロックを追加して自由にデザイン
                  </p>
                </button>
              </div>

              {/* よく使われるプリセット */}
              {flexPresets.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-gray-500 mb-2">よく使われるテンプレート</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {flexPresets.slice(0, 6).map((preset) => (
                      <button
                        key={preset.id}
                        onClick={async () => {
                          // プリセット選択 → テンプレート保存 → FLEXビルダーで開く
                          const tmpName = name.trim() || preset.name;
                          const res = await fetch("/api/admin/line/templates", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            credentials: "include",
                            body: JSON.stringify({
                              name: tmpName,
                              content: "",
                              message_type: "flex",
                              category,
                              flex_content: preset.flex_json,
                            }),
                          });
                          if (res.ok) {
                            const data = await res.json();
                            const newId = data.id || data.template?.id;
                            if (newId && onOpenFlexBuilder) {
                              onClose();
                              onOpenFlexBuilder(newId);
                              return;
                            }
                          }
                          alert("テンプレートの作成に失敗しました");
                        }}
                        className="group text-left p-3 bg-white rounded-lg border border-gray-200 hover:border-green-400 hover:shadow-md transition-all"
                      >
                        <span className="text-xs font-medium text-gray-800 block truncate group-hover:text-green-700">
                          {preset.name}
                        </span>
                        {preset.description && (
                          <span className="text-[10px] text-gray-400 block mt-0.5 truncate">
                            {preset.description}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3 flex-shrink-0">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 text-sm font-medium transition-colors">
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
  );
}
