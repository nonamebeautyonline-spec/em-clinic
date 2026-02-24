// LINE連携セクション（channel_access_token, channel_secret）
"use client";

import type { SettingsMap } from "../page";
import { SettingRow } from "../page";

interface Props {
  settings: SettingsMap | null;
  onSaved: (msg: string, type: "success" | "error") => void;
}

export default function LineSection({ settings, onSaved }: Props) {
  const items = settings?.line ?? [];
  const allUnconfigured = items.length === 0 || items.every((i) => i.source === "未設定");

  return (
    <div className="space-y-4">
      {/* LINE未設定時の案内バナー */}
      {allUnconfigured && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-900">LINE Messaging APIの設定が必要です</h3>
              <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                Lオペの全機能を利用するには、LINE Messaging APIの認証情報を設定してください。
              </p>
              <div className="mt-3 text-xs text-amber-700/80 space-y-1">
                <p>1. LINE公式アカウントを作成</p>
                <p>2. LINE Developersコンソールでチャネルを作成</p>
                <p>3. 下記の設定欄にChannel Access Tokenなどを入力</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 設定項目一覧 */}
      {items.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center text-gray-400 text-sm">
          LINE連携の設定はありません
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-800">LINE連携</h2>
              <p className="text-xs text-gray-500 mt-0.5">LINE Messaging APIの認証情報</p>
            </div>
            <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded bg-amber-100 text-amber-700">
              必須
            </span>
          </div>
          {items.map((item) => (
            <SettingRow key={item.key} item={item} category="line" onSaved={onSaved} />
          ))}
        </div>
      )}
    </div>
  );
}
