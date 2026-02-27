"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { BlockEditorProvider, useBlockEditor, useBlockEditorDispatch } from "./_components/BlockEditorContext";
import { PanelSettingsBar } from "./_components/PanelSettingsBar";
import { PanelNavigator } from "./_components/PanelNavigator";
import { BlockPreview } from "./_components/BlockPreview";
import { BlockSettingsPanel } from "./_components/BlockSettingsPanel";
import { editorPanelsToFlex } from "@/lib/flex-editor/block-mapping";
import { sanitizeFlexContents } from "@/lib/flex-sanitize";

/* ---------- バブルtype補完ユーティリティ ---------- */
function ensureBubbleTypes(obj: unknown): unknown {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(ensureBubbleTypes);
  const o = obj as Record<string, unknown>;
  if (o.type === "carousel" && Array.isArray(o.contents)) {
    return { ...o, contents: o.contents.map(ensureBubbleTypes) };
  }
  if ((o.header || o.hero || o.body || o.footer) && o.type !== "bubble") {
    return { ...o, type: "bubble" };
  }
  return o;
}

/* ---------- 型定義（テンプレートページからインポートされる） ---------- */
export interface FlexPreset {
  id: number;
  name: string;
  category: string;
  description: string | null;
  flex_json: Record<string, unknown>;
  sort_order: number;
}

interface SavedTemplate {
  id: number;
  name: string;
  message_type: string;
  flex_content: Record<string, unknown> | null;
}

