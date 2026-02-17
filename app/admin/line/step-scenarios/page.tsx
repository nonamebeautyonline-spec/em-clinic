"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

/* ---------- 型定義 ---------- */
interface Scenario {
  id: number;
  name: string;
  trigger_type: string;
  trigger_tag: { id: number; name: string; color: string } | null;
  trigger_keyword: string | null;
  trigger_keyword_match: string | null;
  is_enabled: boolean;
  step_count: number;
  total_enrolled: number;
  total_completed: number;
  created_at: string;
}

const TRIGGER_LABELS: Record<string, string> = {
  follow: "友だち追加時",
  tag_add: "タグ追加時",
  keyword: "キーワード受信時",
  manual: "手動登録のみ",
};

const TRIGGER_ICONS: Record<string, string> = {
  follow: "M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z",
  tag_add: "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z",
  keyword: "M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z",
  manual: "M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5",
};

/* ---------- メインページ ---------- */
export default function StepScenariosPage() {
  const router = useRouter();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/line/step-scenarios", { credentials: "include" });
      if (res.ok) {
        const d = await res.json();
        setScenarios(d.scenarios || []);
      }
    } catch (e) {
      console.error("データ取得エラー:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = async () => {
    try {
      const res = await fetch("/api/admin/line/step-scenarios", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "新しいシナリオ",
          trigger_type: "follow",
          is_enabled: false,
          steps: [],
        }),
      });
      if (res.ok) {
        const d = await res.json();
        router.push(`/admin/line/step-scenarios/${d.scenario.id}`);
      }
    } catch (e) {
      console.error("作成エラー:", e);
    }
  };

  const handleToggle = async (s: Scenario) => {
    await fetch("/api/admin/line/step-scenarios", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: s.id, is_enabled: !s.is_enabled }),
    });
    loadData();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("このシナリオを削除しますか？登録者データも全て削除されます。")) return;
    await fetch(`/api/admin/line/step-scenarios?id=${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    loadData();
  };

  const activeCount = scenarios.filter(s => s.is_enabled).length;
  const totalEnrolled = scenarios.reduce((sum, s) => sum + s.total_enrolled, 0);
  const totalCompleted = scenarios.reduce((sum, s) => sum + s.total_completed, 0);

  return (
    <div className="min-h-full bg-gray-50/50">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                ステップ配信
              </h1>
              <p className="text-sm text-gray-400 mt-1">友だち追加やタグ追加をトリガーに、設定した間隔で自動メッセージを配信</p>
            </div>
            <button
              onClick={handleCreate}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl text-sm font-medium hover:from-emerald-600 hover:to-green-700 shadow-lg shadow-emerald-500/25 transition-all duration-200 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              新しいシナリオ
            </button>
          </div>

          {/* サマリーカード */}
          {scenarios.length > 0 && (
            <div className="grid grid-cols-4 gap-4 mt-6">
              <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-4 border border-emerald-100/50">
                <div className="text-2xl font-bold text-emerald-700">{scenarios.length}</div>
                <div className="text-xs text-emerald-500 mt-0.5">シナリオ総数</div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-lime-50 rounded-xl p-4 border border-green-100/50">
                <div className="text-2xl font-bold text-green-700">{activeCount}</div>
                <div className="text-xs text-green-500 mt-0.5">稼働中</div>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-sky-50 rounded-xl p-4 border border-blue-100/50">
                <div className="text-2xl font-bold text-blue-700">{totalEnrolled}</div>
                <div className="text-xs text-blue-500 mt-0.5">登録者数</div>
              </div>
              <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl p-4 border border-violet-100/50">
                <div className="text-2xl font-bold text-violet-700">{totalCompleted}</div>
                <div className="text-xs text-violet-500 mt-0.5">完了者数</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* シナリオ一覧 */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" />
              <span className="text-sm text-gray-400">読み込み中...</span>
            </div>
          </div>
        ) : scenarios.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <p className="text-gray-400 text-sm">ステップ配信シナリオはまだありません</p>
            <p className="text-gray-300 text-xs mt-1">「新しいシナリオ」からステップ配信を作成しましょう</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {scenarios.map((s) => (
              <div
                key={s.id}
                className={`bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md hover:border-gray-200 transition-all duration-200 group ${
                  !s.is_enabled ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-start justify-between">
                  {/* 左: 情報 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-2">
                      {/* トリガーアイコン */}
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        s.is_enabled
                          ? "bg-gradient-to-br from-emerald-500 to-green-600"
                          : "bg-gray-200"
                      }`}>
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={TRIGGER_ICONS[s.trigger_type] || TRIGGER_ICONS.manual} />
                        </svg>
                      </div>
                      <div>
                        <button
                          onClick={() => router.push(`/admin/line/step-scenarios/${s.id}`)}
                          className="text-[15px] font-semibold text-gray-900 hover:text-emerald-600 transition-colors truncate block"
                        >
                          {s.name}
                        </button>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] text-gray-400">
                            {TRIGGER_LABELS[s.trigger_type] || s.trigger_type}
                          </span>
                          {s.trigger_type === "tag_add" && s.trigger_tag && (
                            <span
                              className="px-1.5 py-0.5 rounded text-[10px] font-medium text-white"
                              style={{ backgroundColor: s.trigger_tag.color || "#888" }}
                            >
                              {s.trigger_tag.name}
                            </span>
                          )}
                          {s.trigger_type === "keyword" && s.trigger_keyword && (
                            <code className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] text-gray-600 font-mono">
                              {s.trigger_keyword}
                            </code>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 統計バー */}
                    <div className="flex items-center gap-5 mt-3 ml-10">
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span className="text-[11px] text-gray-400">ステップ</span>
                        <span className="text-[11px] font-bold text-gray-700">{s.step_count}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                        <span className="text-[11px] text-gray-400">登録者</span>
                        <span className="text-[11px] font-bold text-gray-700">{s.total_enrolled}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                        <span className="text-[11px] text-gray-400">完了</span>
                        <span className="text-[11px] font-bold text-gray-700">{s.total_completed}</span>
                      </div>
                      {s.total_enrolled > 0 && (
                        <div className="flex items-center gap-1.5 ml-auto">
                          <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-400 to-green-500 rounded-full transition-all"
                              style={{ width: `${Math.round((s.total_completed / s.total_enrolled) * 100)}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-gray-400">
                            {Math.round((s.total_completed / s.total_enrolled) * 100)}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 右: 操作 */}
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => router.push(`/admin/line/step-scenarios/${s.id}`)}
                      className="px-3 py-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleToggle(s)}
                      className={`w-10 h-5 rounded-full relative transition-colors ${
                        s.is_enabled ? "bg-[#06C755]" : "bg-gray-300"
                      }`}
                      title={s.is_enabled ? "停止する" : "有効にする"}
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                          s.is_enabled ? "translate-x-5" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
