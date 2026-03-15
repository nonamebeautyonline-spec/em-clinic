"use client";

import type { CouponBlockProps } from "@/lib/flex-editor/block-types";

interface Props {
  props: CouponBlockProps & { blockType: "coupon" };
  onUpdate: (updates: Partial<CouponBlockProps>) => void;
}

export function CouponBlockEditor({ props, onUpdate }: Props) {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-[11px] font-medium text-gray-500 mb-1 block">クーポンコード</label>
        <input type="text" value={props.code || ""} onChange={(e) => onUpdate({ code: e.target.value.toUpperCase() })}
          placeholder="SPRING2026"
          className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500/30 bg-white" />
      </div>
      <div>
        <label className="text-[11px] font-medium text-gray-500 mb-1 block">ラベル</label>
        <input type="text" value={props.label || ""} onChange={(e) => onUpdate({ label: e.target.value })}
          placeholder="クーポンコード"
          className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 bg-white" />
      </div>
      <div>
        <label className="text-[11px] font-medium text-gray-500 mb-1 block">説明（任意）</label>
        <input type="text" value={props.description || ""} onChange={(e) => onUpdate({ description: e.target.value })}
          placeholder="このコードを提示で10%OFF"
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
