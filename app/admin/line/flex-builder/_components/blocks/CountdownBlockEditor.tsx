"use client";

import type { CountdownBlockProps } from "@/lib/flex-editor/block-types";

interface Props {
  props: CountdownBlockProps & { blockType: "countdown" };
  onUpdate: (updates: Partial<CountdownBlockProps>) => void;
}

export function CountdownBlockEditor({ props, onUpdate }: Props) {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-[11px] font-medium text-gray-500 mb-1 block">ラベル</label>
        <input type="text" value={props.label || ""} onChange={(e) => onUpdate({ label: e.target.value })}
          placeholder="キャンペーン終了まで"
          className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 bg-white" />
      </div>
      <div>
        <label className="text-[11px] font-medium text-gray-500 mb-1 block">終了日</label>
        <input type="date" value={props.endDate || ""} onChange={(e) => onUpdate({ endDate: e.target.value })}
          className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 bg-white" />
      </div>
      <div>
        <label className="text-[11px] font-medium text-gray-500 mb-1 block">色</label>
        <input type="color" value={props.color || "#06C755"} onChange={(e) => onUpdate({ color: e.target.value })}
          className="w-full h-8 border border-gray-200 rounded-lg cursor-pointer" />
      </div>
    </div>
  );
}
