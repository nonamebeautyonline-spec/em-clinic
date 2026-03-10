"use client";

import { useState } from "react";

const ALL_FEATURES = [
  // LINE・配信
  { key: "管理画面", category: "基本" },
  { key: "友だち管理（CRM）", category: "基本" },
  { key: "LINEトーク", category: "LINE・配信" },
  { key: "セグメント配信", category: "LINE・配信" },
  { key: "ステップシナリオ", category: "LINE・配信" },
  { key: "リッチメニュー", category: "LINE・配信" },
  { key: "フォームビルダー", category: "LINE・配信" },
  { key: "アクション自動化", category: "LINE・配信" },
  { key: "自動リマインド", category: "LINE・配信" },
  { key: "クーポン配信", category: "LINE・配信" },
  // 予約・診察
  { key: "予約カレンダー", category: "予約・診察" },
  { key: "カルテ管理", category: "予約・診察" },
  { key: "問診フォーム", category: "予約・診察" },
  { key: "処方タイムライン", category: "予約・診察" },
  // 決済・配送
  { key: "決済管理", category: "決済・配送" },
  { key: "配送管理", category: "決済・配送" },
  { key: "在庫管理", category: "決済・配送" },
  // 分析
  { key: "ダッシュボード", category: "分析" },
  { key: "売上管理", category: "分析" },
  { key: "NPS調査", category: "分析" },
  // AI
  { key: "AI自動返信", category: "AI" },
  { key: "音声カルテ", category: "AI" },
];

const CATEGORIES = [...new Set(ALL_FEATURES.map((f) => f.category))];

const PLAN_NAMES = ["ライト", "スタンダード", "プロ", "エンタープライズ"] as const;

type PlanSelections = Record<string, string[]>;

export default function PlanBuilderPage() {
  const [selections, setSelections] = useState<PlanSelections>({
    ライト: ["管理画面", "友だち管理（CRM）", "LINEトーク"],
    スタンダード: [
      "セグメント配信", "ステップシナリオ", "リッチメニュー",
      "フォームビルダー", "アクション自動化", "自動リマインド", "クーポン配信",
    ],
    プロ: [
      "予約カレンダー", "カルテ管理", "問診フォーム", "処方タイムライン",
      "決済管理", "配送管理", "在庫管理", "ダッシュボード", "売上管理",
    ],
    エンタープライズ: ["AI自動返信", "音声カルテ", "AIメニュー生成", "NPS調査"],
  });

  const [copied, setCopied] = useState(false);

  const toggle = (plan: string, feature: string) => {
    setSelections((prev) => {
      const current = prev[plan] || [];
      const next = current.includes(feature)
        ? current.filter((f) => f !== feature)
        : [...current, feature];
      return { ...prev, [plan]: next };
    });
  };

  // あるプランに含まれる全機能（そのプラン以下の累積）
  const getCumulativeFeatures = (planIdx: number): string[] => {
    const features: string[] = [];
    for (let i = 0; i <= planIdx; i++) {
      features.push(...(selections[PLAN_NAMES[i]] || []));
    }
    return features;
  };

  // エクスポート用JSON
  const exportData = () => {
    const output = PLAN_NAMES.map((name, idx) => ({
      key: name,
      features: selections[name] || [],
      cumulative: getCumulativeFeatures(idx),
    }));
    const text = JSON.stringify(output, null, 2);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 px-5 py-10">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-2 text-2xl font-extrabold text-slate-800">
          プラン機能ビルダー
        </h1>
        <p className="mb-8 text-sm text-slate-500">
          各プランに含める機能をチェックしてください。上位プランは下位プランの全機能を自動的に含みます。
        </p>

        {/* プラン列 */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-slate-50 px-4 py-3 text-left text-xs font-semibold text-slate-500">
                  機能
                </th>
                {PLAN_NAMES.map((name, idx) => (
                  <th key={name} className="px-4 py-3 text-center">
                    <p className="text-sm font-bold text-slate-800">{name}</p>
                    <p className="text-[10px] text-slate-400">
                      {getCumulativeFeatures(idx).length}機能
                    </p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CATEGORIES.map((cat) => (
                <>
                  <tr key={`cat-${cat}`}>
                    <td
                      colSpan={5}
                      className="bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600"
                    >
                      {cat}
                    </td>
                  </tr>
                  {ALL_FEATURES.filter((f) => f.category === cat).map((f) => (
                    <tr key={f.key} className="border-t border-slate-100">
                      <td className="sticky left-0 z-10 bg-white px-4 py-2.5 font-medium text-slate-700">
                        {f.key}
                      </td>
                      {PLAN_NAMES.map((name, planIdx) => {
                        const isDirectlySelected = (selections[name] || []).includes(f.key);
                        // 下位プランで既に含まれている場合
                        const isInherited =
                          !isDirectlySelected &&
                          planIdx > 0 &&
                          getCumulativeFeatures(planIdx - 1).includes(f.key);

                        return (
                          <td key={name} className="bg-white px-4 py-2.5 text-center">
                            {isInherited ? (
                              <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-blue-100 text-blue-400">
                                <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              </span>
                            ) : (
                              <input
                                type="checkbox"
                                checked={isDirectlySelected}
                                onChange={() => toggle(name, f.key)}
                                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                              />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>

        {/* サマリー */}
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PLAN_NAMES.map((name, idx) => {
            const cumulative = getCumulativeFeatures(idx);
            const direct = selections[name] || [];
            return (
              <div key={name} className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="text-base font-bold text-slate-800">{name}</h3>
                <p className="mb-3 text-xs text-slate-400">
                  {cumulative.length}機能（新規 {direct.length}）
                </p>
                <div className="flex flex-wrap gap-1">
                  {cumulative.map((f) => (
                    <span
                      key={f}
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        direct.includes(f)
                          ? "bg-blue-100 text-blue-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* エクスポート */}
        <div className="mt-8 text-center">
          <button
            onClick={exportData}
            className="rounded-xl bg-blue-600 px-8 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
          >
            {copied ? "コピーしました！" : "設定をクリップボードにコピー"}
          </button>
          <p className="mt-2 text-xs text-slate-400">
            コピーした内容を貼り付けてもらえれば、コードに反映します
          </p>
        </div>
      </div>
    </div>
  );
}
