"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";

/* ---------- 型定義 ---------- */
interface AdPlatform {
  id: number;
  platform: "meta" | "google" | "tiktok" | "x";
  display_name: string;
  config: Record<string, string>;
  is_active: boolean;
  recent_cv_count: number;
  created_at: string;
}

type PlatformType = "meta" | "google" | "tiktok" | "x";

/* ---------- プラットフォーム設定 ---------- */
const PLATFORMS: {
  value: PlatformType;
  label: string;
  color: string;
  gradient: string;
  badgeBg: string;
  badgeText: string;
  fields: { key: string; label: string; placeholder: string }[];
}[] = [
  {
    value: "meta",
    label: "Meta (Facebook / Instagram)",
    color: "bg-blue-600",
    gradient: "from-blue-500 to-blue-700",
    badgeBg: "bg-blue-50",
    badgeText: "text-blue-700",
    fields: [
      { key: "pixel_id", label: "ピクセルID", placeholder: "123456789012345" },
      { key: "access_token", label: "アクセストークン", placeholder: "EAAxxxxxxx..." },
      { key: "test_event_code", label: "テストイベントコード", placeholder: "TEST12345（任意）" },
    ],
  },
  {
    value: "google",
    label: "Google Ads",
    color: "bg-green-600",
    gradient: "from-green-500 to-green-700",
    badgeBg: "bg-green-50",
    badgeText: "text-green-700",
    fields: [
      { key: "customer_id", label: "顧客ID", placeholder: "123-456-7890" },
      { key: "conversion_action_id", label: "コンバージョンアクションID", placeholder: "123456789" },
      { key: "oauth_token", label: "OAuthトークン", placeholder: "ya29.xxxxx..." },
      { key: "developer_token", label: "開発者トークン", placeholder: "xxxxx..." },
    ],
  },
  {
    value: "tiktok",
    label: "TikTok Ads",
    color: "bg-gray-900",
    gradient: "from-gray-800 to-black",
    badgeBg: "bg-gray-100",
    badgeText: "text-gray-800",
    fields: [
      { key: "pixel_code", label: "ピクセルコード", placeholder: "CXXXXXXX" },
      { key: "access_token", label: "アクセストークン", placeholder: "xxxxx..." },
    ],
  },
  {
    value: "x",
    label: "X (旧Twitter)",
    color: "bg-gray-700",
    gradient: "from-gray-600 to-gray-800",
    badgeBg: "bg-gray-100",
    badgeText: "text-gray-700",
    fields: [
      { key: "api_key", label: "APIキー", placeholder: "xxxxx..." },
      { key: "api_secret", label: "APIシークレット", placeholder: "xxxxx..." },
    ],
  },
];

/* ---------- ヘルパー ---------- */
function getPlatformConfig(platform: PlatformType) {
  return PLATFORMS.find((p) => p.value === platform)!;
}

function maskValue(value: string): string {
  if (!value || value.length <= 6) return "******";
  return value.slice(0, 4) + "****" + value.slice(-2);
}

/* ---------- メインページ ---------- */
const API_KEY = "/api/admin/ad-platforms";

