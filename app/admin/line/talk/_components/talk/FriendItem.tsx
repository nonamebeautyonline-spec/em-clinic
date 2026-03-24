"use client";

import { memo } from "react";
import type { Friend } from "./types";
import { isImageUrl, isStickerContent } from "./constants";

const FriendItem = memo(function FriendItem({ f, isPinned, isSelected, onSelect, onTogglePin, getMarkColor, getMarkLabel, formatDateShort, canPin, readTimestamp }: {
  f: Friend; isPinned: boolean; isSelected: boolean;
  onSelect: (f: Friend) => void; onTogglePin: (id: string) => void;
  getMarkColor: (mark: string) => string; getMarkLabel: (mark: string) => string; formatDateShort: (s: string) => string;
  canPin: boolean;
  readTimestamp?: string;
}) {
  // patient_idがないレコードは描画しない
  if (!f.patient_id) return null;
  const markColor = getMarkColor(f.mark);
  const markLabel = getMarkLabel(f.mark);
  const showMark = !!f.mark;
  // テキスト未読判定: last_text_at が readTimestamp より新しければ未読
  const hasUnreadText = !!(f.last_text_at && (!readTimestamp || f.last_text_at > readTimestamp));
  // メッセージ表示テキスト
  const displayMessage = f.last_message
    ? isStickerContent(f.last_message) ? "[スタンプ]"
      : f.last_message.match(/^【.+?】/) && isImageUrl(f.last_message.replace(/^【.+?】/, ""))
      ? f.last_message.match(/^【.+?】/)![0]
      : isImageUrl(f.last_message) ? "[画像]" : f.last_message
    : "メッセージなし";
  return (
    <div
      onClick={() => onSelect(f)}
      className={`px-2 py-1.5 cursor-pointer transition-all hover:bg-gray-50/80 border-b border-gray-50 group ${
        isSelected ? "bg-[#00B900]/[0.12] border-l-[3px] border-l-[#00B900]" : "border-l-[3px] border-l-transparent"
      }`}
    >
      <div className="flex items-start gap-1.5" style={{ minHeight: "52px" }}>
        {f.line_picture_url ? (
          <img src={f.line_picture_url} alt="" className="w-8 h-8 rounded-full flex-shrink-0 shadow-sm object-cover mt-0.5" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm mt-0.5">
            {f.patient_name?.charAt(0) || f.line_display_name?.charAt(0) || "?"}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-[15px] font-semibold text-gray-800 truncate">{f.patient_id?.startsWith("LINE_") ? "🟧 " : ""}{f.patient_name || f.line_display_name || "（名前なし）"}</span>
            {f.line_display_name && f.patient_name && f.line_display_name !== f.patient_name && (
              <span className="text-[10px] text-gray-400 truncate flex-shrink-0 max-w-[80px]">{f.line_display_name}</span>
            )}
            {hasUnreadText && (
              <span className="w-3 h-3 rounded-full bg-[#00B900] flex-shrink-0" />
            )}
          </div>
          <p className={`text-[11px] leading-[1.4] ${f.is_blocked ? "text-red-500 font-medium" : "text-gray-500"}`} style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", wordBreak: "break-all", height: "31px" }}>
            {f.is_blocked ? "ブロックされました" : displayMessage}
          </p>
        </div>
        <div className="flex flex-col items-end gap-0.5 flex-shrink-0 pt-0.5">
          {(f.last_sent_at || f.last_text_at) && (
            <span className="text-[12px] text-gray-400 whitespace-nowrap">{formatDateShort(f.last_sent_at || f.last_text_at!)}</span>
          )}
          {showMark && (
            <span className="text-[10px] font-bold leading-none px-1.5 py-0.5 rounded-sm text-white whitespace-nowrap" style={{ backgroundColor: markColor }}>
              {markLabel}
            </span>
          )}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onTogglePin(f.patient_id); }}
          className={`flex-shrink-0 p-0.5 rounded transition-all mt-0.5 ${
            isPinned ? "text-amber-400" : "text-gray-200 opacity-0 group-hover:opacity-100 hover:text-amber-300"
          }`}
        >
          <svg className="w-3 h-3" fill={isPinned ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        </button>
      </div>
    </div>
  );
});

export default FriendItem;
