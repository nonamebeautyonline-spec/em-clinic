"use client";

import { useState, useEffect, useCallback } from "react";

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
  const [presets, setPresets] = useState<FlexPreset[]>([]);
  const [savedTemplates, setSavedTemplates] = useState<SavedTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  // エディタ状態
  const [flexJson, setFlexJson] = useState<string>("");
  const [editName, setEditName] = useState("新しいFlexテンプレート");
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [presetRes, tplRes] = await Promise.all([
        fetch("/api/admin/line/flex-presets", { credentials: "include" }),
        fetch("/api/admin/line/templates", { credentials: "include" }),
      ]);
      if (presetRes.ok) {
        const d = await presetRes.json();
        setPresets(d.presets || []);
      }
      if (tplRes.ok) {
        const d = await tplRes.json();
        // flex テンプレートのみ抽出
        const flexTpls = (d.templates || []).filter(
          (t: SavedTemplate) => t.message_type === "flex" && t.flex_content
        );
        setSavedTemplates(flexTpls);
      }
    } catch (e) {
      console.error("データ取得エラー:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // プリセット選択
  const selectPreset = (preset: FlexPreset) => {
    setFlexJson(JSON.stringify(preset.flex_json, null, 2));
    setEditName(preset.name);
    setEditingTemplateId(null);
    setJsonError(null);
  };

  // 保存済みテンプレート選択
  const selectTemplate = (tpl: SavedTemplate) => {
    setFlexJson(JSON.stringify(tpl.flex_content, null, 2));
    setEditName(tpl.name);
    setEditingTemplateId(tpl.id);
    setJsonError(null);
  };

  // JSON 検証
  const validateJson = (text: string): Record<string, unknown> | null => {
    try {
      const parsed = JSON.parse(text);
      if (typeof parsed !== "object" || parsed === null) {
        setJsonError("JSONオブジェクトを入力してください");
        return null;
      }
      setJsonError(null);
      return parsed;
    } catch {
      setJsonError("JSON形式が不正です");
      return null;
    }
  };

  // JSON入力変更
  const handleJsonChange = (text: string) => {
    setFlexJson(text);
    if (text.trim()) validateJson(text);
    else setJsonError(null);
  };

  // 整形
  const formatJson = () => {
    const parsed = validateJson(flexJson);
    if (parsed) {
      setFlexJson(JSON.stringify(parsed, null, 2));
    }
  };

  // テンプレートとして保存
  const handleSave = async () => {
    const parsed = validateJson(flexJson);
    if (!parsed) return;
    if (!editName.trim()) {
      alert("テンプレート名を入力してください");
      return;
    }

    setSaving(true);
    try {
      if (editingTemplateId) {
        // 更新
        const res = await fetch(`/api/admin/line/templates/${editingTemplateId}`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: editName.trim(),
            content: "",
            message_type: "flex",
            flex_content: parsed,
          }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          alert(d.error || "更新に失敗しました");
          return;
        }
      } else {
        // 新規作成
        const res = await fetch("/api/admin/line/templates", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: editName.trim(),
            content: "",
            message_type: "flex",
            flex_content: parsed,
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

  // プレビューデータ
  let previewData: Record<string, unknown> | null = null;
  if (flexJson.trim()) {
    try {
      previewData = JSON.parse(flexJson);
    } catch {
      // ignore
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-[#06C755] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Flex Messageビルダー</h1>
          <p className="text-sm text-gray-500 mt-1">
            プリセットを選んで編集し、テンプレートとして保存できます
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 左: プリセット & 保存済み */}
        <div className="lg:col-span-1 space-y-4">
          {/* プリセット */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h2 className="text-sm font-bold text-gray-700 mb-3">プリセット</h2>
            <div className="space-y-2">
              {presets.map((p) => (
                <button
                  key={p.id}
                  onClick={() => selectPreset(p)}
                  className="w-full text-left px-3 py-2.5 rounded-lg border border-gray-200 hover:border-[#06C755] hover:bg-green-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-800">{p.name}</span>
                    <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                      {CATEGORIES[p.category] || p.category}
                    </span>
                  </div>
                  {p.description && (
                    <p className="text-xs text-gray-400 mt-0.5">{p.description}</p>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* 保存済みFlex テンプレート */}
          {savedTemplates.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h2 className="text-sm font-bold text-gray-700 mb-3">保存済みFlexテンプレート</h2>
              <div className="space-y-1.5">
                {savedTemplates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => selectTemplate(t)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      editingTemplateId === t.id
                        ? "bg-green-50 border border-[#06C755] text-[#06C755] font-medium"
                        : "border border-gray-200 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 中央+右: エディタ & プレビュー */}
        <div className="lg:col-span-2 space-y-4">
          {/* テンプレート名 & 保存 */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="テンプレート名"
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06C755]"
              />
              <button
                onClick={handleSave}
                disabled={saving || !flexJson.trim() || !!jsonError}
                className="px-5 py-2 bg-[#06C755] text-white text-sm font-medium rounded-lg hover:bg-[#05b34c] disabled:opacity-50 transition-colors"
              >
                {saving ? "保存中..." : editingTemplateId ? "更新" : "保存"}
              </button>
            </div>
          </div>

          {/* JSONエディタ & プレビュー */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* JSONエディタ */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-100">
                <span className="text-xs font-medium text-gray-600">JSON エディタ</span>
                <button
                  onClick={formatJson}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  整形
                </button>
              </div>
              <textarea
                value={flexJson}
                onChange={(e) => handleJsonChange(e.target.value)}
                placeholder="プリセットを選択するか、Flex Message JSON を直接入力..."
                rows={20}
                className="w-full px-4 py-3 text-xs font-mono text-gray-800 focus:outline-none resize-none"
                spellCheck={false}
              />
              {jsonError && (
                <div className="px-4 py-2 bg-red-50 text-red-600 text-xs border-t border-red-100">
                  {jsonError}
                </div>
              )}
            </div>

            {/* プレビュー */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-100">
                <span className="text-xs font-medium text-gray-600">プレビュー</span>
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  {showPreview ? "非表示" : "表示"}
                </button>
              </div>
              {showPreview && (
                <div className="p-4 bg-[#7494c0] min-h-[400px]">
                  {previewData ? (
                    <FlexPreviewRenderer data={previewData} />
                  ) : (
                    <div className="text-center text-white/60 text-sm py-20">
                      プリセットを選択またはJSONを入力してください
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
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
  const hero = bubble.hero as Record<string, unknown> | undefined;
  const body = bubble.body as Record<string, unknown> | undefined;
  const footer = bubble.footer as Record<string, unknown> | undefined;

  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-lg">
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
