"use client";

import { useState, useEffect } from "react";

interface FriendSetting {
  id: number;
  setting_key: string;
  setting_value: {
    greeting_message: string;
    assign_tags: string[];
    assign_mark: string;
    actions: { type: string; value: string }[];
    menu_change?: string;
  };
  enabled: boolean;
  updated_at: string;
}

interface MarkDef {
  id: number;
  value: string;
  label: string;
  color: string;
}

interface TagDef {
  id: number;
  name: string;
  color: string;
}

const SETTING_LABELS: Record<string, { title: string; description: string }> = {
  new_friend: {
    title: "新規友だち",
    description: "システム導入後に新しくアカウントをフォローした人についての設定",
  },
  returning_blocked: {
    title: "システム導入前からの友だち・アカウントへのブロック解除した友だち",
    description: "システム導入前からの友だちとアカウントへのブロック解除した友だちについての設定",
  },
};

export default function FriendAddSettingsPage() {
  const [settings, setSettings] = useState<FriendSetting[]>([]);
  const [marks, setMarks] = useState<MarkDef[]>([]);
  const [tags, setTags] = useState<TagDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // 編集用ステート
  const [greetingMessage, setGreetingMessage] = useState("");
  const [assignMark, setAssignMark] = useState("none");
  const [menuChange, setMenuChange] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const fetchData = async () => {
    const [sRes, mRes, tRes] = await Promise.all([
      fetch("/api/admin/line/friend-settings", { credentials: "include" }),
      fetch("/api/admin/line/marks", { credentials: "include" }),
      fetch("/api/admin/tags", { credentials: "include" }),
    ]);
    const sData = await sRes.json();
    const mData = await mRes.json();
    const tData = await tRes.json();

    if (sData.settings) setSettings(sData.settings);
    if (mData.marks) setMarks(mData.marks);
    if (tData.tags) setTags(tData.tags);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleEdit = (setting: FriendSetting) => {
    setEditingKey(setting.setting_key);
    setGreetingMessage(setting.setting_value.greeting_message || "");
    setAssignMark(setting.setting_value.assign_mark || "none");
    setMenuChange(setting.setting_value.menu_change || "");
    setSelectedTags(setting.setting_value.assign_tags || []);
  };

  const handleSave = async () => {
    if (!editingKey || saving) return;
    setSaving(true);

    const res = await fetch("/api/admin/line/friend-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        setting_key: editingKey,
        setting_value: {
          greeting_message: greetingMessage,
          assign_tags: selectedTags,
          assign_mark: assignMark,
          menu_change: menuChange,
          actions: [],
        },
        enabled: true,
      }),
    });

    if (res.ok) {
      await fetchData();
      setEditingKey(null);
    } else {
      const data = await res.json();
      alert(data.error || "保存失敗");
    }
    setSaving(false);
  };

  const handleClearSetting = async (key: string) => {
    setSaving(true);
    await fetch("/api/admin/line/friend-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        setting_key: key,
        setting_value: {
          greeting_message: "",
          assign_tags: [],
          assign_mark: "none",
          actions: [],
        },
        enabled: false,
      }),
    });
    await fetchData();
    setSaving(false);
  };

  return (
    <div className="min-h-full bg-gray-50/50">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            友だち追加時設定
          </h1>
          <p className="text-sm text-gray-400 mt-1">友だち追加時に自動実行するアクションを設定</p>
        </div>
      </div>

      {/* メインコンテンツ - Lステップ風2カラム */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-green-200 border-t-green-500 rounded-full animate-spin" />
              <span className="text-sm text-gray-400">読み込み中...</span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {settings.map((setting) => {
              const labels = SETTING_LABELS[setting.setting_key] || { title: setting.setting_key, description: "" };
              const sv = setting.setting_value;

              return (
                <div key={setting.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  {/* カードヘッダー */}
                  <div className="px-6 py-4 bg-gray-50/80 border-b border-gray-100">
                    <h2 className="font-bold text-gray-800 text-sm">{labels.title}</h2>
                    <p className="text-xs text-gray-400 mt-1 leading-relaxed">{labels.description}</p>
                  </div>

                  {/* 設定内容 */}
                  <div className="px-6 py-4">
                    {/* 現在のアクション表示 */}
                    <div className="space-y-2 mb-4">
                      {sv.greeting_message && (
                        <div className="flex items-start gap-2 text-xs">
                          <span className="flex-shrink-0 px-2 py-0.5 bg-blue-50 text-blue-600 rounded font-medium">テキスト送信</span>
                          <span className="text-gray-500 line-clamp-2">{sv.greeting_message}</span>
                        </div>
                      )}
                      {sv.assign_mark && sv.assign_mark !== "none" && (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="flex-shrink-0 px-2 py-0.5 bg-orange-50 text-orange-600 rounded font-medium">マーク設定</span>
                          <span className="text-gray-500">{marks.find(m => m.value === sv.assign_mark)?.label || sv.assign_mark}</span>
                        </div>
                      )}
                      {sv.menu_change && (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="flex-shrink-0 px-2 py-0.5 bg-purple-50 text-purple-600 rounded font-medium">メニュー変更</span>
                          <span className="text-gray-500">{sv.menu_change}</span>
                        </div>
                      )}
                      {sv.assign_tags && sv.assign_tags.length > 0 && (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="flex-shrink-0 px-2 py-0.5 bg-violet-50 text-violet-600 rounded font-medium">タグ付与</span>
                          <span className="text-gray-500">{sv.assign_tags.join(", ")}</span>
                        </div>
                      )}
                      {!sv.greeting_message && (!sv.assign_mark || sv.assign_mark === "none") && (!sv.assign_tags || sv.assign_tags.length === 0) && (
                        <p className="text-xs text-gray-300 py-2">アクション未設定</p>
                      )}
                    </div>

                    {/* アクションボタン */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(setting)}
                        className="flex-1 px-4 py-2.5 bg-gradient-to-r from-amber-400 to-yellow-500 text-white rounded-xl text-xs font-medium hover:from-amber-500 hover:to-yellow-600 transition-all shadow-sm flex items-center justify-center gap-1.5"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        アクションを設定する
                      </button>
                      <button
                        onClick={() => handleClearSetting(setting.setting_key)}
                        className="px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-xs font-medium hover:bg-gray-50 transition-colors"
                      >
                        設定解除
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 保存ボタン */}
        {!loading && (
          <div className="flex justify-center mt-8">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-16 py-3 bg-gradient-to-r from-[#06C755] to-[#05a648] text-white rounded-xl text-sm font-bold hover:from-[#05b34d] hover:to-[#049a42] shadow-lg shadow-green-500/25 transition-all disabled:opacity-40"
            >
              {saving ? "保存中..." : "保存"}
            </button>
          </div>
        )}
      </div>

      {/* アクション設定モーダル - Lステップ風 */}
      {editingKey && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setEditingKey(null)}>
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <h2 className="font-bold text-gray-900 text-lg">アクション設定</h2>
              <button onClick={() => setEditingKey(null)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-5 space-y-6 overflow-y-auto flex-1">
              {/* 1. テキスト送信 */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-bold text-gray-700">1. テキスト送信</span>
                </div>
                <div className="flex items-center gap-1 px-3 py-2 bg-white border border-gray-200 rounded-t-lg border-b-0 text-xs text-gray-400">
                  <button className="px-2 py-0.5 bg-gray-100 rounded hover:bg-gray-200">名前</button>
                  <button className="px-2 py-0.5 bg-gray-100 rounded hover:bg-gray-200">友だち情報</button>
                </div>
                <textarea
                  value={greetingMessage}
                  onChange={(e) => setGreetingMessage(e.target.value)}
                  placeholder="友だち追加時に送信するメッセージ..."
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-200 rounded-b-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 resize-none"
                />
              </div>

              {/* 2. メニュー操作 */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-bold text-gray-700">2. メニュー操作</span>
                </div>
                <select
                  value={menuChange}
                  onChange={(e) => setMenuChange(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 bg-white"
                >
                  <option value="">メニュー変更なし</option>
                  <option value="個人情報入力前">個人情報入力前</option>
                  <option value="処方後の">処方後の</option>
                </select>
              </div>

              {/* 3. マーク設定 */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-bold text-gray-700">3. 対応マーク設定</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {marks.map(m => (
                    <button
                      key={m.value}
                      onClick={() => setAssignMark(m.value)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        assignMark === m.value
                          ? "bg-white shadow-sm ring-2 ring-green-400"
                          : "bg-white/50 hover:bg-white border border-gray-200"
                      }`}
                    >
                      {m.value !== "none" ? (
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: m.color }} />
                      ) : (
                        <span className="w-3 h-3 rounded-full border-2 border-gray-300" />
                      )}
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. タグ付与 */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-bold text-gray-700">4. タグ操作</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {tags.map(t => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setSelectedTags(prev =>
                          prev.includes(t.name)
                            ? prev.filter(n => n !== t.name)
                            : [...prev, t.name]
                        );
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        selectedTags.includes(t.name)
                          ? "text-white shadow-sm"
                          : "bg-white/50 hover:bg-white border border-gray-200 text-gray-600"
                      }`}
                      style={selectedTags.includes(t.name) ? { backgroundColor: t.color } : {}}
                    >
                      {t.name}
                    </button>
                  ))}
                  {tags.length === 0 && (
                    <p className="text-xs text-gray-400">タグがまだ作成されていません</p>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0">
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full px-4 py-3 bg-gradient-to-r from-[#06C755] to-[#05a648] text-white rounded-xl text-sm font-bold hover:from-[#05b34d] hover:to-[#049a42] shadow-lg shadow-green-500/25 transition-all disabled:opacity-40"
              >
                {saving ? "保存中..." : "この条件で決定する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
