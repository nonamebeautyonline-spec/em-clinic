// 利用規約・プライバシーポリシー設定セクション
"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { DEFAULT_TERMS_TEXT, DEFAULT_PRIVACY_TEXT } from "@/lib/legal/types";

interface LegalConfig {
  termsText: string;
  privacyText: string;
}

interface LegalSectionProps {
  onToast: (message: string, type: "success" | "error") => void;
}

export default function LegalSection({ onToast }: LegalSectionProps) {
  const SWR_KEY = "/api/admin/legal/config";
  const { data: swrData, isLoading: loading, error: swrError } = useSWR<{ config?: LegalConfig }>(SWR_KEY);
  const [config, setConfig] = useState<LegalConfig | null>(null);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<"terms" | "privacy">("terms");

  // SWRデータをローカルstateに反映（編集用）
  if (swrData?.config && !configLoaded) {
    setConfig(swrData.config);
    setConfigLoaded(true);
  }

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/legal/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ config }),
      });
      if (res.ok) {
        onToast("利用規約を保存しました", "success");
        setEditing(false);
        mutate(SWR_KEY);
      } else {
        onToast("保存に失敗しました", "error");
      }
    } catch {
      onToast("保存に失敗しました", "error");
    }
    setSaving(false);
  };

  const handleCancel = () => {
    setEditing(false);
    // SWRデータから再読み込み
    if (swrData?.config) setConfig(swrData.config);
    mutate(SWR_KEY);
  };

  const handleResetToDefault = (type: "terms" | "privacy") => {
    if (!config) return;
    if (type === "terms") {
      setConfig({ ...config, termsText: DEFAULT_TERMS_TEXT });
    } else {
      setConfig({ ...config, privacyText: DEFAULT_PRIVACY_TEXT });
    }
  };

  if (loading || !config) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">利用規約・プライバシーポリシー</h2>
            <p className="text-xs text-gray-500 mt-0.5">予約確認画面に表示される規約の編集</p>
          </div>
          <div className="flex gap-2">
            {editing ? (
              <>
                <button
                  onClick={handleCancel}
                  className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  {saving && (
                    <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  )}
                  保存
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                編集する
              </button>
            )}
          </div>
        </div>

        {/* タブ */}
        <div className="flex gap-1 mx-4 mt-3 mb-3 bg-gray-100 rounded-lg p-1">
          {([
            { key: "terms" as const, label: "利用規約" },
            { key: "privacy" as const, label: "プライバシーポリシー" },
          ]).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                tab === t.key
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* テキストエリア */}
        <div className="border-t border-gray-100">
          {editing && (
            <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-100">
              <p className="text-xs text-gray-500">
                ### はセクション見出し、1. 2. は番号付きリスト、- は箇条書き、**太字** はサブヘッダー
              </p>
              <button
                onClick={() => handleResetToDefault(tab)}
                className="text-xs text-red-500 hover:text-red-700 font-medium"
              >
                デフォルトに戻す
              </button>
            </div>
          )}
          <textarea
            value={tab === "terms" ? config.termsText : config.privacyText}
            onChange={(e) => {
              if (tab === "terms") {
                setConfig({ ...config, termsText: e.target.value });
              } else {
                setConfig({ ...config, privacyText: e.target.value });
              }
            }}
            readOnly={!editing}
            className={`w-full px-4 py-4 text-sm leading-relaxed font-mono resize-none focus:outline-none ${
              editing
                ? "bg-white text-gray-900 min-h-[500px]"
                : "bg-gray-50/50 text-gray-600 min-h-[300px] cursor-default"
            }`}
          />
        </div>
      </div>
    </div>
  );
}
