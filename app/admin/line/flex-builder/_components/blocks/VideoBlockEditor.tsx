"use client";

import type { VideoBlockProps } from "@/lib/flex-editor/block-types";

interface Props {
  props: VideoBlockProps & { blockType: "video" };
  onUpdate: (updates: Partial<VideoBlockProps>) => void;
}

const ASPECT_OPTIONS = [
  { value: "20:13", label: "20:13" },
  { value: "1:1", label: "正方形" },
  { value: "4:3", label: "4:3" },
  { value: "16:9", label: "16:9" },
];

export function VideoBlockEditor({ props, onUpdate }: Props) {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-[11px] font-medium text-gray-500 mb-1 block">動画URL</label>
        <input type="text" value={props.url || ""} onChange={(e) => onUpdate({ url: e.target.value })}
          placeholder="https://example.com/video.mp4"
          className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-green-500/30 bg-white" />
      </div>
      <div>
        <label className="text-[11px] font-medium text-gray-500 mb-1 block">サムネイルURL</label>
        <input type="text" value={props.previewUrl || ""} onChange={(e) => onUpdate({ previewUrl: e.target.value })}
          placeholder="https://example.com/thumbnail.jpg"
          className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-green-500/30 bg-white" />
      </div>
      <div>
        <label className="text-[11px] font-medium text-gray-500 mb-1 block">代替テキスト</label>
        <input type="text" value={props.altContent || ""} onChange={(e) => onUpdate({ altContent: e.target.value })}
          placeholder="動画を再生"
          className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 bg-white" />
      </div>
      <div>
        <label className="text-[11px] font-medium text-gray-500 mb-1 block">アスペクト比</label>
        <select value={props.aspectRatio || "20:13"} onChange={(e) => onUpdate({ aspectRatio: e.target.value })}
          className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-green-500/30 bg-white">
          {ASPECT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
    </div>
  );
}
