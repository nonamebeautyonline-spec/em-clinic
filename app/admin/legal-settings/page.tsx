"use client";

import { useState, useEffect, useCallback } from "react";
import { DEFAULT_TERMS_TEXT, DEFAULT_PRIVACY_TEXT } from "@/lib/legal/types";

interface LegalConfig {
  termsText: string;
  privacyText: string;
}

export default function LegalSettingsPage() {
  const [config, setConfig] = useState<LegalConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<"terms" | "privacy">("terms");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/legal/config", { credentials: "include" });
    const data = await res.json();
    if (data.config) setConfig(data.config);
    setLoading(false);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- 初期データフェッチ
  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    setSaved(false);
    const res = await fetch("/api/admin/legal/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ config }),
    });
    if (res.ok) {
      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  };

  const handleCancel = () => {
    setEditing(false);
    load();
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">利用規約・プライバシーポリシー</h1>
          <p className="text-sm text-gray-500 mt-1">予約確認画面に表示される規約の編集</p>
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <button
                onClick={handleCancel}
                className="px-4 py-2.5 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 rounded-lg transition-colors flex items-center gap-2"
              >
                {saving && (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                )}
                保存する
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"
            >
              {saved ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  保存しました
                </>
              ) : (
                "編集する"
              )}
            </button>
          )}
        </div>
      </div>

      {/* タブ */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1">
        {([
          { key: "terms" as const, label: "利用規約" },
          { key: "privacy" as const, label: "プライバシーポリシー" },
        ]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
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
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
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
              ? "bg-white text-gray-900 min-h-[600px]"
              : "bg-gray-50/50 text-gray-600 min-h-[400px] cursor-default"
          }`}
          style={{ minHeight: editing ? "600px" : "400px" }}
        />
      </div>
    </div>
  );
}
