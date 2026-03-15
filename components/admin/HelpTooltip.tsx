"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";

interface HelpTooltipProps {
  /** ツールチップのテキスト */
  text: string;
  /** ツールチップの位置 */
  position?: "top" | "bottom" | "left" | "right";
  /** トリガー要素（省略時は?アイコン） */
  children?: ReactNode;
  /** アイコンサイズ */
  size?: "sm" | "md";
}

export function HelpTooltip({
  text,
  position = "top",
  children,
  size = "sm",
}: HelpTooltipProps) {
  const [show, setShow] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);

  // 画面外に出ないよう調整
  useEffect(() => {
    if (show && tooltipRef.current) {
      const rect = tooltipRef.current.getBoundingClientRect();
      if (rect.right > window.innerWidth) {
        tooltipRef.current.style.left = "auto";
        tooltipRef.current.style.right = "0";
      }
      if (rect.left < 0) {
        tooltipRef.current.style.left = "0";
        tooltipRef.current.style.right = "auto";
      }
    }
  }, [show]);

  const iconSize = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";

  const positionClasses: Record<string, string> = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  return (
    <span
      ref={triggerRef}
      className="relative inline-flex items-center"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children || (
        <span className={`${iconSize} rounded-full bg-gray-200 text-gray-500 flex items-center justify-center cursor-help hover:bg-gray-300 transition-colors`}>
          <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
        </span>
      )}

      {show && (
        <div
          ref={tooltipRef}
          className={`absolute z-50 ${positionClasses[position]} pointer-events-none`}
        >
          <div className="bg-gray-800 text-white text-[11px] leading-relaxed px-3 py-2 rounded-lg shadow-lg max-w-[220px] whitespace-pre-wrap">
            {text}
          </div>
        </div>
      )}
    </span>
  );
}
