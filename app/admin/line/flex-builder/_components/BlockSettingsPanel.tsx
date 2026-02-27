"use client";

import { useBlockEditor, useBlockEditorDispatch } from "./BlockEditorContext";
import { BLOCK_TYPE_LABELS } from "@/lib/flex-editor/block-types";
import { BlockAddDropdown } from "./BlockAddDropdown";
import { TitleBlockEditor } from "./blocks/TitleBlockEditor";
import { TextBlockEditor } from "./blocks/TextBlockEditor";
import { ImageBlockEditor } from "./blocks/ImageBlockEditor";
import { ButtonBlockEditor } from "./blocks/ButtonBlockEditor";
import { SeparatorBlockEditor } from "./blocks/SeparatorBlockEditor";

export function BlockSettingsPanel() {
  const { panels, activePanelIndex, selectedBlockId } = useBlockEditor();
  const dispatch = useBlockEditorDispatch();
  const panel = panels[activePanelIndex];
  if (!panel) return null;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* ヘッダー: ブロック追加 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white flex-shrink-0">
        <span className="text-sm font-bold text-gray-700">ブロック設定</span>
        <BlockAddDropdown />
      </div>

      {/* ブロック一覧 */}
      <div className="flex-1 overflow-y-auto">
        {panel.blocks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 px-6">
            <svg className="w-12 h-12 mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
            </svg>
            <p className="text-sm text-center">
              右上の「ブロックを追加」<br />から作成してください
            </p>
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {panel.blocks.map((block, index) => {
              const isSelected = selectedBlockId === block.id;
              const isFirst = index === 0;
              const isLast = index === panel.blocks.length - 1;

              return (
                <div
                  key={block.id}
                  className={`border rounded-xl transition-colors ${
                    isSelected
                      ? "border-green-400 bg-green-50/50 shadow-sm"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                  onClick={() => dispatch({ type: "SELECT_BLOCK", blockId: block.id })}
                >
                  {/* ブロックヘッダー */}
                  <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-5 h-5 bg-green-600 text-white text-[10px] font-bold rounded-full">
                        {index + 1}
                      </span>
                      <span className="text-xs font-bold text-gray-700">
                        {BLOCK_TYPE_LABELS[block.props.blockType]}
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      {/* 上移動 */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          dispatch({ type: "MOVE_BLOCK", blockId: block.id, direction: "up" });
                        }}
                        disabled={isFirst}
                        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-20 rounded transition-colors"
                        title="上に移動"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      {/* 下移動 */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          dispatch({ type: "MOVE_BLOCK", blockId: block.id, direction: "down" });
                        }}
                        disabled={isLast}
                        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-20 rounded transition-colors"
                        title="下に移動"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {/* 削除 */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          dispatch({ type: "DELETE_BLOCK", blockId: block.id });
                        }}
                        className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
                        title="削除"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* ブロック設定フォーム */}
                  <div className="px-3 py-3">
                    <BlockEditor block={block} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/** ブロックタイプ別エディタの振り分け */
function BlockEditor({ block }: { block: { id: string; props: import("@/lib/flex-editor/block-types").BlockProps } }) {
  const dispatch = useBlockEditorDispatch();
  const { props } = block;

  const onUpdate = (updates: Record<string, unknown>) => {
    dispatch({ type: "UPDATE_BLOCK", blockId: block.id, updates: updates as Partial<import("@/lib/flex-editor/block-types").BlockProps> });
  };

  switch (props.blockType) {
    case "title":
      return <TitleBlockEditor props={props} onUpdate={onUpdate} />;
    case "text":
      return <TextBlockEditor props={props} onUpdate={onUpdate} />;
    case "image":
      return <ImageBlockEditor props={props} onUpdate={onUpdate} />;
    case "button":
      return <ButtonBlockEditor props={props} onUpdate={onUpdate} />;
    case "separator":
      return <SeparatorBlockEditor />;
    default:
      return null;
  }
}
