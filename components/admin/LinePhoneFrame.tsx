"use client";

import { useState, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** ダーク/ライトモード切替を表示するか */
  showModeToggle?: boolean;
  /** ヘッダーにクリニック名を表示 */
  headerTitle?: string;
  /** 背景色（LINE風） */
  bgColor?: string;
}

export function LinePhoneFrame({
  children,
  showModeToggle = true,
  headerTitle = "トーク",
  bgColor,
}: Props) {
  const [darkMode, setDarkMode] = useState(false);

  const frameBg = darkMode ? "#1a1a2e" : "#ffffff";
  const headerBg = darkMode ? "#2d2d44" : "#06C755";
  const contentBg = bgColor || (darkMode ? "#0f0f1a" : "#7494c0");
  const statusBarColor = darkMode ? "#e0e0e0" : "#ffffff";

  return (
    <div className="flex flex-col items-center">
      {/* モード切替 */}
      {showModeToggle && (
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => setDarkMode(false)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              !darkMode ? "bg-white text-gray-800 shadow-sm" : "bg-gray-700 text-gray-400"
            }`}
          >
            ☀️ ライト
          </button>
          <button
            onClick={() => setDarkMode(true)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              darkMode ? "bg-gray-700 text-white shadow-sm" : "bg-gray-200 text-gray-500"
            }`}
          >
            🌙 ダーク
          </button>
        </div>
      )}

      {/* iPhone風フレーム */}
      <div
        className="relative rounded-[40px] overflow-hidden shadow-2xl border-[3px]"
        style={{
          width: "375px",
          minHeight: "667px",
          maxHeight: "780px",
          borderColor: darkMode ? "#444" : "#333",
          backgroundColor: frameBg,
        }}
      >
        {/* ノッチ */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-30">
          <div
            className="rounded-b-2xl"
            style={{
              width: "160px",
              height: "28px",
              backgroundColor: darkMode ? "#2d2d44" : "#333",
            }}
          />
        </div>

        {/* ステータスバー */}
        <div
          className="flex items-center justify-between px-8 pt-3 pb-1"
          style={{ backgroundColor: headerBg }}
        >
          <span className="text-[11px] font-semibold" style={{ color: statusBarColor }}>
            9:41
          </span>
          <div className="flex items-center gap-1">
            {/* シグナル */}
            <svg className="w-4 h-3" viewBox="0 0 20 14" fill={statusBarColor}>
              <rect x="0" y="8" width="3" height="6" rx="1" />
              <rect x="5" y="5" width="3" height="9" rx="1" />
              <rect x="10" y="2" width="3" height="12" rx="1" />
              <rect x="15" y="0" width="3" height="14" rx="1" />
            </svg>
            {/* WiFi */}
            <svg className="w-4 h-3" viewBox="0 0 16 12" fill={statusBarColor}>
              <path d="M8 10.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM4 7.5c2.2-2.2 5.8-2.2 8 0l-1 1c-1.7-1.7-4.3-1.7-6 0l-1-1zM1 4.5c3.9-3.9 10.1-3.9 14 0l-1 1c-3.3-3.3-8.7-3.3-12 0l-1-1z" />
            </svg>
            {/* バッテリー */}
            <svg className="w-6 h-3" viewBox="0 0 28 13" fill={statusBarColor}>
              <rect x="0" y="0" width="24" height="13" rx="3" stroke={statusBarColor} strokeWidth="1" fill="none" />
              <rect x="2" y="2" width="19" height="9" rx="1" />
              <rect x="25" y="4" width="3" height="5" rx="1" />
            </svg>
          </div>
        </div>

        {/* LINEヘッダー */}
        <div
          className="flex items-center gap-3 px-4 py-2"
          style={{ backgroundColor: headerBg }}
        >
          <svg className="w-5 h-5" fill={statusBarColor} viewBox="0 0 24 24">
            <path d="M20 11l-8-8-8 8h3v9h4v-6h2v6h4v-9h3z" />
          </svg>
          <span className="text-sm font-bold flex-1" style={{ color: statusBarColor }}>
            {headerTitle}
          </span>
          <svg className="w-5 h-5" fill={statusBarColor} viewBox="0 0 24 24">
            <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" stroke={statusBarColor} fill="none" />
          </svg>
        </div>

        {/* コンテンツ領域 */}
        <div
          className="overflow-y-auto"
          style={{
            backgroundColor: contentBg,
            height: "calc(100% - 100px)",
            paddingBottom: "60px",
          }}
        >
          <div className="p-4">{children}</div>
        </div>

        {/* 下部バー（メッセージ入力風） */}
        <div
          className="absolute bottom-0 left-0 right-0 flex items-center gap-2 px-3 py-3 border-t"
          style={{
            backgroundColor: darkMode ? "#2d2d44" : "#ffffff",
            borderColor: darkMode ? "#444" : "#e5e5e5",
          }}
        >
          <div className="flex items-center gap-2">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <div
            className="flex-1 rounded-full px-4 py-2 text-xs"
            style={{
              backgroundColor: darkMode ? "#3d3d54" : "#f5f5f5",
              color: darkMode ? "#888" : "#999",
            }}
          >
            メッセージを入力
          </div>
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        {/* ホームインジケーター */}
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2">
          <div
            className="rounded-full"
            style={{
              width: "120px",
              height: "4px",
              backgroundColor: darkMode ? "#666" : "#ccc",
            }}
          />
        </div>
      </div>
    </div>
  );
}
