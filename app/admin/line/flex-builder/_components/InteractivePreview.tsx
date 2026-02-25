"use client";

import { useFlexEditor, useFlexEditorDispatch } from "./FlexEditorContext";
import { ELEMENT_TYPE_LABELS } from "@/lib/flex-editor/element-defaults";

type FlexObj = Record<string, unknown>;

// ── メインコンポーネント ──

export function InteractivePreview() {
  const { flexData, selectedPath } = useFlexEditor();
  const dispatch = useFlexEditorDispatch();

  if (!flexData) {
    return (
      <div className="text-center text-white/60 text-sm py-20">
        プリセットを選択またはJSONを入力してください
      </div>
    );
  }

  const type = flexData.type as string;

  if (type === "carousel") {
    const contents = (flexData.contents || []) as FlexObj[];
    return (
      <div className="flex gap-2 overflow-x-auto pb-2">
        {contents.map((bubble, i) => (
          <div key={i} className="flex-shrink-0 w-[260px]">
            <SelectableWrapper path={`contents.${i}`}>
              <EditableBubble bubble={bubble} basePath={`contents.${i}`} />
            </SelectableWrapper>
          </div>
        ))}
      </div>
    );
  }

  if (type === "bubble") {
    return (
      <div className="max-w-[300px] mx-auto">
        <EditableBubble bubble={flexData} basePath="" />
      </div>
    );
  }

  return (
    <div className="text-white/60 text-xs text-center py-10">
      対応していないFlexタイプです: {type || "不明"}
    </div>
  );
}

// ── SelectableWrapper ──

function SelectableWrapper({
  path,
  children,
  className = "",
  label,
}: {
  path: string;
  children: React.ReactNode;
  className?: string;
  label?: string;
}) {
  const { selectedPath } = useFlexEditor();
  const dispatch = useFlexEditorDispatch();
  const isSelected = selectedPath === path;

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        dispatch({ type: "SELECT", path });
      }}
      className={`relative cursor-pointer transition-all rounded-sm ${
        isSelected
          ? "ring-2 ring-blue-500 ring-offset-1"
          : "hover:ring-1 hover:ring-blue-300/60"
      } ${className}`}
    >
      {children}
      {isSelected && label && (
        <div className="absolute -top-4 left-0 bg-blue-500 text-white text-[9px] px-1.5 py-0.5 rounded z-10 whitespace-nowrap">
          {label}
        </div>
      )}
    </div>
  );
}

// ── Bubble ──

function EditableBubble({ bubble, basePath }: { bubble: FlexObj; basePath: string }) {
  const header = bubble.header as FlexObj | undefined;
  const hero = bubble.hero as FlexObj | undefined;
  const body = bubble.body as FlexObj | undefined;
  const footer = bubble.footer as FlexObj | undefined;

  const p = (section: string) => basePath ? `${basePath}.${section}` : section;

  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-lg">
      {/* Header */}
      {header && (
        <SelectableWrapper path={p("header")} label="header">
          <div
            className="px-4 py-3"
            style={{
              backgroundColor: (header.backgroundColor as string) || undefined,
              ...(header.paddingAll ? { padding: header.paddingAll as string } : {}),
            }}
          >
            <EditableBox box={header} basePath={p("header")} />
          </div>
        </SelectableWrapper>
      )}

      {/* Hero */}
      {hero && hero.type === "image" && (
        <SelectableWrapper path={p("hero")} label="hero">
          <div
            className="w-full bg-gray-200 bg-cover bg-center"
            style={{
              backgroundImage: `url(${hero.url})`,
              aspectRatio: (hero.aspectRatio as string) || "2/1",
            }}
          />
        </SelectableWrapper>
      )}

      {/* Body */}
      {body && (
        <SelectableWrapper path={p("body")} label="body">
          <div className="px-4 py-3">
            <EditableBox box={body} basePath={p("body")} />
          </div>
        </SelectableWrapper>
      )}

      {/* Footer */}
      {footer && (
        <SelectableWrapper path={p("footer")} label="footer">
          <div className="px-4 pb-3">
            <EditableBox box={footer} basePath={p("footer")} />
          </div>
        </SelectableWrapper>
      )}
    </div>
  );
}

// ── Box ──

