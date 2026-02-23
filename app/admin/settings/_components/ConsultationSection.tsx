// 診察設定セクション — 診察モード・LINEコールURL
"use client";

import { useState, useEffect, useCallback } from "react";

// --- 型定義 ---
type ConsultationType =
  | "online_phone"
  | "online_line_voice"
  | "online_line_video"
  | "online_line_voice_video"
  | "online_all"
  | "in_person"
  | "online_and_in_person";

interface ConsultationConfig {
  type: ConsultationType;
  lineCallUrl: string;
}

const DEFAULT_CONFIG: ConsultationConfig = {
  type: "online_all",
  lineCallUrl: "",
};

const CONSULTATION_TYPE_OPTIONS: { value: ConsultationType; label: string; description: string }[] = [
  { value: "online_phone", label: "電話のみ", description: "電話での診察のみ" },
  { value: "online_line_voice", label: "LINE音声通話のみ", description: "LINE音声通話での診察のみ" },
  { value: "online_line_video", label: "LINEビデオ通話のみ", description: "LINEビデオ通話での診察のみ" },
  { value: "online_line_voice_video", label: "LINE音声通話＋ビデオ通話", description: "LINE音声・ビデオ通話での診察" },
  { value: "online_all", label: "電話＋LINE音声通話＋ビデオ通話", description: "すべてのオンライン診察方法を利用" },
  { value: "in_person", label: "対面診療", description: "対面での診察のみ" },
  { value: "online_and_in_person", label: "オンライン診療＋対面診療", description: "オンラインと対面の両方に対応" },
];

interface ConsultationSectionProps {
  onToast: (message: string, type: "success" | "error") => void;
}

export default function ConsultationSection({ onToast }: ConsultationSectionProps) {
  const [config, setConfig] = useState<ConsultationConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // --- 初期読み込み ---
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings?category=consultation", { credentials: "include" });
      const data = await res.json();
      if (data.settings && typeof data.settings === "object") {
        setConfig(prev => ({
          ...prev,
          type: data.settings.type || prev.type,
          lineCallUrl: data.settings.line_call_url || prev.lineCallUrl,
        }));
      }
    } catch {
      /* デフォルト値を維持 */
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // --- 保存 ---
  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const promises = [
        fetch("/api/admin/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ category: "consultation", key: "type", value: config.type }),
        }),
        fetch("/api/admin/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ category: "consultation", key: "line_call_url", value: config.lineCallUrl.trim() }),
        }),
      ];
      const results = await Promise.all(promises);
      const allOk = results.every(r => r.ok);
      if (allOk) {
        setSaved(true);
        onToast("診察設定を保存しました", "success");
        setTimeout(() => setSaved(false), 3000);
      } else {
        onToast("一部の設定の保存に失敗しました", "error");
      }
    } catch {
      onToast("保存に失敗しました", "error");
    }
    setSaving(false);
  };

  // --- ローディング表示 ---
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div>
      {/* セクションヘッダー */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-gray-900">診察設定</h2>
          <p className="text-xs text-gray-500 mt-0.5">診察モードとLINE通話の設定</p>
        </div>
        <div className="flex items-center gap-2">
          {saved && <span className="text-sm text-emerald-600 font-medium">保存しました</span>}
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* LINEコールURL設定 */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-800">LINEコールURL</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              カルテ画面から患者にLINE通話フォームを送信する際に使用するURLです
            </p>
          </div>
          <div className="p-5 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
              <input
                type="text"
                value={config.lineCallUrl}
                onChange={(e) => setConfig(prev => ({ ...prev, lineCallUrl: e.target.value }))}
                placeholder="例: https://lin.ee/XXXXXXX"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {config.lineCallUrl && (
              <div className="flex items-center gap-2 text-xs text-emerald-600">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                設定済み: {config.lineCallUrl}
              </div>
            )}
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
              <p className="text-xs text-blue-800 leading-relaxed">
                LINE Official Account Manager → チャット → LINEコール → 「LINEコールを宣伝」からURLを取得してください。
                患者がこのURLをタップすると、LINEの音声通話またはビデオ通話が開始されます。
              </p>
            </div>
          </div>
        </div>

        {/* 診察モード設定 */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-800">診察モード</h3>
            <p className="text-xs text-gray-500 mt-0.5">クリニックの診察方法を設定します</p>
          </div>
          <div className="p-5">
            <div className="space-y-2">
              {CONSULTATION_TYPE_OPTIONS.map(opt => (
                <label
                  key={opt.value}
                  className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    config.type === opt.value
                      ? "bg-blue-50 border border-blue-200"
                      : "hover:bg-gray-50 border border-transparent"
                  }`}
                >
                  <input
                    type="radio"
                    name="consultationType"
                    value={opt.value}
                    checked={config.type === opt.value}
                    onChange={(e) => setConfig(prev => ({ ...prev, type: e.target.value as ConsultationType }))}
                    className="mt-0.5 accent-blue-600"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{opt.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{opt.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
