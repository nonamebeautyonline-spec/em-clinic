"use client";

// 設定ページ（デモ用）
// モックデータを使用してシステム設定の閲覧・編集UIを提供する
// 保存はデモ環境のため実際には反映されない

import { useState } from "react";
import { DEMO_SETTINGS } from "../_data/mock";

// 設定値の出典タイプ
type Source = "db" | "env" | "none";

// セクション定義（一般 / 決済 / LINE / SMS / 電子カルテ連携）
const SECTIONS = [
  { key: "general", label: "一般" },
  { key: "payment", label: "決済" },
  { key: "line", label: "LINE" },
  { key: "sms", label: "SMS" },
  { key: "ehr", label: "電子カルテ連携" },
] as const;

// 出典バッジのスタイル定義
const sourceStyles: Record<Source, string> = {
  db: "bg-blue-100 text-blue-700",
  env: "bg-green-100 text-green-700",
  none: "bg-slate-100 text-slate-500",
};

// 出典バッジのラベル定義
const sourceLabels: Record<Source, string> = {
  db: "DB",
  env: "env",
  none: "未設定",
};

// 値を●で一部マスクして表示する関数
function maskValue(value: string): string {
  if (!value) return "-";
  // 既にマスク済み（●を含む）場合はそのまま返す
  if (value.includes("●")) return value;
  // 短い値はそのまま表示
  if (value.length <= 4) return value;
  // 先頭4文字を表示し、残りを●で隠す
  const visibleLength = 4;
  const maskLength = Math.min(value.length - visibleLength, 8);
  return value.slice(0, visibleLength) + "●".repeat(maskLength);
}

export default function DemoSettingsPage() {
  // 現在選択中のセクション
  const [activeSection, setActiveSection] = useState<string>("general");
  // 展開中の設定項目キー
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  // 編集中の値を保持するマップ
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  // 保存済みの値（デモ用：画面上のみ反映）
  const [savedValues, setSavedValues] = useState<Record<string, string>>({});
  // トースト通知メッセージ
  const [toast, setToast] = useState<string | null>(null);

  // トースト表示（3秒で自動非表示）
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // 現在のセクションの設定項目を取得
  const items = (DEMO_SETTINGS as Record<string, { key: string; label: string; value: string; source: Source }[]>)[activeSection] || [];

  // 保存処理（デモ環境のため実際には保存されない）
  const handleSave = (key: string) => {
    const val = editValues[key];
    if (val !== undefined) {
      setSavedValues((prev) => ({ ...prev, [key]: val }));
      showToast("デモ環境のため実際には保存されません");
      setExpandedKey(null);
    }
  };

  // 現在の表示値を取得（保存済みがあればそちらを優先）
  const getValue = (item: { key: string; value: string }) => {
    return savedValues[item.key] ?? item.value;
  };

  return (
    <div className="p-6 pb-12 max-w-6xl mx-auto">
      {/* トースト通知 */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-slate-800 text-white px-4 py-3 rounded-lg shadow-lg text-sm">
          {toast}
        </div>
      )}

      {/* ヘッダー */}
      <h1 className="text-2xl font-bold text-slate-800 mb-6">設定</h1>

      <div className="flex gap-6">
        {/* 左タブナビゲーション */}
        <div className="w-48 flex-shrink-0">
          <nav className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {SECTIONS.map((section) => (
              <button
                key={section.key}
                onClick={() => {
                  setActiveSection(section.key);
                  setExpandedKey(null);
                }}
                className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors border-b border-slate-100 last:border-b-0 ${
                  activeSection === section.key
                    ? "bg-blue-50 text-blue-700 border-l-4 border-l-blue-500"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {section.label}
              </button>
            ))}
          </nav>
        </div>

        {/* 右メインコンテンツ */}
        <div className="flex-1">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {/* セクションタイトル */}
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-base font-semibold text-slate-800">
                {SECTIONS.find((s) => s.key === activeSection)?.label}設定
              </h2>
            </div>

            {/* 設定項目一覧 */}
            <div className="divide-y divide-slate-100">
              {items.map((item) => {
                const currentValue = getValue(item);
                const isExpanded = expandedKey === item.key;

                return (
                  <div key={item.key} className="px-6 py-4">
                    {/* 設定行: ラベル + 出典バッジ + マスク値 + 展開ボタン */}
                    <div
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => {
                        if (isExpanded) {
                          setExpandedKey(null);
                        } else {
                          setExpandedKey(item.key);
                          setEditValues((prev) => ({
                            ...prev,
                            [item.key]: currentValue,
                          }));
                        }
                      }}
                    >
                      <div className="flex items-center gap-3">
                        {/* ラベル */}
                        <span className="text-sm font-medium text-slate-700">
                          {item.label}
                        </span>
                        {/* 出典バッジ（db=青, env=緑, none=灰色） */}
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${sourceStyles[item.source]}`}
                        >
                          {sourceLabels[item.source]}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        {/* マスクされた値 */}
                        <span className="text-sm text-slate-400 font-mono">
                          {maskValue(currentValue)}
                        </span>
                        {/* 展開/閉じるインジケーター */}
                        <svg
                          className={`w-4 h-4 text-slate-400 transition-transform ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                    </div>

                    {/* 展開時の編集エリア */}
                    {isExpanded && (
                      <div className="mt-3 flex gap-2">
                        <input
                          type="text"
                          value={editValues[item.key] ?? currentValue}
                          onChange={(e) =>
                            setEditValues((prev) => ({
                              ...prev,
                              [item.key]: e.target.value,
                            }))
                          }
                          onClick={(e) => e.stopPropagation()}
                          className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSave(item.key);
                          }}
                          className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
                        >
                          保存
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
