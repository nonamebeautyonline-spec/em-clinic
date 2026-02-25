"use client";

import { useState } from "react";
import { useFlexEditor, useFlexEditorDispatch } from "./FlexEditorContext";
import { getAtPath } from "@/lib/flex-editor/path-utils";
import { ELEMENT_TYPE_LABELS, ELEMENT_DEFAULTS, createEmptyBubble } from "@/lib/flex-editor/element-defaults";

type FlexObj = Record<string, unknown>;

// ── アイコン ──

const ICONS: Record<string, string> = {
  text: "T",
  button: "□",
  image: "🖼",
  separator: "—",
  box: "⊞",
  bubble: "◻",
  carousel: "⇿",
};

// ── メインコンポーネント ──

export function StructureTree() {
  const { flexData } = useFlexEditor();

  if (!flexData) {
    return (
      <div className="text-center py-8">
        <p className="text-xs text-gray-400">データなし</p>
      </div>
    );
  }

  const type = flexData.type as string;

  if (type === "carousel") {
    return <CarouselTree data={flexData} />;
  }

  if (type === "bubble") {
    return <BubbleTree bubble={flexData} basePath="" />;
  }

  return <div className="text-xs text-gray-400 text-center py-4">未対応: {type}</div>;
}

// ── カルーセルツリー ──

function CarouselTree({ data }: { data: FlexObj }) {
  const dispatch = useFlexEditorDispatch();
  const contents = (data.contents || []) as FlexObj[];

  return (
    <div className="space-y-1">
      <TreeNode
        path=""
        label="カルーセル"
        icon={ICONS.carousel}
        depth={0}
        canDelete={false}
      >
        {contents.map((bubble, i) => (
          <BubbleTree key={i} bubble={bubble} basePath={`contents.${i}`} depth={1} index={i} total={contents.length} />
        ))}
        {contents.length < 12 && (
          <AddButton
            depth={1}
            label="バブル追加"
            onClick={() => {
              dispatch({
                type: "INSERT",
                arrayPath: "contents",
                index: contents.length,
                element: createEmptyBubble(),
              });
            }}
          />
        )}
      </TreeNode>
    </div>
  );
}

// ── バブルツリー ──

function BubbleTree({ bubble, basePath, depth = 0, index, total }: {
  bubble: FlexObj; basePath: string; depth?: number; index?: number; total?: number;
}) {
  const dispatch = useFlexEditorDispatch();
  const sections = ["header", "hero", "body", "footer"] as const;

  return (
    <TreeNode
      path={basePath}
      label={`バブル${index !== undefined ? ` ${index + 1}` : ""}`}
      icon={ICONS.bubble}
      depth={depth}
      canDelete={total !== undefined && total > 1}
      canMoveUp={index !== undefined && index > 0}
      canMoveDown={index !== undefined && total !== undefined && index < total - 1}
      onMoveUp={() => {
        if (index !== undefined && index > 0) {
          const parentPath = basePath.includes(".") ? basePath.substring(0, basePath.lastIndexOf(".")) : "";
          if (parentPath) dispatch({ type: "MOVE", arrayPath: parentPath, fromIndex: index, toIndex: index - 1 });
        }
      }}
      onMoveDown={() => {
        if (index !== undefined && total !== undefined && index < total - 1) {
          const parentPath = basePath.includes(".") ? basePath.substring(0, basePath.lastIndexOf(".")) : "";
          if (parentPath) dispatch({ type: "MOVE", arrayPath: parentPath, fromIndex: index, toIndex: index + 1 });
        }
      }}
    >
      {sections.map((section) => {
        const sectionData = bubble[section] as FlexObj | undefined;
        if (!sectionData) return null;
        const sectionPath = basePath ? `${basePath}.${section}` : section;

        if (section === "hero" && sectionData.type === "image") {
          return (
            <TreeNode key={section} path={sectionPath} label="hero (画像)" icon={ICONS.image} depth={depth + 1} canDelete />
          );
        }

        // box型のセクション（header, body, footer）
        return (
          <BoxTree key={section} box={sectionData} basePath={sectionPath} depth={depth + 1} label={section} />
        );
      })}
    </TreeNode>
  );
}

// ── ボックスツリー ──

