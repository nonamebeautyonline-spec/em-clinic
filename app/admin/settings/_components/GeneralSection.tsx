// 基本情報セクション（clinic_name, app_base_url）
"use client";

import type { SettingItem, SettingsMap } from "../page";
import { SettingRow } from "../page";

interface Props {
  settings: SettingsMap | null;
  onSaved: (msg: string, type: "success" | "error") => void;
}

export default function GeneralSection({ settings, onSaved }: Props) {
  const items = settings?.general ?? [];

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center text-gray-400 text-sm">
        基本情報の設定はありません
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="text-sm font-bold text-gray-800">基本情報</h2>
        <p className="text-xs text-gray-500 mt-0.5">クリニック名やアプリURLの設定</p>
      </div>
      {items.map((item) => (
        <SettingRow key={item.key} item={item} category="general" onSaved={onSaved} />
      ))}
    </div>
  );
}
