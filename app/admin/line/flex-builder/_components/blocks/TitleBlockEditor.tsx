"use client";

import type { TitleBlockProps } from "@/lib/flex-editor/block-types";

interface TitleBlockEditorProps {
  props: TitleBlockProps & { blockType: "title" };
  onUpdate: (updates: Partial<TitleBlockProps>) => void;
}

export function TitleBlockEditor({ props, onUpdate }: TitleBlockEditorProps) {
  const maxLen = 20;
  const subMaxLen = 40;

  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[11px] font-medium text-gray-500">タイトル</label>
          <span className={`text-[10px] ${props.text.length > maxLen ? "text-red-500" : "text-gray-400"}`}>
            {props.text.length} / {maxLen}
          </span>
        </div>
        <input
          type="text"
          value={props.text}
          onChange={(e) => onUpdate({ text: e.target.value })}
          placeholder="タイトルを入力"
          maxLength={maxLen}
          className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 bg-white"
        />
      </div>

      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={!!props.subtitle}
            onChange={(e) => onUpdate({ subtitle: e.target.checked ? "" : undefined })}
            className="w-3.5 h-3.5 rounded border-gray-300 text-green-600 focus:ring-green-500"
          />
          <span className="text-xs text-gray-600">サブタイトル</span>
        </label>
        {props.subtitle !== undefined && (
          <div className="mt-2">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] text-gray-400">サブタイトル</label>
              <span className={`text-[10px] ${(props.subtitle || "").length > subMaxLen ? "text-red-500" : "text-gray-400"}`}>
                {(props.subtitle || "").length} / {subMaxLen}
              </span>
            </div>
            <input
              type="text"
              value={props.subtitle || ""}
              onChange={(e) => onUpdate({ subtitle: e.target.value })}
              placeholder="サブタイトルを入力"
              maxLength={subMaxLen}
              className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-green-500/30 bg-white"
            />
          </div>
        )}
      </div>
    </div>
  );
}