function BoxTree({ box, basePath, depth, label }: {
  box: FlexObj; basePath: string; depth: number; label?: string;
}) {
  const dispatch = useFlexEditorDispatch();
  const contents = (box.contents || []) as FlexObj[];
  const layout = box.layout as string;
  const displayLabel = label || `ボックス (${layout === "horizontal" ? "横" : "縦"})`;

  return (
    <TreeNode path={basePath} label={displayLabel} icon={ICONS.box} depth={depth} canDelete={!!label}>
      {contents.map((item, i) => {
        const itemPath = `${basePath}.contents.${i}`;
        const itemType = item.type as string;

        if (itemType === "box") {
          return <BoxTree key={i} box={item} basePath={itemPath} depth={depth + 1} />;
        }

        const itemLabel = itemType === "text"
          ? `"${((item.text as string) || "").substring(0, 12)}${((item.text as string) || "").length > 12 ? "…" : ""}"`
          : itemType === "button"
            ? `[${((item.action as FlexObj)?.label as string) || "ボタン"}]`
            : ELEMENT_TYPE_LABELS[itemType] || itemType;

        return (
          <TreeNode
            key={i}
            path={itemPath}
            label={itemLabel}
            icon={ICONS[itemType] || "?"}
            depth={depth + 1}
            canDelete
            canMoveUp={i > 0}
            canMoveDown={i < contents.length - 1}
            onMoveUp={() => dispatch({ type: "MOVE", arrayPath: `${basePath}.contents`, fromIndex: i, toIndex: i - 1 })}
            onMoveDown={() => dispatch({ type: "MOVE", arrayPath: `${basePath}.contents`, fromIndex: i, toIndex: i + 1 })}
          />
        );
      })}
      <ElementAdder
        depth={depth + 1}
        onAdd={(elementType) => {
          const element = { ...ELEMENT_DEFAULTS[elementType] };
          dispatch({
            type: "INSERT",
            arrayPath: `${basePath}.contents`,
            index: contents.length,
            element,
          });
        }}
      />
    </TreeNode>
  );
}

// ── ツリーノード ──

function TreeNode({
  path,
  label,
  icon,
  depth,
  canDelete = false,
  canMoveUp = false,
  canMoveDown = false,
  onMoveUp,
  onMoveDown,
  children,
}: {
  path: string;
  label: string;
  icon: string;
  depth: number;
  canDelete?: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  children?: React.ReactNode;
}) {
  const { selectedPath } = useFlexEditor();
  const dispatch = useFlexEditorDispatch();
  const isSelected = selectedPath === path;
  const [isOpen, setIsOpen] = useState(true);
  const hasChildren = !!children;

  return (
    <div>
      <div
        className={`flex items-center gap-1 py-1 px-1 rounded cursor-pointer group transition-colors ${
          isSelected ? "bg-blue-50 text-blue-700" : "hover:bg-gray-50 text-gray-700"
        }`}
        style={{ paddingLeft: `${depth * 14 + 4}px` }}
        onClick={(e) => {
          e.stopPropagation();
          dispatch({ type: "SELECT", path });
        }}
      >
        {/* 開閉矢印 */}
        {hasChildren ? (
          <button
            onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
            className="w-3.5 h-3.5 flex items-center justify-center text-gray-400 hover:text-gray-600 flex-shrink-0"
          >
            <svg className={`w-2.5 h-2.5 transition-transform ${isOpen ? "rotate-90" : ""}`} fill="currentColor" viewBox="0 0 20 20">
              <path d="M6 4l8 6-8 6z" />
            </svg>
          </button>
        ) : (
          <div className="w-3.5 h-3.5 flex-shrink-0" />
        )}

        {/* アイコン */}
        <span className="text-[10px] w-4 text-center flex-shrink-0 opacity-60">{icon}</span>

        {/* ラベル */}
        <span className="text-[11px] truncate flex-1 font-medium">{label}</span>

        {/* 操作ボタン */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          {canMoveUp && (
            <button onClick={(e) => { e.stopPropagation(); onMoveUp?.(); }} className="p-0.5 text-gray-400 hover:text-gray-600" title="上に移動">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
            </button>
          )}
          {canMoveDown && (
            <button onClick={(e) => { e.stopPropagation(); onMoveDown?.(); }} className="p-0.5 text-gray-400 hover:text-gray-600" title="下に移動">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
          )}
          {canDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); dispatch({ type: "REMOVE_AT_PATH", path }); }}
              className="p-0.5 text-gray-400 hover:text-red-500"
              title="削除"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
        </div>
      </div>

      {/* 子要素 */}
      {hasChildren && isOpen && <div>{children}</div>}
    </div>
  );
}

// ── 要素追加ボタン ──

function AddButton({ depth, label, onClick }: { depth: number; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 py-1 px-1 text-[10px] text-green-600 hover:text-green-700 hover:bg-green-50 rounded w-full transition-colors"
      style={{ paddingLeft: `${depth * 14 + 4}px` }}
    >
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
      {label}
    </button>
  );
}

// ── ElementAdder ──

function ElementAdder({ depth, onAdd }: { depth: number; onAdd: (type: string) => void }) {
  const [showMenu, setShowMenu] = useState(false);

  const elementTypes = [
    { type: "text", label: "テキスト", icon: "T" },
    { type: "button", label: "ボタン", icon: "□" },
    { type: "image", label: "画像", icon: "🖼" },
    { type: "separator", label: "区切り線", icon: "—" },
    { type: "box", label: "ボックス", icon: "⊞" },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-1 py-1 px-1 text-[10px] text-blue-500 hover:text-blue-600 hover:bg-blue-50 rounded w-full transition-colors"
        style={{ paddingLeft: `${depth * 14 + 4}px` }}
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        要素追加
      </button>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
          <div className="absolute left-4 top-full mt-0.5 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1 min-w-[120px]">
            {elementTypes.map((et) => (
              <button
                key={et.type}
                onClick={() => { onAdd(et.type); setShowMenu(false); }}
                className="w-full px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2 transition-colors"
              >
                <span className="w-4 text-center text-[10px] opacity-60">{et.icon}</span>
                {et.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
