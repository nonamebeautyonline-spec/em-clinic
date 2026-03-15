"use client";

import type { IconTextBlockProps } from "@/lib/flex-editor/block-types";

interface Props {
  props: IconTextBlockProps & { blockType: "icon_text" };
  onUpdate: (updates: Partial<IconTextBlockProps>) => void;
}

const SIZE_OPTIONS = [
  { value: "xs", label: "小" },
  { value: "sm", label: "やや小" },
  { value: "md", label: "標準" },
  { value: "lg", label: "大" },
];

export function IconTextBlockEditor({ props, onUpdate }: Props) {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-[11px] font-medium text-gray-500 mb-1 block">アイコンURL（任意）</label>
        <input
          type="text"
          value={props.iconUrl || ""}
          onChange={(e) => onUpdate({ iconUrl: e.target.value })}
          placeholder="https://...（空の場合●表示）"
          className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-green-500/30 bg-white"
        />
      </div>
      <div>
        <label className="text-[11px] font-medium text-gray-500 mb-1 block">テキスト</label>
        <input
          type="text"
          value={props.text || ""}
          onChange={(e) => onUpdate({ text: e.target.value })}
          placeholder="営業時間 10:00〜18:00"
          className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 bg-white"
        />
      </div>
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="text-[11px] font-medium text-gray-500 mb-1 block">サイズ</label>
          <select value={props.size || "md"} onChange={(e) => onUpdate({ size: e.target.value })}
            className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-green-500/30 bg-white">
            {SIZE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="flex-1">
          <label className="text-[11px] font-medium text-gray-500 mb-1 block">色</label>
          <input type="color" value={props.color || "#666666"} onChange={(e) => onUpdate({ color: e.target.value })}
            className="w-full h-8 border border-gray-200 rounded-lg cursor-pointer" />
        </div>
      </div>
    </div>
  );
}
