// 決済設定セクション（プロバイダー選択 + APIキー管理）
"use client";

import { useState, useEffect } from "react";
import type { SettingItem, SettingsMap, CategoryKey } from "../page";
import { SettingRow, SourceBadge } from "../page";

const PROVIDER_OPTIONS: { value: string; label: string; description: string; category: CategoryKey }[] = [
  { value: "square", label: "Square", description: "クレジットカード決済（Payment Links API）", category: "square" },
  { value: "gmo", label: "GMO ペイメントゲートウェイ", description: "クレジットカード決済（PG マルチペイメント）", category: "gmo" },
];

interface Props {
  settings: SettingsMap | null;
  onSaved: (msg: string, type: "success" | "error") => void;
}

export default function PaymentSection({ settings, onSaved }: Props) {
  const paymentSettings = settings?.payment ?? [];
  const providerSetting = paymentSettings.find((s) => s.key === "provider");
  const currentProvider = providerSetting?.maskedValue || "";

  const [selected, setSelected] = useState<string>(
    currentProvider === "未設定" ? "" : currentProvider,
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const val = providerSetting?.maskedValue || "";
    setSelected(val === "未設定" ? "" : val);
  }, [providerSetting?.maskedValue]);

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: "payment", key: "provider", value: selected }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `保存に失敗しました (${res.status})`);
      }
      onSaved("決済プロバイダーを保存しました", "success");
    } catch (err: any) {
      onSaved(err.message || "保存に失敗しました", "error");
    } finally {
      setSaving(false);
    }
  };

  const selectedOption = PROVIDER_OPTIONS.find((o) => o.value === selected);
  const providerSettings = selectedOption ? (settings?.[selectedOption.category] ?? []) : [];

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="text-sm font-bold text-gray-800">決済設定</h2>
        <p className="text-xs text-gray-500 mt-0.5">決済プロバイダーの選択とAPIキーの管理</p>
      </div>

      {/* プロバイダー選択 */}
      <div className="px-5 py-4 border-b border-gray-100">
        <p className="text-sm font-medium text-gray-900 mb-3">決済プロバイダー選択</p>
        <div className="space-y-3">
          {PROVIDER_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                selected === opt.value
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <input
                type="radio"
                name="payment_provider"
                value={opt.value}
                checked={selected === opt.value}
                onChange={(e) => setSelected(e.target.value)}
                className="w-4 h-4 mt-0.5 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">{opt.label}</span>
                <p className="text-xs text-gray-500 mt-0.5">{opt.description}</p>
              </div>
            </label>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-3">
          <SourceBadge source={providerSetting?.source ?? "未設定"} />
          <button
            onClick={handleSave}
            disabled={saving || !selected}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? "保存中..." : "プロバイダーを保存"}
          </button>
        </div>
      </div>

      {/* 選択中プロバイダーのAPI Key設定 */}
      {selected && providerSettings.length > 0 && (
        <div className="border-t border-gray-200">
          <div className="px-5 py-3 bg-gray-50">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {selectedOption?.label} API設定
            </p>
          </div>
          {providerSettings.map((item) => (
            <SettingRow
              key={item.key}
              item={item}
              category={selectedOption!.category}
              onSaved={onSaved}
            />
          ))}
        </div>
      )}

      {selected && providerSettings.length === 0 && (
        <div className="px-5 py-6 text-center text-gray-400 text-sm border-t border-gray-200">
          {selectedOption?.label} のAPI設定キーはまだ登録されていません。
          <br />
          上の保存ボタンを押してからページを再読み込みしてください。
        </div>
      )}
    </div>
  );
}
