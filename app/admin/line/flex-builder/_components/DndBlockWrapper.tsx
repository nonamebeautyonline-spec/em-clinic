"use client";

import { useState, useCallback, useMemo, type ReactNode } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useBlockEditor, useBlockEditorDispatch } from "./BlockEditorContext";
import {
  isToolboxDragId,
  parseToolboxBlockType,
} from "@/lib/flex-editor/dnd-utils";
import {
  createDefaultBlockProps,
  generateBlockId,
  BLOCK_TYPE_LABELS,
  BLOCK_TYPE_ICONS,
  type BlockType,
} from "@/lib/flex-editor/block-types";

/**
 * DndBlockWrapper
 * ブロック設定パネルをDndContextでラップし、
 * ソート（並べ替え）とツールバーからのドラッグインの両方を処理する。
 */
export function DndBlockWrapper({ children }: { children: ReactNode }) {
  const { panels, activePanelIndex } = useBlockEditor();
  const dispatch = useBlockEditorDispatch();
  const panel = panels[activePanelIndex];

  const [activeId, setActiveId] = useState<string | null>(null);

  // センサー設定: ポインタ + キーボード
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        // 8pxの移動で有効化（クリックと区別）
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // ブロックIDリスト（SortableContext用）
  const blockIds = useMemo(
    () => (panel?.blocks || []).map((b) => b.id),
    [panel?.blocks],
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;
      if (!over || !panel) return;

      const activeIdStr = String(active.id);
      const overIdStr = String(over.id);

      // ツールバーからのドラッグイン
      if (isToolboxDragId(activeIdStr)) {
        const blockType = parseToolboxBlockType(activeIdStr);
        if (!blockType) return;

        const newBlock = {
          id: generateBlockId(),
          props: createDefaultBlockProps(blockType, panel.settings.themeColor),
        };

        dispatch({
          type: "INSERT_BLOCK_AT",
          block: newBlock,
          overId: isToolboxDragId(overIdStr) ? null : overIdStr,
        });
        return;
      }

      // 既存ブロックの並べ替え
      if (activeIdStr !== overIdStr && !isToolboxDragId(overIdStr)) {
        dispatch({
          type: "REORDER_BLOCKS",
          activeId: activeIdStr,
          overId: overIdStr,
        });
      }
    },
    [dispatch, panel],
  );

  // ドラッグ中のオーバーレイ表示内容
  const overlayContent = useMemo(() => {
    if (!activeId) return null;

    // ツールバーアイテムのオーバーレイ
    if (isToolboxDragId(activeId)) {
      const blockType = parseToolboxBlockType(activeId);
      if (!blockType) return null;
      return (
        <div className="px-4 py-3 bg-white border-2 border-green-400 rounded-xl shadow-xl text-sm font-medium text-gray-700 flex items-center gap-2 min-w-[140px]">
          <span className="text-xs opacity-60">{BLOCK_TYPE_ICONS[blockType]}</span>
          {BLOCK_TYPE_LABELS[blockType]}
        </div>
      );
    }

    // 既存ブロックのオーバーレイ
    const block = panel?.blocks.find((b) => b.id === activeId);
    if (!block) return null;
    const index = panel?.blocks.findIndex((b) => b.id === activeId) ?? -1;
    return (
      <div className="px-4 py-3 bg-white border-2 border-green-400 rounded-xl shadow-xl text-sm font-medium text-gray-700 flex items-center gap-2 min-w-[180px] opacity-90">
        <span className="flex items-center justify-center w-5 h-5 bg-green-600 text-white text-[10px] font-bold rounded-full">
          {index + 1}
        </span>
        {BLOCK_TYPE_LABELS[block.props.blockType]}
      </div>
    );
  }, [activeId, panel?.blocks]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      // アクセシビリティ用のアナウンス設定
      accessibility={{
        announcements: {
          onDragStart({ active }) {
            const id = String(active.id);
            if (isToolboxDragId(id)) {
              const bt = parseToolboxBlockType(id);
              return `${bt ? BLOCK_TYPE_LABELS[bt as BlockType] : "ブロック"}をドラッグ中`;
            }
            return "ブロックをドラッグ中";
          },
          onDragOver({ over }) {
            if (over) return "ドロップ可能な位置です";
            return "ドロップ位置の外です";
          },
          onDragEnd({ over }) {
            if (over) return "ブロックをドロップしました";
            return "ドラッグをキャンセルしました";
          },
          onDragCancel() {
            return "ドラッグをキャンセルしました";
          },
        },
      }}
    >
      <SortableContext items={blockIds} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
      <DragOverlay dropAnimation={null}>
        {overlayContent}
      </DragOverlay>
    </DndContext>
  );
}
