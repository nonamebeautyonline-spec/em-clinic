"use client";

import type { MapLinkBlockProps } from "@/lib/flex-editor/block-types";

interface Props {
  props: MapLinkBlockProps & { blockType: "map_link" };
  onUpdate: (updates: Partial<MapLinkBlockProps>) => void;
}

export function MapLinkBlockEditor({ props, onUpdate }: Props) {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-[11px] font-medium text-gray-500 mb-1 block">住所</label>
        <input type="text" value={props.address || ""} onChange={(e) => onUpdate({ address: e.target.value })}
          placeholder="東京都渋谷区..."
          className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 bg-white" />
      </div>
      <div>
        <label className="text-[11px] font-medium text-gray-500 mb-1 block">ボタンラベル</label>
        <input type="text" value={props.label || ""} onChange={(e) => onUpdate({ label: e.target.value })}
          placeholder="地図で見る"
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
