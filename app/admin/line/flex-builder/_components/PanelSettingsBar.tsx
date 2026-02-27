"use client";

import { useState } from "react";
import { useBlockEditor, useBlockEditorDispatch } from "./BlockEditorContext";
import {
  THEME_COLOR_PRESETS,
  BG_COLOR_PRESETS,
  PANEL_SIZE_OPTIONS,
} from "@/lib/flex-editor/block-types";

export function PanelSettingsBar() {
  const { panels, activePanelIndex } = useBlockEditor();
  const dispatch = useBlockEditorDispatch();
  const panel = panels[activePanelIndex];
  if (!panel) return null;

  const { backgroundColor, themeColor, size } = panel.settings;

  return (
    <div className="flex items-center gap-6 px-4 py-2.5 bg-white border-b border-gray-200 flex-shrink-0">
      {/* パネル設定ラベル */}
      <span className="text-xs font-bold text-gray-500 whitespace-nowrap">パネル設定</span>

      {/* 背景色 */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-gray-500">背景色</span>
        <div className="flex items-center gap-1">
          {BG_COLOR_PRESETS.map((preset) => (
            <button
              key={preset.value}
              onClick={() => dispatch({ type: "UPDATE_PANEL_SETTINGS", settings: { backgroundColor: preset.value } })}
              className={`w-6 h-6 rounded-full border-2 transition-all ${
                backgroundColor === preset.value
                  ? "border-green-500 scale-110"
                  : "border-gray-300 hover:border-gray-400"
              }`}
              style={{ backgroundColor: preset.value }}
              title={preset.label}
            />
          ))}
          {/* カスタムカラー */}
          <div className="relative">
            <input
              type="color"
              value={backgroundColor}
              onChange={(e) => dispatch({ type: "UPDATE_PANEL_SETTINGS", settings: { backgroundColor: e.target.value } })}
              className="w-6 h-6 rounded-full border-2 border-gray-300 cursor-pointer p-0 appearance-none bg-transparent"
              style={{
                backgroundColor:
                  BG_COLOR_PRESETS.some((p) => p.value === backgroundColor)
                    ? "transparent"
                    : backgroundColor,
              }}
              title="カスタム色"
            />
          </div>
        </div>
      </div>

      {/* テーマカラー */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-gray-500">テーマカラー</span>
        <div className="flex items-center gap-1">
          {THEME_COLOR_PRESETS.map((preset) => (
            <button
              key={preset.value}
              onClick={() => dispatch({ type: "UPDATE_PANEL_SETTINGS", settings: { themeColor: preset.value } })}
              className={`w-6 h-6 rounded-full border-2 transition-all ${
                themeColor === preset.value
                  ? "border-gray-800 scale-110"
                  : "border-transparent hover:border-gray-400"
              }`}
              style={{ backgroundColor: preset.value }}
              title={preset.label}
            />
          ))}
          {/* カスタムカラー */}
          <input
            type="color"
            value={themeColor}
            onChange={(e) => dispatch({ type: "UPDATE_PANEL_SETTINGS", settings: { themeColor: e.target.value } })}
            className="w-6 h-6 rounded-full border-2 border-gray-300 cursor-pointer p-0"
            title="カスタム色"
          />
        </div>
      </div>

      {/* サイズ */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-gray-500">サイズ</span>
        <select
          value={size}
          onChange={(e) =>
            dispatch({
              type: "UPDATE_PANEL_SETTINGS",
              settings: { size: e.target.value as "kilo" | "mega" | "giga" },
            })
          }
          className="px-2 py-1 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-green-500/30 bg-white"
        >
          {PANEL_SIZE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
