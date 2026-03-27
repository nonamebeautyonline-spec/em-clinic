"use client";

import { useState, useMemo, useCallback } from "react";
import { DEMO_FAQ, type DemoFAQ } from "../_data/mock";

// カテゴリ定義
const CATEGORIES = ["全て", "基本操作", "LINE連携", "予約・診察", "決済・発送", "分析・レポート"];

export default function DemoHelpPage() {
  const [selectedCategory, setSelectedCategory] = useState("全て");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);

  // トースト表示
  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  }, []);

  // フィルタリング
  const filteredFaqs = useMemo(() => {
    let result = [...DEMO_FAQ];

    // カテゴリフィルタ
    if (selectedCategory !== "全て") {
      result = result.filter((faq) => faq.category === selectedCategory);
    }

    // 検索フィルタ
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      result = result.filter(
        (faq) =>
          faq.question.toLowerCase().includes(query) ||
          faq.answer.toLowerCase().includes(query)
      );
    }

    return result;
  }, [selectedCategory, searchQuery]);

  // カテゴリごとにグルーピング
  const groupedFaqs = useMemo(() => {
    const groups: Record<string, DemoFAQ[]> = {};
    for (const faq of filteredFaqs) {
      if (!groups[faq.category]) {
        groups[faq.category] = [];
      }
      groups[faq.category].push(faq);
    }
    return groups;
  }, [filteredFaqs]);

  // アコーディオン開閉
  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // カテゴリアイコン
  const categoryIcon = (category: string) => {
    switch (category) {
      case "基本操作":
        return "⚙️";
      case "LINE連携":
        return "💬";
      case "予約・診察":
        return "📅";
      case "決済・発送":
        return "💳";
      case "分析・レポート":
        return "📊";
      default:
        return "📋";
    }
  };

  return (
    <div className="p-6 pb-12 max-w-6xl mx-auto">
      {/* トースト */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-slate-800 text-white px-4 py-3 rounded-lg shadow-lg text-sm animate-[fadeIn_0.2s_ease-out]">
          {toast}
        </div>
      )}

      {/* ヘッダー */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">ヘルプ</h1>
        <p className="text-sm text-slate-500 mt-1">
          よくある質問と回答をカテゴリ別にまとめています
        </p>
      </div>

      {/* 検索ボックス */}
      <div className="mb-4">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="質問や回答を検索..."
            className="w-full border border-slate-300 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* カテゴリフィルタ */}
      <div className="flex flex-wrap gap-2 mb-6">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selectedCategory === cat
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* FAQ一覧（カテゴリ別グルーピング） */}
      {Object.keys(groupedFaqs).length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-12 text-center text-slate-400">
          該当するFAQが見つかりません
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedFaqs).map(([category, faqs]) => (
            <div key={category}>
              {/* カテゴリ見出し */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">{categoryIcon(category)}</span>
                <h2 className="text-base font-bold text-slate-700">{category}</h2>
                <span className="text-xs text-slate-400 ml-1">{faqs.length}件</span>
              </div>

              {/* アコーディオン */}
              <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                {faqs.map((faq) => {
                  const isExpanded = expandedIds.has(faq.id);
                  return (
                    <div key={faq.id}>
                      {/* 質問ヘッダー */}
                      <button
                        onClick={() => toggleExpand(faq.id)}
                        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors"
                      >
                        <span className="text-sm font-medium text-slate-800 pr-4">
                          {faq.question}
                        </span>
                        <svg
                          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </button>

                      {/* 回答（アニメーション付き展開） */}
                      <div
                        className="overflow-hidden transition-[max-height] duration-300 ease-in-out"
                        style={{ maxHeight: isExpanded ? "500px" : "0px" }}
                      >
                        <div className="px-5 pb-4 text-sm text-slate-600 leading-relaxed">
                          {faq.answer}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* お問い合わせセクション */}
      <div className="mt-10 bg-slate-50 rounded-xl border border-slate-200 p-6">
        <h2 className="text-base font-bold text-slate-800 mb-2">
          お探しの回答が見つかりませんか？
        </h2>
        <p className="text-sm text-slate-500 mb-5">
          上記のFAQで解決しない場合は、以下よりお気軽にお問い合わせください。
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* メール */}
          <div className="bg-white rounded-lg border border-slate-200 p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
              <svg
                className="w-5 h-5 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-800">メールでのお問い合わせ</p>
              <p className="text-sm text-blue-600 mt-0.5">support@l-ope.jp</p>
              <p className="text-xs text-slate-400 mt-1">営業日2日以内に返信いたします</p>
            </div>
          </div>

          {/* 電話 */}
          <div className="bg-white rounded-lg border border-slate-200 p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center shrink-0">
              <svg
                className="w-5 h-5 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-800">電話でのお問い合わせ</p>
              <p className="text-sm text-green-600 mt-0.5">03-0000-0000</p>
              <p className="text-xs text-slate-400 mt-1">平日 10:00〜18:00（土日祝除く）</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
