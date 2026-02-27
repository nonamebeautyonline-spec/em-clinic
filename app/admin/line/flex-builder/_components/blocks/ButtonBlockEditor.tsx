"use client";

import type { ButtonBlockProps } from "@/lib/flex-editor/block-types";
import { ActionEditor } from "./ActionEditor";

interface ButtonBlockEditorProps {
  props: ButtonBlockProps & { blockType: "button" };
  onUpdate: (updates: Partial<ButtonBlockProps>) => void;
}

export function ButtonBlockEditor({ props, onUpdate }: ButtonBlockEditorProps) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-[11px] font-medium text-gray-500 mb-1">ラベル</label>
        <input
          type="text"
          value={props.label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          placeholder="ボタンのテキスト"
          className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 bg-white"
        />
      </div>

      <div>
        <label className="block text-[11px] font-medium text-gray-500 mb-1">種類</label>
        <div className="flex border border-gray-200 rounded-lg overflow-hidden">
          {[
            { value: "primary" as const, label: "メイン" },
            { value: "secondary" as const, label: "サブ" },
            { value: "link" as const, label: "リンク" },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => onUpdate({ style: opt.value })}
              className={`flex-1 px-2 py-1.5 text-[11px] font-medium transition-colors ${
                props.style === opt.value
                  ? "bg-gray-800 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-medium text-gray-500 mb-1">色</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={props.color}
            onChange={(e) => onUpdate({ color: e.target.value })}
            className="w-8 h-8 rounded border border-gray-200 cursor-pointer p-0.5"
          />
          <input
            type="text"
            value={props.color}
            onChange={(e) => onUpdate({ color: e.target.value })}
            className="flex-1 px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-green-500/30 bg-white"
          />
        </div>
      </div>

      <ActionEditor
        action={props.action}
        onChange={(action) => onUpdate({ action })}
      />
    </div>
  );
}
