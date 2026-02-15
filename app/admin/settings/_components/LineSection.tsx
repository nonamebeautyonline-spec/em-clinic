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

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center text-gray-400 text-sm">
        LINE連携の設定はありません
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="text-sm font-bold text-gray-800">LINE連携</h2>
        <p className="text-xs text-gray-500 mt-0.5">LINE Messaging APIの認証情報</p>
      </div>
      {items.map((item) => (
        <SettingRow key={item.key} item={item} category="line" onSaved={onSaved} />
      ))}
    </div>
  );
}
