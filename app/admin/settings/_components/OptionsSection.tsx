// オプション機能表示セクション（テナント側は閲覧専用）
"use client";

import { useState, useEffect } from "react";

// AI_OPTIONS の定義を直接参照（サーバーモジュールのインポートを避ける）
const AI_OPTIONS_UI = [
  { key: "ai_reply", label: "AI返信", monthlyPrice: 20_000, icon: "🤖", description: "LINEメッセージにAIが自動で返信案を生成します" },
  { key: "voice_input", label: "音声入力", monthlyPrice: 15_000, icon: "🎙️", description: "音声をテキストに変換してカルテ入力を効率化します" },
  { key: "ai_karte", label: "AIカルテ", monthlyPrice: 20_000, icon: "📋", description: "AIがカルテの下書きを自動生成します" },
];

interface Props {
  enabledOptions: string[];
}

export default function OptionsSection({ enabledOptions }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="text-sm font-bold text-gray-800">オプション機能</h2>
        <p className="text-xs text-gray-500 mt-0.5">ご利用中のオプション機能一覧</p>
      </div>

      <div className="p-5 space-y-3">
        {AI_OPTIONS_UI.map((opt) => {
          const isActive = enabledOptions.includes(opt.key);
          return (
            <div
              key={opt.key}
              className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                isActive
                  ? "border-green-200 bg-green-50/50"
                  : "border-gray-100 bg-gray-50/50"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{opt.icon}</span>
                <div>
                  <p className="text-sm font-medium text-gray-900">{opt.label}</p>
                  <p className="text-xs text-gray-500">{opt.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-gray-500">
                  ¥{opt.monthlyPrice.toLocaleString()}/月
                </span>
                <span
                  className={`inline-flex px-2.5 py-0.5 text-xs font-medium rounded-full ${
                    isActive
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {isActive ? "有効" : "未契約"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
        <p className="text-xs text-gray-500">
          オプションの追加・変更はLオペサポートまでお問い合わせください。
        </p>
      </div>
    </div>
  );
}
