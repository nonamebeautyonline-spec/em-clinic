"use client";

import type { BadgeBlockProps } from "@/lib/flex-editor/block-types";

interface Props {
  props: BadgeBlockProps & { blockType: "badge" };
  onUpdate: (updates: Partial<BadgeBlockProps>) => void;
}

const BADGE_COLOR_PRESETS = [
  { value: "#06C755", label: "グリーン" },
  { value: "#FF6B6B", label: "レッド" },
  { value: "#4285F4", label: "ブルー" },
  { value: "#FF9800", label: "オレンジ" },
  { value: "#9C27B0", label: "パープル" },
  { value: "#333333", label: "ダーク" },
];

export function BadgeBlockEditor({ props, onUpdate }: Props) {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-[11px] font-medium text-gray-500 mb-1 block">テキスト</label>
        <input type="text" value={props.text || ""} onChange={(e) => onUpdate({ text: e.target.value })}
          placeholder="NEW / SALE / 残りわずか"
          className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 bg-white" />
      </div>
      <div>
        <label className="text-[11px] font-medium text-gray-500 mb-1 block">バッジの色</label>
        <div className="flex items-center gap-1.5">
          {BADGE_COLOR_PRESETS.map(c => (
            <button key={c.value} onClick={() => onUpdate({ badgeColor: c.value })}
              className={`w-6 h-6 rounded-full border-2 transition-all ${props.badgeColor === c.value ? "border-blue-500 scale-110" : "border-gray-200"}`}
              style={{ backgroundColor: c.value }} title={c.label} />
          ))}
        </div>
      </div>
    </div>
  );
}
