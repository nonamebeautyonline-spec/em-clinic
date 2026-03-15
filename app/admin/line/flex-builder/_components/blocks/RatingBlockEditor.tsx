"use client";

import type { RatingBlockProps } from "@/lib/flex-editor/block-types";

interface Props {
  props: RatingBlockProps & { blockType: "rating" };
  onUpdate: (updates: Partial<RatingBlockProps>) => void;
}

export function RatingBlockEditor({ props, onUpdate }: Props) {
  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="text-[11px] font-medium text-gray-500 mb-1 block">スコア</label>
          <input type="number" value={props.score} onChange={(e) => onUpdate({ score: parseFloat(e.target.value) || 0 })}
            min={0} max={props.maxScore} step={0.5}
            className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 bg-white" />
        </div>
        <div className="flex-1">
          <label className="text-[11px] font-medium text-gray-500 mb-1 block">満点</label>
          <input type="number" value={props.maxScore} onChange={(e) => onUpdate({ maxScore: parseInt(e.target.value) || 5 })}
            min={1} max={10}
            className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 bg-white" />
        </div>
      </div>
      <div>
        <label className="text-[11px] font-medium text-gray-500 mb-1 block">ラベル（任意）</label>
        <input type="text" value={props.label || ""} onChange={(e) => onUpdate({ label: e.target.value })}
          placeholder="口コミ評価"
          className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 bg-white" />
      </div>
      <div>
        <label className="text-[11px] font-medium text-gray-500 mb-1 block">星の色</label>
        <input type="color" value={props.color || "#FFB800"} onChange={(e) => onUpdate({ color: e.target.value })}
          className="w-full h-8 border border-gray-200 rounded-lg cursor-pointer" />
      </div>
    </div>
  );
}
