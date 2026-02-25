"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { FlexEditorProvider, useFlexEditor, useFlexEditorDispatch } from "./_components/FlexEditorContext";
import { StructureTree } from "./_components/StructureTree";
import { InteractivePreview } from "./_components/InteractivePreview";
import { PropertyPanel } from "./_components/PropertyPanel";

/* ---------- バブルtype補完ユーティリティ ---------- */
function ensureBubbleTypes(obj: unknown): unknown {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(ensureBubbleTypes);
  const o = obj as Record<string, unknown>;
  // bubble構造（header/hero/body/footerを持つ）なのにtype未設定 → type: "bubble" 追加
  if (!o.type && (o.header || o.hero || o.body || o.footer)) {
    return { type: "bubble", ...Object.fromEntries(Object.entries(o).map(([k, v]) => [k, k === "contents" || k === "header" || k === "hero" || k === "body" || k === "footer" ? ensureBubbleTypes(v) : v])) };
  }
  // carousel → 内部contentsを再帰
  if (o.type === "carousel" && Array.isArray(o.contents)) {
    return { ...o, contents: o.contents.map(ensureBubbleTypes) };
  }
  return o;
}

/* ---------- 型定義 ---------- */
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

const CATEGORIES: Record<string, string> = {
  button: "ボタン型",
  confirm: "確認型",
  image_text: "画像+テキスト",
  carousel: "カルーセル",
  receipt: "レシート型",
  general: "汎用",
};

