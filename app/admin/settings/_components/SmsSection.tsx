// SMS（Twilio）認証セクション
"use client";

import type { SettingsMap } from "../page";
import { SettingRow } from "../page";

interface Props {
  settings: SettingsMap | null;
  onSaved: (msg: string, type: "success" | "error") => void;
}

export default function SmsSection({ settings, onSaved }: Props) {
  const items = settings?.sms ?? [];

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center text-gray-400 text-sm">
        SMS認証の設定はありません
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="text-sm font-bold text-gray-800">SMS認証（Twilio）</h2>
        <p className="text-xs text-gray-500 mt-0.5">電話番号認証に使用するTwilioの認証情報</p>
      </div>
      {items.map((item) => (
        <SettingRow key={item.key} item={item} category="sms" onSaved={onSaved} />
      ))}
    </div>
  );
}
