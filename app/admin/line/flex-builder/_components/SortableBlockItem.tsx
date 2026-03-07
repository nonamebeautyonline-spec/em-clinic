"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { CSSProperties, ReactNode } from "react";

interface SortableBlockItemProps {
  id: string;
  children: ReactNode;
}

/**
 * SortableBlockItem
 * 各ブロックをドラッグ可能なコンテナでラップする。
 * ドラッグハンドル（≡アイコン）とソート用のスタイルを提供。
 */
export function SortableBlockItem({ id, children }: SortableBlockItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    position: "relative" as const,
  };

  return (
    <div ref={setNodeRef} style={style}>
      {/* ドラッグハンドル */}
      <div
        {...attributes}
        {...listeners}
        className="absolute left-1 top-2.5 z-10 cursor-grab active:cursor-grabbing p-1 text-gray-300 hover:text-gray-500 transition-colors"
        title="ドラッグして並び替え"
        aria-label="ドラッグハンドル"
        role="button"
        tabIndex={0}
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="5" cy="3" r="1.5" />
          <circle cx="11" cy="3" r="1.5" />
          <circle cx="5" cy="8" r="1.5" />
          <circle cx="11" cy="8" r="1.5" />
          <circle cx="5" cy="13" r="1.5" />
          <circle cx="11" cy="13" r="1.5" />
        </svg>
      </div>
      {children}
    </div>
  );
}