export default function AdPlatformsPage() {
  const { data, isLoading } = useSWR<{ platforms: AdPlatform[] }>(API_KEY);
  const platforms = data?.platforms ?? [];

  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Partial<AdPlatform> & { config_input?: Record<string, string> } | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformType>("meta");
  const [saving, setSaving] = useState(false);

  const handleCreate = () => {
    setSelectedPlatform("meta");
    setEditItem({
      platform: "meta",
      display_name: "",
      config_input: {},
      is_active: true,
    });
    setShowModal(true);
  };

  const handleEdit = (item: AdPlatform) => {
    setSelectedPlatform(item.platform);
    setEditItem({
      ...item,
      config_input: { ...item.config },
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!editItem?.display_name?.trim()) return;
    setSaving(true);
    try {
      const method = editItem.id ? "PUT" : "POST";
      const payload = {
        ...editItem,
        platform: editItem.id ? editItem.platform : selectedPlatform,
        config: editItem.config_input || {},
      };
      delete (payload as Record<string, unknown>).config_input;
      const res = await fetch(API_KEY, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setShowModal(false);
        setEditItem(null);
        mutate(API_KEY);
      } else {
        const d = await res.json().catch(() => ({}));
        alert(d.error || "保存に失敗しました");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (item: AdPlatform) => {
    await fetch(API_KEY, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...item, is_active: !item.is_active }),
    });
    mutate(API_KEY);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("この広告プラットフォーム設定を削除しますか？")) return;
    await fetch(`${API_KEY}?id=${id}`, { method: "DELETE", credentials: "include" });
    mutate(API_KEY);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditItem(null);
  };

  const currentPlatformConfig = getPlatformConfig(editItem?.id ? (editItem.platform as PlatformType) : selectedPlatform);

  return (
    <div className="min-h-full bg-gray-50/50">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                  </svg>
                </div>
                広告連携 (CAPI)
              </h1>
              <p className="text-sm text-gray-400 mt-1">広告プラットフォームへのコンバージョンAPI連携を管理します。</p>
            </div>
            <button
              onClick={handleCreate}
              className="px-5 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-xl text-sm font-medium hover:from-teal-600 hover:to-cyan-700 shadow-lg shadow-teal-500/25 transition-all duration-200 flex items-center gap-2 min-h-[44px]"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              プラットフォーム追加
            </button>
          </div>
        </div>
      </div>

      {/* プラットフォーム一覧 */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-teal-200 border-t-teal-500 rounded-full animate-spin" />
              <span className="text-sm text-gray-400">読み込み中...</span>
            </div>
          </div>
        ) : platforms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-teal-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
              </svg>
            </div>
            <p className="text-gray-400 text-sm">広告プラットフォームはまだ連携されていません</p>
            <p className="text-gray-300 text-xs mt-1">「プラットフォーム追加」からCAPI連携を設定しましょう</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {platforms.map((item) => {
              const pConf = getPlatformConfig(item.platform);
              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md hover:border-gray-200 transition-all duration-200 group ${
                    !item.is_active ? "opacity-60" : ""
                  }`}
                >
                  {/* プラットフォームカラーライン */}
                  <div className={`h-1 bg-gradient-to-r ${pConf.gradient}`} />

                  <div className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {/* プラットフォームアイコン */}
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${pConf.gradient} flex items-center justify-center flex-shrink-0`}>
                          <span className="text-white text-[10px] font-bold uppercase">
                            {item.platform === "meta" ? "Meta" : item.platform === "google" ? "Ggl" : item.platform === "tiktok" ? "TT" : "X"}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-[15px] font-semibold text-gray-900 truncate">{item.display_name}</h3>
                            <span className={`shrink-0 px-2 py-0.5 text-[10px] rounded-full font-medium ${pConf.badgeBg} ${pConf.badgeText}`}>
                              {pConf.label}
                            </span>
                            {!item.is_active && (
                              <span className="shrink-0 px-2 py-0.5 text-[10px] bg-gray-100 text-gray-500 rounded-full font-medium">
                                停止中
                              </span>
                            )}
                          </div>

                          {/* マスクされた設定情報 */}
                          <div className="flex flex-wrap gap-2 mt-2">
                            {pConf.fields.map((f) => {
                              const val = item.config[f.key];
                              if (!val) return null;
                              return (
                                <span key={f.key} className="inline-flex items-center gap-1 text-[11px] text-gray-500">
                                  <span className="text-gray-400">{f.label}:</span>
                                  <code className="bg-gray-50 px-1.5 py-0.5 rounded text-[10px] font-mono">{maskValue(val)}</code>
                                </span>
                              );
                            })}
                          </div>

                          {/* 直近CV数 */}
                          <div className="flex items-center gap-2 mt-2 text-[11px]">
                            <span className="text-gray-400">直近CV:</span>
                            <span className="text-gray-700 font-semibold">{item.recent_cv_count.toLocaleString()}件</span>
                          </div>
                        </div>
                      </div>

                      {/* 操作 */}
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => handleEdit(item)}
                          className="px-3 py-1.5 text-xs font-medium text-teal-600 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        >
                          編集
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleToggle(item)}
                          className={`w-10 h-5 rounded-full relative transition-colors ${
                            item.is_active ? "bg-[#06C755]" : "bg-gray-300"
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                              item.is_active ? "translate-x-5" : "translate-x-0.5"
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 作成/編集モーダル */}
      {showModal && editItem && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-gray-900 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                    </svg>
                  </div>
                  {editItem.id ? "プラットフォーム編集" : "プラットフォーム追加"}
                </h2>
                <button onClick={closeModal} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* プラットフォーム選択（新規時のみ） */}
              {!editItem.id && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">プラットフォーム</label>
                  <div className="grid grid-cols-2 gap-2">
                    {PLATFORMS.map((p) => (
                      <button
                        key={p.value}
                        onClick={() => {
                          setSelectedPlatform(p.value);
                          setEditItem({ ...editItem, platform: p.value, config_input: {} });
                        }}
                        className={`px-3 py-2.5 rounded-xl border text-sm font-medium transition-all text-left ${
                          selectedPlatform === p.value
                            ? `bg-gradient-to-r ${p.gradient} text-white border-transparent shadow-md`
                            : "bg-gray-50/50 border-gray-200 text-gray-700 hover:border-gray-300"
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 表示名 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">表示名</label>
                <input
                  type="text"
                  value={editItem.display_name || ""}
                  onChange={(e) => setEditItem({ ...editItem, display_name: e.target.value })}
                  placeholder="例: メインアカウント"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 bg-gray-50/50 transition-all"
                  autoFocus
                />
              </div>

              {/* 動的設定フィールド */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded bg-gradient-to-br ${currentPlatformConfig.gradient}`} />
                  <label className="text-sm font-medium text-gray-700">{currentPlatformConfig.label} 設定</label>
                </div>
                {currentPlatformConfig.fields.map((field) => (
                  <div key={field.key}>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{field.label}</label>
                    <input
                      type="text"
                      value={(editItem.config_input ?? {})[field.key] || ""}
                      onChange={(e) =>
                        setEditItem({
                          ...editItem,
                          config_input: { ...(editItem.config_input ?? {}), [field.key]: e.target.value },
                        })
                      }
                      placeholder={field.placeholder}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 bg-gray-50/50 transition-all font-mono"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={closeModal} className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
                キャンセル
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !editItem.display_name?.trim()}
                className="px-5 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-xl text-sm font-medium hover:from-teal-600 hover:to-cyan-700 shadow-lg shadow-teal-500/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "保存中..." : editItem.id ? "更新" : "追加"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
