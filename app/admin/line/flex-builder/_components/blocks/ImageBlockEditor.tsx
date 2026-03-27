"use client";

import { useState } from "react";
import type { ImageBlockProps, BlockAction } from "@/lib/flex-editor/block-types";
import { ASPECT_RATIO_OPTIONS } from "@/lib/flex-editor/block-types";
import { ActionEditor } from "./ActionEditor";
import { MediaPickerModal } from "../MediaPickerModal";

interface ImageBlockEditorProps {
  props: ImageBlockProps & { blockType: "image" };
  onUpdate: (updates: Partial<ImageBlockProps>) => void;
}

export function ImageBlockEditor({ props, onUpdate }: ImageBlockEditorProps) {
  const [showMediaPicker, setShowMediaPicker] = useState(false);

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-[11px] font-medium text-gray-500 mb-1">画像URL</label>
        <div className="flex gap-1.5">
          <input
            type="text"
            value={props.url}
            onChange={(e) => onUpdate({ url: e.target.value })}
            placeholder="https://..."
            className="flex-1 px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-green-500/30 bg-white"
          />
          <button
            onClick={() => setShowMediaPicker(true)}
            className="flex-shrink-0 px-2.5 py-1.5 bg-purple-50 text-purple-600 border border-purple-200 rounded-lg text-xs hover:bg-purple-100 transition-colors flex items-center gap-1"
            title="メディアから選択"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            選択
          </button>
        </div>
      </div>

      {props.url && (
        <div className="rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
          <img
            src={props.url}
            alt=""
            className="w-full max-h-[100px] object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
      )}

      <div>
        <label className="block text-[11px] font-medium text-gray-500 mb-1">比率</label>
        <select
          value={props.aspectRatio}
          onChange={(e) => onUpdate({ aspectRatio: e.target.value })}
          className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-green-500/30 bg-white"
        >
          {ASPECT_RATIO_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="flex items-center gap-2 cursor-pointer mb-2">
          <input
            type="checkbox"
            checked={!!props.action}
            onChange={(e) =>
              onUpdate({
                action: e.target.checked
                  ? { type: "url", value: "" }
                  : undefined,
              })
            }
            className="w-3.5 h-3.5 rounded border-gray-300 text-green-600 focus:ring-green-500"
          />
          <span className="text-xs text-gray-600">タップアクション</span>
        </label>
        {props.action && (
          <ActionEditor
            action={props.action}
            onChange={(action) => onUpdate({ action })}
          />
        )}
      </div>

      {showMediaPicker && (
        <MediaPickerModal
          onSelect={(url) => {
            onUpdate({ url });
            setShowMediaPicker(false);
          }}
          onClose={() => setShowMediaPicker(false)}
        />
      )}
    </div>
  );
}