/* ---------- メインページ ---------- */
export default function FlexBuilderPage() {
  return (
    <FlexEditorProvider>
      <Suspense fallback={
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-[#06C755] border-t-transparent" />
        </div>
      }>
        <FlexBuilderInner />
      </Suspense>
    </FlexEditorProvider>
  );
}

function FlexBuilderInner() {
  const searchParams = useSearchParams();
  const { flexData, jsonMode, historyIndex, history } = useFlexEditor();
  const dispatch = useFlexEditorDispatch();

  const [presets, setPresets] = useState<FlexPreset[]>([]);
  const [savedTemplates, setSavedTemplates] = useState<SavedTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editName, setEditName] = useState("新しいFlexテンプレート");
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
          (t: SavedTemplate) => t.message_type === "flex" && t.flex_content
        );
        setSavedTemplates(loadedTemplates);
      }

      // URL ?template={id} の自動読み込み
      const templateId = searchParams.get("template");
      if (templateId) {
        const tpl = loadedTemplates.find((t) => t.id === Number(templateId));
        if (tpl && tpl.flex_content) {
          dispatch({ type: "SET_DATA", data: tpl.flex_content });
          setEditName(tpl.name);
          setEditingTemplateId(tpl.id);
          setJsonText(JSON.stringify(tpl.flex_content, null, 2));
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

  // flexData変更時にJSONテキストを同期
  useEffect(() => {
    if (flexData && !jsonMode) {
      setJsonText(JSON.stringify(flexData, null, 2));
      setJsonError(null);
    }
  }, [flexData, jsonMode]);

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
    dispatch({ type: "SET_DATA", data: preset.flex_json });
    setEditName(preset.name);
    setEditingTemplateId(null);
    setJsonText(JSON.stringify(preset.flex_json, null, 2));
    setJsonError(null);
  };

  // 保存済みテンプレート選択
  const selectTemplate = (tpl: SavedTemplate) => {
    if (!tpl.flex_content) return;
    dispatch({ type: "SET_DATA", data: tpl.flex_content });
    setEditName(tpl.name);
    setEditingTemplateId(tpl.id);
    setJsonText(JSON.stringify(tpl.flex_content, null, 2));
    setJsonError(null);
  };

  // JSON → ビジュアル適用
  const applyJson = () => {
    try {
      const parsed = JSON.parse(jsonText);
      if (typeof parsed !== "object" || parsed === null) {
        setJsonError("JSONオブジェクトを入力してください");
        return;
      }
      dispatch({ type: "SET_DATA", data: parsed });
      setJsonError(null);
    } catch {
      setJsonError("JSON形式が不正です");
    }
  };

  // テンプレートとして保存
  const handleSave = async () => {
    if (!flexData) {
      alert("Flexデータがありません");
      return;
    }
    if (!editName.trim()) {
      alert("テンプレート名を入力してください");
      return;
    }

    // 保存前にバブルのtype補完（エディタ操作でtype: "bubble"が消える場合の対策）
    const saveData = ensureBubbleTypes(flexData);

    setSaving(true);
    try {
      if (editingTemplateId) {
        const res = await fetch(`/api/admin/line/templates/${editingTemplateId}`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: editName.trim(),
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
            name: editName.trim(),
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
        setEditingTemplateId(d.template?.id || null);
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
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
          title="サイドバー切替"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <h1 className="text-sm font-bold text-gray-800 whitespace-nowrap">Flexエディタ</h1>

        <input
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          placeholder="テンプレート名"
          className="flex-1 max-w-[300px] px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06C755]"
        />

        {/* Undo/Redo */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => dispatch({ type: "UNDO" })}
            disabled={historyIndex <= 0}
            className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 rounded"
            title="元に戻す (⌘Z)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </button>
          <button
            onClick={() => dispatch({ type: "REDO" })}
            disabled={historyIndex >= history.length - 1}
            className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 rounded"
            title="やり直し (⌘⇧Z)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" />
            </svg>
          </button>
        </div>

        {/* JSON切替 */}
        <button
          onClick={() => {
            if (jsonMode && jsonText.trim()) {
              applyJson();
            }
            dispatch({ type: "TOGGLE_JSON" });
          }}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            jsonMode ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {jsonMode ? "ビジュアル" : "JSON"}
        </button>

        {/* 保存 */}
        <button
          onClick={handleSave}
          disabled={saving || !flexData}
          className="px-4 py-1.5 bg-[#06C755] text-white text-sm font-medium rounded-lg hover:bg-[#05b34c] disabled:opacity-50 transition-colors"
        >
          {saving ? "保存中..." : editingTemplateId ? "更新" : "保存"}
        </button>
      </div>

      {/* メインエリア */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左サイドバー: プリセット + 保存済み + StructureTree */}
        {sidebarOpen && (
          <div className="w-[220px] border-r border-gray-200 bg-white flex flex-col flex-shrink-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {/* プリセット */}
              <div>
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">プリセット</h3>
                <div className="space-y-1">
                  {presets.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => selectPreset(p)}
                      className="w-full text-left px-2.5 py-2 rounded-lg border border-gray-100 hover:border-[#06C755] hover:bg-green-50 transition-colors"
                    >
                      <span className="text-xs font-medium text-gray-700 block truncate">{p.name}</span>
                      <span className="text-[10px] text-gray-400">{CATEGORIES[p.category] || p.category}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 保存済みテンプレート */}
              {savedTemplates.length > 0 && (
                <div>
                  <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">保存済み</h3>
                  <div className="space-y-1">
                    {savedTemplates.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => selectTemplate(t)}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                          editingTemplateId === t.id
                            ? "bg-green-50 border border-[#06C755] text-[#06C755] font-medium"
                            : "border border-gray-100 text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 構造ツリー */}
              {flexData && (
                <div>
                  <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">構造</h3>
                  <StructureTree />
                </div>
              )}
            </div>
          </div>
        )}

        {/* 中央: プレビュー or JSONエディタ */}
        <div className="flex-1 overflow-auto bg-[#7494c0]">
          {jsonMode ? (
            <div className="h-full flex flex-col bg-white">
              <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-100">
                <span className="text-xs font-medium text-gray-600">JSON エディタ</span>
                <div className="flex items-center gap-2">
                  {jsonError && <span className="text-xs text-red-500">{jsonError}</span>}
                  <button
                    onClick={() => {
                      try {
                        const parsed = JSON.parse(jsonText);
                        setJsonText(JSON.stringify(parsed, null, 2));
                        setJsonError(null);
                      } catch {
                        setJsonError("JSON形式が不正です");
                      }
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    整形
                  </button>
                  <button
                    onClick={applyJson}
                    className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    適用
                  </button>
                </div>
              </div>
              <textarea
                value={jsonText}
                onChange={(e) => {
                  setJsonText(e.target.value);
                  setJsonError(null);
                }}
                className="flex-1 px-4 py-3 text-xs font-mono text-gray-800 focus:outline-none resize-none"
                spellCheck={false}
                placeholder="Flex Message JSON を入力..."
              />
            </div>
          ) : (
            <div className="p-6 min-h-full flex items-start justify-center">
              {flexData ? (
                <InteractivePreview />
              ) : (
                <div className="text-center text-white/60 text-sm py-20">
                  左のプリセットを選択してください
                </div>
              )}
            </div>
          )}
        </div>

        {/* 右: プロパティパネル */}
        {!jsonMode && flexData && (
          <div className="w-[280px] border-l border-gray-200 bg-white flex-shrink-0 overflow-y-auto">
            <PropertyPanel />
          </div>
        )}
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
      {/* Header */}
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

      {/* Hero（画像） */}
      {hero && hero.type === "image" && (
        <div
          className="w-full bg-gray-200 bg-cover bg-center"
          style={{
            backgroundImage: `url(${hero.url})`,
            aspectRatio: (hero.aspectRatio as string) || "2/1",
          }}
        />
      )}

      {/* Body */}
      {body && (
        <div className="px-4 py-3">
          <BoxRenderer box={body} />
        </div>
      )}

      {/* Footer */}
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
