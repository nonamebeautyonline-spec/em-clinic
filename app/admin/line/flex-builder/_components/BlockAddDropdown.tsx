"use client";

import { useState } from "react";
import { useBlockEditorDispatch } from "./BlockEditorContext";
import { BLOCK_TYPE_LABELS, BLOCK_TYPE_ICONS, type BlockType } from "@/lib/flex-editor/block-types";
import { DraggableToolboxItem } from "./DraggableToolboxItem";

interface BlockMenuItem {
  type: BlockType;
  label: string;
  icon: string;
  group?: string;
}

const BLOCK_MENU_ITEMS: BlockMenuItem[] = [
  // 基本ブロック
  { type: "image", label: BLOCK_TYPE_LABELS.image, icon: BLOCK_TYPE_ICONS.image, group: "基本" },
  { type: "title", label: BLOCK_TYPE_LABELS.title, icon: BLOCK_TYPE_ICONS.title, group: "基本" },
  { type: "text", label: BLOCK_TYPE_LABELS.text, icon: BLOCK_TYPE_ICONS.text, group: "基本" },
  { type: "button", label: BLOCK_TYPE_LABELS.button, icon: BLOCK_TYPE_ICONS.button, group: "基本" },
  { type: "separator", label: BLOCK_TYPE_LABELS.separator, icon: BLOCK_TYPE_ICONS.separator, group: "基本" },
  // 拡張ブロック
  { type: "icon_text", label: BLOCK_TYPE_LABELS.icon_text, icon: BLOCK_TYPE_ICONS.icon_text, group: "拡張" },
  { type: "badge", label: BLOCK_TYPE_LABELS.badge, icon: BLOCK_TYPE_ICONS.badge, group: "拡張" },
  { type: "rating", label: BLOCK_TYPE_LABELS.rating, icon: BLOCK_TYPE_ICONS.rating, group: "拡張" },
  { type: "coupon", label: BLOCK_TYPE_LABELS.coupon, icon: BLOCK_TYPE_ICONS.coupon, group: "拡張" },
  { type: "countdown", label: BLOCK_TYPE_LABELS.countdown, icon: BLOCK_TYPE_ICONS.countdown, group: "拡張" },
  { type: "map_link", label: BLOCK_TYPE_LABELS.map_link, icon: BLOCK_TYPE_ICONS.map_link, group: "拡張" },
  { type: "video", label: BLOCK_TYPE_LABELS.video, icon: BLOCK_TYPE_ICONS.video, group: "拡張" },
];

export function BlockAddDropdown() {
  const [open, setOpen] = useState(false);
  const dispatch = useBlockEditorDispatch();

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-4 py-2 bg-[#06C755] text-white text-sm font-medium rounded-lg hover:bg-[#05b34c] transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        ブロックを追加
        <svg className="w-3 h-3 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1.5 min-w-[180px] max-h-[400px] overflow-y-auto">
            {["基本", "拡張"].map((group) => (
              <div key={group}>
                <div className="px-3 py-1 text-[10px] text-gray-400 font-medium">
                  {group}
                </div>
                {BLOCK_MENU_ITEMS.filter(item => item.group === group).map((item) => (
                  <DraggableToolboxItem
                    key={item.type}
                    blockType={item.type}
                    label={item.label}
                    icon={item.icon}
                    onClick={() => {
                      dispatch({ type: "ADD_BLOCK", blockType: item.type });
                      setOpen(false);
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