/* ---------- メインページ ---------- */
export default function FlexBuilderPage() {
  return (
    <BlockEditorProvider>
      <Suspense fallback={
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-[#06C755] border-t-transparent" />
        </div>
      }>
        <FlexBuilderInner />
      </Suspense>
    </BlockEditorProvider>
  );
}

function FlexBuilderInner() {
  const searchParams = useSearchParams();
  const { panels, templateName, editingTemplateId, historyIndex, history } = useBlockEditor();
  const dispatch = useBlockEditorDispatch();

  const [presets, setPresets] = useState<FlexPreset[]>([]);
  const [savedTemplates, setSavedTemplates] = useState<SavedTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPresets, setShowPresets] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [presetRes, tplRes] = await Promise.all([
        fetch("/api/admin/line/flex-presets", { credentials: "include" }),
        fetch("/api/admin/line/templates", { credentials: "include" }),
      ]);
      let loadedPresets: FlexPreset[] = [];
      let loadedTemplates: SavedTemplate[] = [];

      if (presetRes.ok) {
        const d = await presetRes.json();
        loadedPresets = d.presets || [];
        setPresets(loadedPresets);
      }
      if (tplRes.ok) {
        const d = await tplRes.json();
        loadedTemplates = (d.templates || []).filter(
          (t: SavedTemplate) => t.message_type === "flex" && t.flex_content,
        );
        setSavedTemplates(loadedTemplates);
      }

      // URL ?template={id} の自動読み込み
      const templateId = searchParams.get("template");
      if (templateId) {
        const tpl = loadedTemplates.find((t) => t.id === Number(templateId));
        if (tpl && tpl.flex_content) {
          dispatch({
            type: "LOAD_FLEX_DATA",
            flexData: tpl.flex_content,
            name: tpl.name,
            templateId: tpl.id,
          });
        }
      }
    } catch (e) {
      console.error("データ取得エラー:", e);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // キーボードショートカット
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        dispatch({ type: "UNDO" });
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        dispatch({ type: "REDO" });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dispatch]);

  // プリセット選択
  const selectPreset = (preset: FlexPreset) => {
    dispatch({
      type: "LOAD_FLEX_DATA",
      flexData: preset.flex_json,
      name: preset.name,
      templateId: null,
    });
    setShowPresets(false);
  };

  // 保存済みテンプレート選択
  const selectTemplate = (tpl: SavedTemplate) => {
    if (!tpl.flex_content) return;
    dispatch({
      type: "LOAD_FLEX_DATA",
      flexData: tpl.flex_content,
      name: tpl.name,
      templateId: tpl.id,
    });
    setShowPresets(false);
  };

  // テンプレートとして保存
  const handleSave = async () => {
    if (!templateName.trim()) {
      alert("テンプレート名を入力してください");
      return;
    }

    // ブロック → Flex JSON変換
    const flexData = editorPanelsToFlex(panels);
    const saveData = sanitizeFlexContents(ensureBubbleTypes(flexData));

    setSaving(true);
    try {
      if (editingTemplateId) {
        const res = await fetch(`/api/admin/line/templates/${editingTemplateId}`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: templateName.trim(),
            content: "",
            message_type: "flex",
            flex_content: saveData,
          }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          alert(d.error || "更新に失敗しました");
          return;
        }
      } else {
        const res = await fetch("/api/admin/line/templates", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: templateName.trim(),
            content: "",
            message_type: "flex",
            flex_content: saveData,
          }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          alert(d.error || "保存に失敗しました");
          return;
        }
        const d = await res.json();
        dispatch({ type: "SET_EDITING_ID", id: d.template?.id || null });
      }
      loadData();
      alert("保存しました");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-[#06C755] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* ヘッダーバー */}
      <div className="flex items-center gap-3 px-4 py-2 bg-white border-b border-gray-200 flex-shrink-0">
        {/* プリセット/テンプレート選択 */}
        <div className="relative">
          <button
            onClick={() => setShowPresets(!showPresets)}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
            title="テンプレートから選択"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {showPresets && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowPresets(false)} />
              <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 w-[260px] max-h-[400px] overflow-y-auto">
                {/* プリセット */}
                {presets.length > 0 && (
                  <div className="p-3">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">プリセット</h4>
                    <div className="space-y-1">
                      {presets.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => selectPreset(p)}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-green-50 hover:text-green-700 transition-colors"
                        >
                          <span className="text-xs font-medium text-gray-700 block">{p.name}</span>
                          {p.description && (
                            <span className="text-[10px] text-gray-400 block mt-0.5">{p.description}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 保存済み */}
                {savedTemplates.length > 0 && (
                  <div className="p-3 border-t border-gray-100">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">保存済み</h4>
                    <div className="space-y-1">
                      {savedTemplates.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => selectTemplate(t)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${
                            editingTemplateId === t.id
                              ? "bg-green-50 text-green-700 font-medium"
                              : "text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          {t.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <h1 className="text-sm font-bold text-gray-800 whitespace-nowrap">メッセージ作成</h1>

        <input
          type="text"
          value={templateName}
          onChange={(e) => dispatch({ type: "SET_TEMPLATE_NAME", name: e.target.value })}
          placeholder="テンプレート名"
          className="flex-1 max-w-[300px] px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06C755]"
        />

        {/* Undo/Redo */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => dispatch({ type: "UNDO" })}
            disabled={historyIndex <= 0}
            className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 rounded"
            title="元に戻す (Ctrl+Z)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </button>
          <button
            onClick={() => dispatch({ type: "REDO" })}
            disabled={historyIndex >= history.length - 1}
            className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 rounded"
            title="やり直し (Ctrl+Shift+Z)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" />
            </svg>
          </button>
        </div>

        {/* メッセージを保存 */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-1.5 bg-[#06C755] text-white text-sm font-medium rounded-lg hover:bg-[#05b34c] disabled:opacity-50 transition-colors"
        >
          {saving ? "保存中..." : editingTemplateId ? "メッセージを更新" : "メッセージを保存"}
        </button>
      </div>

      {/* パネル設定バー */}
      <PanelSettingsBar />

      {/* パネルナビゲーション */}
      <PanelNavigator />

      {/* メインエリア: プレビュー + ブロック設定 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左: プレビュー */}
        <div className="flex-1 overflow-auto bg-[#7494c0]">
          <BlockPreview />
        </div>

        {/* 右: ブロック設定 */}
        <div className="w-[400px] border-l border-gray-200 bg-white flex-shrink-0 overflow-hidden">
          <BlockSettingsPanel />
        </div>
      </div>
    </div>
  );
}

/* ---------- Flexプレビューレンダラー（named export: テンプレートページ等から再利用可能） ---------- */
export function FlexPreviewRenderer({ data }: { data: Record<string, unknown> }) {
  const type = data.type as string;

  if (type === "carousel") {
    const contents = (data.contents || []) as Record<string, unknown>[];
    return (
      <div className="flex gap-2 overflow-x-auto pb-2">
        {contents.map((bubble, i) => (
          <div key={i} className="flex-shrink-0 w-[260px]">
            <BubbleRenderer bubble={bubble} />
          </div>
        ))}
      </div>
    );
  }

  if (type === "bubble") {
    return (
      <div className="max-w-[300px] mx-auto">
        <BubbleRenderer bubble={data} />
      </div>
    );
  }

  return (
    <div className="text-white/60 text-xs text-center py-10">
      対応していないFlexタイプです: {type || "不明"}
    </div>
  );
}

function BubbleRenderer({ bubble }: { bubble: Record<string, unknown> }) {
  const header = bubble.header as Record<string, unknown> | undefined;
  const hero = bubble.hero as Record<string, unknown> | undefined;
  const body = bubble.body as Record<string, unknown> | undefined;
  const footer = bubble.footer as Record<string, unknown> | undefined;

  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-lg">
      {header && (
        <div
          className="px-4 py-3"
          style={{
            backgroundColor: (header.backgroundColor as string) || undefined,
            ...(header.paddingAll ? { padding: header.paddingAll as string } : {}),
          }}
        >
          <BoxRenderer box={header} />
        </div>
      )}
      {hero && hero.type === "image" && (
        <div
          className="w-full bg-gray-200 bg-cover bg-center"
          style={{
            backgroundImage: `url(${hero.url})`,
            aspectRatio: (hero.aspectRatio as string) || "2/1",
          }}
        />
      )}
      {body && (
        <div className="px-4 py-3">
          <BoxRenderer box={body} />
        </div>
      )}
      {footer && (
        <div className="px-4 pb-3">
          <BoxRenderer box={footer} />
        </div>
      )}
    </div>
  );
}

function BoxRenderer({ box }: { box: Record<string, unknown> }) {
  const layout = box.layout as string;
  const contents = (box.contents || []) as Record<string, unknown>[];
  const spacing = box.spacing as string;
  const margin = box.margin as string;

  const gapClass = spacing === "sm" ? "gap-1.5" : spacing === "md" ? "gap-2" : spacing === "lg" ? "gap-3" : "gap-1";
  const marginClass = margin === "sm" ? "mt-1" : margin === "md" ? "mt-2" : margin === "lg" ? "mt-3" : margin === "xl" ? "mt-4" : "";

  return (
    <div className={`flex ${layout === "horizontal" ? "flex-row" : "flex-col"} ${gapClass} ${marginClass}`}>
      {contents.map((item, i) => (
        <FlexElementRenderer key={i} element={item} />
      ))}
    </div>
  );
}

function FlexElementRenderer({ element }: { element: Record<string, unknown> }) {
  const type = element.type as string;

  if (type === "text") {
    const weight = element.weight === "bold" ? "font-bold" : "";
    const size = element.size as string;
    const sizeClass =
      size === "xxs" ? "text-[9px]" :
      size === "xs" ? "text-[10px]" :
      size === "sm" ? "text-xs" :
      size === "md" ? "text-sm" :
      size === "lg" ? "text-base" :
      size === "xl" ? "text-lg" :
      size === "xxl" ? "text-xl" : "text-sm";
    const color = element.color as string;
    const align = element.align as string;
    const alignClass = align === "center" ? "text-center" : align === "end" ? "text-right" : "";
    const wrap = element.wrap ? "" : "truncate";
    const flex = element.flex as number | undefined;
    const margin = element.margin as string;
    const marginClass = margin === "sm" ? "mt-1" : margin === "md" ? "mt-2" : margin === "lg" ? "mt-3" : "";

    return (
      <span
        className={`${sizeClass} ${weight} ${alignClass} ${wrap} ${marginClass} leading-snug`}
        style={{ color: color || "#111", flex: flex !== undefined ? flex : undefined }}
      >
        {element.text as string}
      </span>
    );
  }

  if (type === "button") {
    const style = element.style as string;
    const action = element.action as Record<string, unknown>;
    const color = element.color as string;
    return (
      <div
        className={`py-2 px-4 rounded-lg text-center text-sm font-medium ${
          style === "primary"
            ? "text-white"
            : "bg-gray-100 text-gray-700 border border-gray-200"
        }`}
        style={style === "primary" ? { backgroundColor: color || "#06C755" } : undefined}
      >
        {(action?.label as string) || "ボタン"}
      </div>
    );
  }

  if (type === "separator") {
    const margin = element.margin as string;
    const marginClass = margin === "sm" ? "my-1" : margin === "md" ? "my-2" : margin === "lg" ? "my-3" : "my-1";
    return <hr className={`border-gray-200 ${marginClass}`} />;
  }

  if (type === "box") {
    return <BoxRenderer box={element} />;
  }

  if (type === "image") {
    return (
      <div
        className="w-full bg-gray-200 bg-cover bg-center rounded"
        style={{
          backgroundImage: `url(${element.url})`,
          aspectRatio: (element.aspectRatio as string) || "1/1",
          minHeight: "60px",
        }}
      />
    );
  }

  return null;
}
