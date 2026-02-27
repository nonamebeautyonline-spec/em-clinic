"use client";

import { useBlockEditor, useBlockEditorDispatch } from "./BlockEditorContext";
import type { EditorBlock } from "@/lib/flex-editor/block-types";

export function BlockPreview() {
  const { panels, activePanelIndex, selectedBlockId } = useBlockEditor();
  const dispatch = useBlockEditorDispatch();
  const panel = panels[activePanelIndex];
  if (!panel) return null;

  return (
    <div className="p-6 min-h-full flex items-start justify-center">
      <div className="w-[280px]">
        {/* LINEメッセージ風カード */}
        <div
          className="rounded-xl overflow-hidden shadow-lg"
          style={{ backgroundColor: panel.settings.backgroundColor }}
        >
          {panel.blocks.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-sm text-gray-300">ブロックを追加してください</p>
            </div>
          ) : (
            <div className="px-4 py-4 space-y-2">
              {panel.blocks.map((block, index) => (
                <BlockPreviewItem
                  key={block.id}
                  block={block}
                  index={index + 1}
                  isSelected={selectedBlockId === block.id}
                  themeColor={panel.settings.themeColor}
                  onClick={() => dispatch({ type: "SELECT_BLOCK", blockId: block.id })}
                />
              ))}
            </div>
          )}
        </div>

        {/* 戻るリンク */}
        <div className="mt-4 text-center">
          <a
            href="/admin/line/templates"
            className="text-sm text-blue-400 hover:text-blue-300 hover:underline"
          >
            戻る
          </a>
        </div>
      </div>
    </div>
  );
}

function BlockPreviewItem({
  block,
  index,
  isSelected,
  themeColor,
  onClick,
}: {
  block: EditorBlock;
  index: number;
  isSelected: boolean;
  themeColor: string;
  onClick: () => void;
}) {
  const { props } = block;

  return (
    <div
      onClick={onClick}
      className={`relative cursor-pointer rounded-lg transition-all ${
        isSelected
          ? "ring-2 ring-green-500 ring-offset-1"
          : "hover:ring-1 hover:ring-green-300/60"
      }`}
    >
      {/* 番号バッジ */}
      <span className="absolute -left-2 -top-1 z-10 flex items-center justify-center w-5 h-5 bg-green-600 text-white text-[10px] font-bold rounded-full shadow">
        {index}
      </span>

      {/* ブロックコンテンツ */}
      <div className="pl-2">
        {props.blockType === "title" && <TitlePreview text={props.text} subtitle={props.subtitle} />}
        {props.blockType === "text" && <TextPreview text={props.text} />}
        {props.blockType === "image" && <ImagePreview url={props.url} aspectRatio={props.aspectRatio} />}
        {props.blockType === "button" && (
          <ButtonPreview label={props.label} style={props.style} color={props.color} />
        )}
        {props.blockType === "separator" && <SeparatorPreview />}
      </div>
    </div>
  );
}

function TitlePreview({ text, subtitle }: { text: string; subtitle?: string }) {
  return (
    <div className="py-1">
      <span className="text-base font-bold text-gray-900 leading-snug block">
        {text || "タイトルを入力"}
      </span>
      {subtitle !== undefined && (
        <span className="text-xs text-gray-500 mt-0.5 block">
          {subtitle || "サブタイトル"}
        </span>
      )}
    </div>
  );
}

function TextPreview({ text }: { text: string }) {
  return (
    <div className="py-1">
      <span className="text-sm text-gray-600 leading-relaxed block">
        {text || "テキストを入力"}
      </span>
    </div>
  );
}

function ImagePreview({ url, aspectRatio }: { url: string; aspectRatio: string }) {
  if (!url) {
    return (
      <div
        className="w-full bg-gray-100 rounded-lg flex items-center justify-center"
        style={{ aspectRatio: aspectRatio.replace(":", "/") }}
      >
        <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    );
  }

  return (
    <div
      className="w-full bg-gray-100 bg-cover bg-center rounded-lg"
      style={{
        backgroundImage: `url(${url})`,
        aspectRatio: aspectRatio.replace(":", "/"),
      }}
    />
  );
}

function ButtonPreview({
  label,
  style,
  color,
}: {
  label: string;
  style: "primary" | "secondary" | "link";
  color: string;
}) {
  if (style === "link") {
    return (
      <div className="py-2 text-center">
        <span className="text-sm font-medium" style={{ color }}>
          {label || "ボタン"}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`py-2.5 px-4 rounded-lg text-center text-sm font-medium ${
        style === "primary" ? "text-white" : "bg-gray-100 text-gray-700 border border-gray-200"
      }`}
      style={style === "primary" ? { backgroundColor: color } : undefined}
    >
      {label || "ボタン"}
    </div>
  );
}

function SeparatorPreview() {
  return <hr className="border-gray-200 my-2" />;
}
