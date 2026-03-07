"use client";

import { useDraggable } from "@dnd-kit/core";
import { TOOLBOX_PREFIX } from "@/lib/flex-editor/dnd-utils";
import type { BlockType } from "@/lib/flex-editor/block-types";

interface DraggableToolboxItemProps {
  blockType: BlockType;
  label: string;
  icon: string;
  /** クリック時のフォールバック（ドラッグしなくてもクリックで追加可能） */
  onClick: () => void;
}

/**
 * DraggableToolboxItem
 * ツールバー内の各ブロックタイプをドラッグ可能にする。
 * ドラッグインでブロック追加、またはクリックでも追加可能。
 */
export function DraggableToolboxItem({
  blockType,
  label,
  icon,
  onClick,
}: DraggableToolboxItemProps) {
  const dragId = `${TOOLBOX_PREFIX}${blockType}`;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: dragId,
  });

  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={`w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 flex items-center gap-3 transition-colors cursor-grab active:cursor-grabbing ${
        isDragging ? "opacity-40" : ""
      }`}
      aria-label={`${label}をドラッグして追加`}
    >
      <span className="w-5 text-center text-xs opacity-60">{icon}</span>
      {label}
      <span className="ml-auto text-[10px] text-gray-300">ドラッグ</span>
    </button>
  );
}
