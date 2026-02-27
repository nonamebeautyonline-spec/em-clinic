"use client";

import type { ImageBlockProps, BlockAction } from "@/lib/flex-editor/block-types";
import { ASPECT_RATIO_OPTIONS } from "@/lib/flex-editor/block-types";
import { ActionEditor } from "./ActionEditor";

interface ImageBlockEditorProps {
  props: ImageBlockProps & { blockType: "image" };
  onUpdate: (updates: Partial<ImageBlockProps>) => void;
}

export function ImageBlockEditor({ props, onUpdate }: ImageBlockEditorProps) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-[11px] font-medium text-gray-500 mb-1">画像URL</label>
        <input
          type="text"
          value={props.url}
          onChange={(e) => onUpdate({ url: e.target.value })}
          placeholder="https://..."
          className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-green-500/30 bg-white"
        />
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
    </div>
  );
}
