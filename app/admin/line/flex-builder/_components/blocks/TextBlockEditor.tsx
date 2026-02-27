"use client";

import type { TextBlockProps } from "@/lib/flex-editor/block-types";

interface TextBlockEditorProps {
  props: TextBlockProps & { blockType: "text" };
  onUpdate: (updates: Partial<TextBlockProps>) => void;
}

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
