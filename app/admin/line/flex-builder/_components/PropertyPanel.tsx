"use client";

import { useFlexEditor, useFlexEditorDispatch } from "./FlexEditorContext";
import { getAtPath } from "@/lib/flex-editor/path-utils";
import {
  FLEX_SIZES, BUBBLE_SIZES, MARGIN_OPTIONS, ACTION_TYPES,
  BUTTON_STYLES, LAYOUT_OPTIONS, ASPECT_RATIOS, ELEMENT_TYPE_LABELS,
} from "@/lib/flex-editor/element-defaults";

type FlexObj = Record<string, unknown>;

// ── 共通UIコンポーネント ──

function PropField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

function PropInput({ value, onChange, placeholder, type = "text" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30 bg-white"
    />
  );
}

function PropTextarea({ value, onChange, rows = 3 }: {
  value: string; onChange: (v: string) => void; rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30 bg-white resize-none"
    />
  );
}

function PropSelect({ value, onChange, options }: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30 bg-white"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}

function PropColor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value || "#111111"}
        onChange={(e) => onChange(e.target.value)}
        className="w-8 h-8 rounded border border-gray-200 cursor-pointer p-0.5"
      />
      <input
        type="text"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder="#111111"
        className="flex-1 px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/30 bg-white"
      />
    </div>
  );
}

function PropToggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <div
        onClick={() => onChange(!value)}
        className={`w-8 h-4.5 rounded-full transition-colors ${value ? "bg-blue-500" : "bg-gray-200"} relative`}
      >
        <div className={`absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full shadow transition-transform ${value ? "translate-x-4" : "translate-x-0.5"}`} />
      </div>
      <span className="text-[11px] text-gray-600">{label}</span>
    </label>
  );
}

