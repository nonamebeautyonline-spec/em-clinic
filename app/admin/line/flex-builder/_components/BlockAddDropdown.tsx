"use client";

import { useState } from "react";
import { useBlockEditorDispatch } from "./BlockEditorContext";
import { BLOCK_TYPE_LABELS, BLOCK_TYPE_ICONS, type BlockType } from "@/lib/flex-editor/block-types";

const BLOCK_MENU_ITEMS: { type: BlockType; label: string; icon: string }[] = [
  { type: "image", label: BLOCK_TYPE_LABELS.image, icon: BLOCK_TYPE_ICONS.image },
  { type: "title", label: BLOCK_TYPE_LABELS.title, icon: BLOCK_TYPE_ICONS.title },
  { type: "text", label: BLOCK_TYPE_LABELS.text, icon: BLOCK_TYPE_ICONS.text },
  { type: "button", label: BLOCK_TYPE_LABELS.button, icon: BLOCK_TYPE_ICONS.button },
  { type: "separator", label: BLOCK_TYPE_LABELS.separator, icon: BLOCK_TYPE_ICONS.separator },
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
          <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1.5 min-w-[160px]">
            {BLOCK_MENU_ITEMS.map((item) => (
              <button
                key={item.type}
                onClick={() => {
                  dispatch({ type: "ADD_BLOCK", blockType: item.type });
                  setOpen(false);
                }}
                className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 flex items-center gap-3 transition-colors"
              >
                <span className="w-5 text-center text-xs opacity-60">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
