"use client";

import { useBlockEditor, useBlockEditorDispatch } from "./BlockEditorContext";

export function PanelNavigator() {
  const { panels, activePanelIndex } = useBlockEditor();
  const dispatch = useBlockEditorDispatch();

  const total = panels.length;
  const current = activePanelIndex + 1;
  const canPrev = activePanelIndex > 0;
  const canNext = activePanelIndex < total - 1;
  const canDelete = total > 1;
  const canAdd = total < 12;

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-gray-200 flex-shrink-0">
      {/* パネル番号 */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-bold text-gray-700">
          パネル {current} / {total}
        </span>
      </div>

      <div className="flex-1" />

      {/* ナビゲーションボタン */}
      <div className="flex items-center gap-1">
        {/* 前のパネルへ */}
        <NavButton
          onClick={() => dispatch({ type: "SELECT_PANEL", index: activePanelIndex - 1 })}
          disabled={!canPrev}
          title="前のパネル"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </NavButton>

        {/* 次のパネルへ */}
        <NavButton
          onClick={() => dispatch({ type: "SELECT_PANEL", index: activePanelIndex + 1 })}
          disabled={!canNext}
          title="次のパネル"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </NavButton>
      </div>

      <div className="w-px h-5 bg-gray-200 mx-1" />

      {/* 前に移動 */}
      <TextButton
        onClick={() => dispatch({ type: "MOVE_PANEL", index: activePanelIndex, direction: "prev" })}
        disabled={!canPrev}
      >
        前に移動
      </TextButton>

      {/* 後に移動 */}
      <TextButton
        onClick={() => dispatch({ type: "MOVE_PANEL", index: activePanelIndex, direction: "next" })}
        disabled={!canNext}
      >
        後に移動
      </TextButton>

      <div className="w-px h-5 bg-gray-200 mx-1" />

      {/* 複製 */}
      <TextButton
        onClick={() => dispatch({ type: "DUPLICATE_PANEL", index: activePanelIndex })}
        disabled={!canAdd}
      >
        複製
      </TextButton>

      {/* 新規 */}
      <TextButton
        onClick={() => dispatch({ type: "ADD_PANEL" })}
        disabled={!canAdd}
        accent
      >
        新規
      </TextButton>

      {/* 削除 */}
      <TextButton
        onClick={() => dispatch({ type: "DELETE_PANEL", index: activePanelIndex })}
        disabled={!canDelete}
        danger
      >
        削除
      </TextButton>
    </div>
  );
}

function NavButton({
  children,
  onClick,
  disabled,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="p-1.5 text-gray-500 hover:text-gray-700 disabled:opacity-30 rounded transition-colors"
      title={title}
    >
      {children}
    </button>
  );
}

function TextButton({
  children,
  onClick,
  disabled,
  accent,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  accent?: boolean;
  danger?: boolean;
}) {
  let colorClass = "text-gray-600 hover:text-gray-800 hover:bg-gray-100";
  if (accent) colorClass = "text-green-600 hover:text-green-700 hover:bg-green-50";
  if (danger) colorClass = "text-red-500 hover:text-red-600 hover:bg-red-50";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-2 py-1 text-xs font-medium rounded transition-colors disabled:opacity-30 ${colorClass}`}
    >
      {children}
    </button>
  );
}