function PropButtonGroup({ value, onChange, options }: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  return (
    <div className="flex border border-gray-200 rounded-lg overflow-hidden">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`flex-1 px-2 py-1.5 text-[11px] font-medium transition-colors ${
            value === opt.value ? "bg-blue-500 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ── メインコンポーネント ──

export function PropertyPanel() {
  const { flexData, selectedPath } = useFlexEditor();
  const dispatch = useFlexEditorDispatch();

  if (!flexData || !selectedPath) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-300 text-3xl mb-3">👆</div>
        <p className="text-xs text-gray-400">プレビューまたはツリーから<br />要素を選択してください</p>
      </div>
    );
  }

  const element = getAtPath(flexData, selectedPath) as FlexObj | undefined;
  if (!element || typeof element !== "object") {
    return (
      <div className="text-center py-12">
        <p className="text-xs text-gray-400">要素が見つかりません</p>
      </div>
    );
  }

  const elementType = element.type as string;
  const update = (key: string, value: unknown) => {
    dispatch({ type: "UPDATE_AT_PATH", path: `${selectedPath}.${key}`, value });
  };

  const deleteElement = () => {
    dispatch({ type: "REMOVE_AT_PATH", path: selectedPath });
  };

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between pb-2 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded">
            {ELEMENT_TYPE_LABELS[elementType] || elementType}
          </span>
          <span className="text-[10px] text-gray-400 font-mono truncate max-w-[120px]">{selectedPath}</span>
        </div>
        <button
          onClick={deleteElement}
          className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
          title="削除"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* 要素タイプ別プロパティ */}
      {elementType === "text" && <TextProperties element={element} update={update} />}
      {elementType === "button" && <ButtonProperties element={element} update={update} selectedPath={selectedPath} dispatch={dispatch} />}
      {elementType === "image" && <ImageProperties element={element} update={update} />}
      {elementType === "box" && <BoxProperties element={element} update={update} />}
      {elementType === "separator" && <SeparatorProperties element={element} update={update} />}
      {elementType === "bubble" && <BubbleProperties element={element} update={update} selectedPath={selectedPath} dispatch={dispatch} />}
    </div>
  );
}

// ── テキストプロパティ ──

function TextProperties({ element, update }: { element: FlexObj; update: (k: string, v: unknown) => void }) {
  return (
    <div className="space-y-3">
      <PropField label="テキスト内容">
        <PropTextarea value={(element.text as string) || ""} onChange={(v) => update("text", v)} />
      </PropField>
      <PropField label="サイズ">
        <PropSelect value={(element.size as string) || "md"} onChange={(v) => update("size", v)} options={FLEX_SIZES} />
      </PropField>
      <PropField label="太さ">
        <PropButtonGroup
          value={(element.weight as string) || "regular"}
          onChange={(v) => update("weight", v === "regular" ? undefined : v)}
          options={[{ value: "regular", label: "通常" }, { value: "bold", label: "太字" }]}
        />
      </PropField>
      <PropField label="色">
        <PropColor value={(element.color as string) || "#111111"} onChange={(v) => update("color", v)} />
      </PropField>
      <PropField label="配置">
        <PropButtonGroup
          value={(element.align as string) || "start"}
          onChange={(v) => update("align", v === "start" ? undefined : v)}
          options={[{ value: "start", label: "左" }, { value: "center", label: "中央" }, { value: "end", label: "右" }]}
        />
      </PropField>
      <PropToggle value={!!element.wrap} onChange={(v) => update("wrap", v || undefined)} label="折り返し" />
      <PropField label="マージン">
        <PropSelect
          value={(element.margin as string) || "none"}
          onChange={(v) => update("margin", v === "none" ? undefined : v)}
          options={MARGIN_OPTIONS}
        />
      </PropField>
      <PropField label="flex値">
        <PropInput
          type="number"
          value={element.flex !== undefined ? String(element.flex) : ""}
          onChange={(v) => update("flex", v ? Number(v) : undefined)}
          placeholder="自動"
        />
      </PropField>
    </div>
  );
}

// ── ボタンプロパティ ──

function ButtonProperties({ element, update, selectedPath, dispatch }: {
  element: FlexObj; update: (k: string, v: unknown) => void;
  selectedPath: string; dispatch: ReturnType<typeof useFlexEditorDispatch>;
}) {
  const action = (element.action || {}) as FlexObj;
  const updateAction = (key: string, value: unknown) => {
    dispatch({ type: "UPDATE_AT_PATH", path: `${selectedPath}.action.${key}`, value });
  };

  return (
    <div className="space-y-3">
      <PropField label="ラベル">
        <PropInput value={(action.label as string) || ""} onChange={(v) => updateAction("label", v)} />
      </PropField>
      <PropField label="スタイル">
        <PropSelect value={(element.style as string) || "primary"} onChange={(v) => update("style", v)} options={BUTTON_STYLES} />
      </PropField>
      <PropField label="色">
        <PropColor value={(element.color as string) || "#06C755"} onChange={(v) => update("color", v)} />
      </PropField>
      <PropField label="アクション種別">
        <PropSelect value={(action.type as string) || "uri"} onChange={(v) => updateAction("type", v)} options={ACTION_TYPES} />
      </PropField>
      <PropField label={action.type === "uri" ? "URL" : action.type === "postback" ? "データ" : "メッセージ"}>
        <PropInput
          value={(action.type === "uri" ? action.uri : action.type === "postback" ? action.data : action.text) as string || ""}
          onChange={(v) => {
            if (action.type === "uri") updateAction("uri", v);
            else if (action.type === "postback") updateAction("data", v);
            else updateAction("text", v);
          }}
          placeholder={action.type === "uri" ? "https://..." : action.type === "postback" ? "action=xxx" : "テキスト"}
        />
      </PropField>
      <PropField label="高さ">
        <PropButtonGroup
          value={(element.height as string) || "md"}
          onChange={(v) => update("height", v === "md" ? undefined : v)}
          options={[{ value: "sm", label: "小" }, { value: "md", label: "中" }]}
        />
      </PropField>
      <PropField label="マージン">
        <PropSelect
          value={(element.margin as string) || "none"}
          onChange={(v) => update("margin", v === "none" ? undefined : v)}
          options={MARGIN_OPTIONS}
        />
      </PropField>
    </div>
  );
}

// ── 画像プロパティ ──

function ImageProperties({ element, update }: { element: FlexObj; update: (k: string, v: unknown) => void }) {
  return (
    <div className="space-y-3">
      <PropField label="画像URL">
        <PropInput value={(element.url as string) || ""} onChange={(v) => update("url", v)} placeholder="https://..." />
      </PropField>
      {!!(element.url as string) && (
        <div className="rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
          <img src={element.url as string} alt="" className="w-full max-h-[120px] object-contain" />
        </div>
      )}
      <PropField label="アスペクト比">
        <PropSelect value={(element.aspectRatio as string) || "20:13"} onChange={(v) => update("aspectRatio", v)} options={ASPECT_RATIOS} />
      </PropField>
      <PropField label="サイズ">
        <PropSelect
          value={(element.size as string) || "full"}
          onChange={(v) => update("size", v)}
          options={[
            { value: "xxs", label: "XXS" }, { value: "xs", label: "XS" }, { value: "sm", label: "S" },
            { value: "md", label: "M" }, { value: "lg", label: "L" }, { value: "xl", label: "XL" },
            { value: "xxl", label: "XXL" }, { value: "3xl", label: "3XL" }, { value: "4xl", label: "4XL" },
            { value: "5xl", label: "5XL" }, { value: "full", label: "Full" },
          ]}
        />
      </PropField>
      <PropField label="マージン">
        <PropSelect
          value={(element.margin as string) || "none"}
          onChange={(v) => update("margin", v === "none" ? undefined : v)}
          options={MARGIN_OPTIONS}
        />
      </PropField>
    </div>
  );
}

// ── ボックスプロパティ ──

function BoxProperties({ element, update }: { element: FlexObj; update: (k: string, v: unknown) => void }) {
  return (
    <div className="space-y-3">
      <PropField label="レイアウト">
        <PropSelect value={(element.layout as string) || "vertical"} onChange={(v) => update("layout", v)} options={LAYOUT_OPTIONS} />
      </PropField>
      <PropField label="間隔 (spacing)">
        <PropSelect
          value={(element.spacing as string) || "none"}
          onChange={(v) => update("spacing", v === "none" ? undefined : v)}
          options={MARGIN_OPTIONS}
        />
      </PropField>
      <PropField label="マージン">
        <PropSelect
          value={(element.margin as string) || "none"}
          onChange={(v) => update("margin", v === "none" ? undefined : v)}
          options={MARGIN_OPTIONS}
        />
      </PropField>
      <PropField label="背景色">
        <PropColor value={(element.backgroundColor as string) || ""} onChange={(v) => update("backgroundColor", v || undefined)} />
      </PropField>
      <PropField label="パディング">
        <PropInput value={(element.paddingAll as string) || ""} onChange={(v) => update("paddingAll", v || undefined)} placeholder="例: 20px" />
      </PropField>
    </div>
  );
}

// ── セパレータプロパティ ──

function SeparatorProperties({ element, update }: { element: FlexObj; update: (k: string, v: unknown) => void }) {
  return (
    <div className="space-y-3">
      <PropField label="マージン">
        <PropSelect
          value={(element.margin as string) || "none"}
          onChange={(v) => update("margin", v === "none" ? undefined : v)}
          options={MARGIN_OPTIONS}
        />
      </PropField>
      <PropField label="色">
        <PropColor value={(element.color as string) || ""} onChange={(v) => update("color", v || undefined)} />
      </PropField>
    </div>
  );
}

// ── バブルプロパティ ──

function BubbleProperties({ element, update, selectedPath, dispatch }: {
  element: FlexObj; update: (k: string, v: unknown) => void;
  selectedPath: string; dispatch: ReturnType<typeof useFlexEditorDispatch>;
}) {
  const hasHeader = !!element.header;
  const hasHero = !!element.hero;
  const hasBody = !!element.body;
  const hasFooter = !!element.footer;

  const toggleSection = (section: string, hasIt: boolean) => {
    if (hasIt) {
      dispatch({ type: "REMOVE_AT_PATH", path: selectedPath ? `${selectedPath}.${section}` : section });
    } else {
      const defaults: Record<string, unknown> = {
        header: { type: "box", layout: "vertical", contents: [{ type: "text", text: "ヘッダー", weight: "bold", size: "lg", color: "#ffffff" }], backgroundColor: "#06C755", paddingAll: "20px" },
        hero: { type: "image", url: "https://via.placeholder.com/600x400/e2e8f0/94a3b8?text=Hero", size: "full", aspectRatio: "20:13", aspectMode: "cover" },
        body: { type: "box", layout: "vertical", contents: [{ type: "text", text: "本文", size: "md", wrap: true }], spacing: "sm" },
        footer: { type: "box", layout: "vertical", contents: [{ type: "button", style: "primary", color: "#06C755", action: { type: "uri", label: "ボタン", uri: "https://example.com" } }], spacing: "sm" },
      };
      dispatch({ type: "UPDATE_AT_PATH", path: selectedPath ? `${selectedPath}.${section}` : section, value: defaults[section] });
    }
  };

  return (
    <div className="space-y-3">
      <PropField label="バブルサイズ">
        <PropSelect value={(element.size as string) || "mega"} onChange={(v) => update("size", v)} options={BUBBLE_SIZES} />
      </PropField>
      <PropField label="セクション">
        <div className="space-y-1.5">
          {(["header", "hero", "body", "footer"] as const).map((section) => {
            const hasIt = section === "header" ? hasHeader : section === "hero" ? hasHero : section === "body" ? hasBody : hasFooter;
            return (
              <label key={section} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasIt}
                  onChange={() => toggleSection(section, hasIt)}
                  className="w-3.5 h-3.5 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                />
                <span className="text-xs text-gray-700 capitalize">{section}</span>
              </label>
            );
          })}
        </div>
      </PropField>
    </div>
  );
}