function EditableBox({ box, basePath }: { box: FlexObj; basePath: string }) {
  const layout = box.layout as string;
  const contents = (box.contents || []) as FlexObj[];
  const spacing = box.spacing as string;
  const margin = box.margin as string;

  const gapClass = spacing === "sm" ? "gap-1.5" : spacing === "md" ? "gap-2" : spacing === "lg" ? "gap-3" : "gap-1";
  const marginClass = margin === "sm" ? "mt-1" : margin === "md" ? "mt-2" : margin === "lg" ? "mt-3" : margin === "xl" ? "mt-4" : "";

  return (
    <div className={`flex ${layout === "horizontal" ? "flex-row" : "flex-col"} ${gapClass} ${marginClass}`}>
      {contents.map((item, i) => {
        const itemPath = `${basePath}.contents.${i}`;
        const itemType = item.type as string;
        const label = ELEMENT_TYPE_LABELS[itemType] || itemType;
        return (
          <SelectableWrapper key={i} path={itemPath} label={label}>
            <EditableElement element={item} basePath={itemPath} />
          </SelectableWrapper>
        );
      })}
    </div>
  );
}

// ── Element ──

function EditableElement({ element, basePath }: { element: FlexObj; basePath: string }) {
  const type = element.type as string;

  if (type === "text") {
    const weight = element.weight === "bold" ? "font-bold" : "";
    const size = element.size as string;
    const sizeClass =
      size === "xxs" ? "text-[9px]" :
      size === "xs" ? "text-[10px]" :
      size === "sm" ? "text-xs" :
      size === "md" ? "text-sm" :
      size === "lg" ? "text-base" :
      size === "xl" ? "text-lg" :
      size === "xxl" ? "text-xl" :
      size === "3xl" ? "text-2xl" :
      size === "4xl" ? "text-3xl" :
      size === "5xl" ? "text-4xl" : "text-sm";
    const color = element.color as string;
    const align = element.align as string;
    const alignClass = align === "center" ? "text-center" : align === "end" ? "text-right" : "";
    const wrap = element.wrap ? "" : "truncate";
    const flex = element.flex as number | undefined;
    const margin = element.margin as string;
    const marginClass = margin === "sm" ? "mt-1" : margin === "md" ? "mt-2" : margin === "lg" ? "mt-3" : margin === "xl" ? "mt-4" : "";

    return (
      <span
        className={`${sizeClass} ${weight} ${alignClass} ${wrap} ${marginClass} leading-snug block`}
        style={{ color: color || "#111", flex: flex !== undefined ? flex : undefined }}
      >
        {element.text as string}
      </span>
    );
  }

  if (type === "button") {
    const style = element.style as string;
    const action = element.action as FlexObj;
    const color = element.color as string;
    const height = element.height as string;
    const margin = element.margin as string;
    const marginClass = margin === "sm" ? "mt-1" : margin === "md" ? "mt-2" : margin === "lg" ? "mt-3" : "";

    return (
      <div
        className={`${height === "sm" ? "py-1.5" : "py-2"} px-4 rounded-lg text-center text-sm font-medium ${marginClass} ${
          style === "primary"
            ? "text-white"
            : style === "link"
              ? "bg-transparent"
              : "bg-gray-100 text-gray-700 border border-gray-200"
        }`}
        style={
          style === "primary"
            ? { backgroundColor: color || "#06C755" }
            : style === "link"
              ? { color: color || "#06C755" }
              : undefined
        }
      >
        {(action?.label as string) || "ボタン"}
      </div>
    );
  }

  if (type === "separator") {
    const margin = element.margin as string;
    const marginClass = margin === "sm" ? "my-1" : margin === "md" ? "my-2" : margin === "lg" ? "my-3" : margin === "xl" ? "my-4" : "my-1";
    return <hr className={`border-gray-200 ${marginClass}`} style={element.color ? { borderColor: element.color as string } : undefined} />;
  }

  if (type === "box") {
    return <EditableBox box={element} basePath={basePath} />;
  }

  if (type === "image") {
    return (
      <div
        className="w-full bg-gray-200 bg-cover bg-center rounded"
        style={{
          backgroundImage: `url(${element.url})`,
          aspectRatio: (element.aspectRatio as string) || "1/1",
          minHeight: "60px",
        }}
      />
    );
  }

  return null;
}
