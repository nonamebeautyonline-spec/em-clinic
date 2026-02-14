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

  // 新規作成
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

  // 有効/無効トグル
  const handleToggle = async (s: Scenario) => {
    await fetch("/api/admin/line/step-scenarios", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: s.id, is_enabled: !s.is_enabled }),
    });
    loadData();
  };

  // 削除
  const handleDelete = async (id: number) => {
    if (!confirm("このシナリオを削除しますか？登録者データも全て削除されます。")) return;
    await fetch(`/api/admin/line/step-scenarios?id=${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    loadData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-[#06C755] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">ステップ配信</h1>
          <p className="text-sm text-gray-500 mt-1">
            友だち追加やタグ追加をトリガーに、設定した間隔で自動メッセージを配信
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-[#06C755] text-white text-sm font-medium rounded-lg hover:bg-[#05b34c] transition-colors"
        >
          + 新しいシナリオ
        </button>
      </div>

      {/* シナリオ一覧 */}
      {scenarios.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">📮</div>
          <p className="text-sm">ステップ配信シナリオはまだありません</p>
          <p className="text-xs text-gray-300 mt-1">「新しいシナリオ」からステップ配信を作成できます</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {scenarios.map((s) => (
            <div
              key={s.id}
              className={`bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow ${
                !s.is_enabled ? "opacity-60" : ""
              }`}
            >
              <div className="flex items-start justify-between">
                {/* 左: 情報 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <button
                      onClick={() => router.push(`/admin/line/step-scenarios/${s.id}`)}
                      className="text-base font-bold text-gray-900 hover:text-[#06C755] transition-colors truncate"
                    >
                      {s.name}
                    </button>
                    {!s.is_enabled && (
                      <span className="shrink-0 px-2 py-0.5 text-[10px] bg-gray-100 text-gray-500 rounded-full">
                        停止中
                      </span>
                    )}
                  </div>

                  {/* トリガー情報 */}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mb-3">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">
                      {TRIGGER_LABELS[s.trigger_type] || s.trigger_type}
                    </span>
                    {s.trigger_type === "tag_add" && s.trigger_tag && (
                      <span
                        className="px-2 py-0.5 rounded-full text-white"
                        style={{ backgroundColor: s.trigger_tag.color || "#888" }}
                      >
                        {s.trigger_tag.name}
                      </span>
                    )}
                    {s.trigger_type === "keyword" && s.trigger_keyword && (
                      <code className="px-2 py-0.5 bg-gray-100 rounded text-gray-600">
                        {s.trigger_keyword}
                      </code>
                    )}
                  </div>

                  {/* 統計 */}
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span>ステップ数: <span className="text-gray-600 font-medium">{s.step_count}</span></span>
                    <span>登録者: <span className="text-gray-600 font-medium">{s.total_enrolled}</span></span>
                    <span>完了: <span className="text-gray-600 font-medium">{s.total_completed}</span></span>
                  </div>
                </div>

                {/* 右: 操作 */}
                <div className="flex items-center gap-3 ml-4">
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
                  <button
                    onClick={() => router.push(`/admin/line/step-scenarios/${s.id}`)}
                    className="px-3 py-1.5 text-xs text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    削除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
