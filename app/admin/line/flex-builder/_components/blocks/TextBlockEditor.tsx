"use client";

import type { TextBlockProps } from "@/lib/flex-editor/block-types";

interface TextBlockEditorProps {
  props: TextBlockProps & { blockType: "text" };
  onUpdate: (updates: Partial<TextBlockProps>) => void;
}

const TEXT_SIZE_OPTIONS = [
  { value: "xxs", label: "極小" },
  { value: "xs", label: "小" },
  { value: "sm", label: "やや小" },
  { value: "md", label: "標準" },
  { value: "lg", label: "大" },
  { value: "xl", label: "特大" },
];

const TEXT_COLOR_PRESETS = [
  "#666666", "#111111", "#999999", "#FF6B6B", "#06C755",
  "#4285F4", "#FF9800", "#9C27B0", "#ffffff",
];

export function TextBlockEditor({ props, onUpdate }: TextBlockEditorProps) {
  const maxLen = 300;

  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[11px] font-medium text-gray-500">テキスト</label>
          <span className={`text-[10px] ${props.text.length > maxLen ? "text-red-500" : "text-gray-400"}`}>
            {props.text.length} / {maxLen}
          </span>
        </div>
        <textarea
          value={props.text}
          onChange={(e) => onUpdate({ text: e.target.value })}
          placeholder="テキストを入力"
          maxLength={maxLen}
          rows={3}
          className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 bg-white resize-none"
        />
      </div>

      {/* サイズ・色・折り返し */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <label className="text-[11px] font-medium text-gray-500 mb-1 block">サイズ</label>
          <select
            value={props.size || "md"}
            onChange={(e) => onUpdate({ size: e.target.value === "md" ? undefined : e.target.value })}
            className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-green-500/30 bg-white"
          >
            {TEXT_SIZE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[11px] font-medium text-gray-500 mb-1 block">文字色</label>
          <div className="flex items-center gap-1">
            {TEXT_COLOR_PRESETS.map((c) => (
              <button
                key={c}
                onClick={() => onUpdate({ color: c === "#666666" ? undefined : c })}
                className={`w-5 h-5 rounded-full border-2 transition-all ${
                  (props.color || "#666666") === c ? "border-blue-500 scale-110" : "border-gray-200"
                }`}
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
          </div>
        </div>
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={props.wrap}
          onChange={(e) => onUpdate({ wrap: e.target.checked })}
          className="w-3.5 h-3.5 rounded border-gray-300 text-green-600 focus:ring-green-500"
        />
        <span className="text-xs text-gray-600">折り返し</span>
      </label>
    </div>
  );
}
