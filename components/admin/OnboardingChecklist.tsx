"use client";

import { useState, useEffect, useMemo } from "react";

interface SetupStatus {
  ok: boolean;
  setupComplete: boolean;
  completedCount: number;
  totalCount: number;
  steps: {
    general: boolean;
    line: boolean;
    payment: boolean;
    products: boolean;
    schedule: boolean;
    consultation: boolean;
    staff: boolean;
    richMenu: boolean;
  };
}

// ステップ定義（ラベル・リンク・説明）
const STEP_DEFINITIONS = [
  {
    key: "general" as const,
    label: "基本情報設定",
    description: "クリニック名・住所・ロゴを登録",
    link: "/admin/settings?section=general",
  },
  {
    key: "line" as const,
    label: "LINE連携設定",
    description: "LINE Messaging APIのチャネルアクセストークンを設定",
    link: "/admin/settings?section=line",
  },
  {
    key: "payment" as const,
    label: "決済設定",
    description: "Square/GMOなどの決済サービスを連携",
    link: "/admin/settings?section=payment",
  },
  {
    key: "products" as const,
    label: "商品登録",
    description: "処方商品を1件以上登録",
    link: "/admin/products",
  },
  {
    key: "schedule" as const,
    label: "予約スロット設定",
    description: "医師の診療スケジュールを設定",
    link: "/admin/schedule",
  },
  {
    key: "consultation" as const,
    label: "診察設定",
    description: "オンライン/対面の診察モードを選択",
    link: "/admin/settings?section=consultation",
  },
  {
    key: "staff" as const,
    label: "スタッフ追加",
    description: "チームメンバーを招待（2名以上）",
    link: "/admin/settings?section=account",
  },
  {
    key: "richMenu" as const,
    label: "リッチメニュー設定",
    description: "LINEリッチメニューを作成",
    link: "/admin/rich-menus",
  },
];

const STORAGE_KEY_DISMISSED = "onboarding_dismissed_at";
const STORAGE_KEY_TOTAL = "onboarding_last_total";

export default function OnboardingChecklist({
  onDismiss,
}: {
  onDismiss: () => void;
}) {
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/setup-status", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setStatus(data);
          // ステップ数が増えた場合はdismiss状態をリセット
          if (typeof window !== "undefined") {
            const lastTotal = localStorage.getItem(STORAGE_KEY_TOTAL);
            if (lastTotal && Number(lastTotal) < data.totalCount) {
              localStorage.removeItem(STORAGE_KEY_DISMISSED);
            }
            localStorage.setItem(STORAGE_KEY_TOTAL, String(data.totalCount));
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // 未完了を先、完了を後にソート。最初の未完了に「推奨」表示
  const sortedSteps = useMemo(() => {
    if (!status) return STEP_DEFINITIONS;
    return [...STEP_DEFINITIONS].sort((a, b) => {
      const aDone = status.steps[a.key] ? 1 : 0;
      const bDone = status.steps[b.key] ? 1 : 0;
      return aDone - bDone;
    });
  }, [status]);

  const firstIncompleteKey = useMemo(() => {
    if (!status) return null;
    return sortedSteps.find((s) => !status.steps[s.key])?.key ?? null;
  }, [status, sortedSteps]);

  const handleDismiss = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_DISMISSED, new Date().toISOString());
    }
    onDismiss();
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow border border-blue-200 p-6 mb-8">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-slate-200 rounded w-48" />
          <div className="h-2 bg-slate-200 rounded w-full" />
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-3 bg-slate-200 rounded w-64" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!status) return null;

  // 全完了時は表示しない
  if (status.setupComplete) return null;

  const progressPercent = Math.round(
    (status.completedCount / status.totalCount) * 100
  );

  return (
    <div className="bg-white rounded-lg shadow border border-blue-200 p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            初期セットアップ
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {status.completedCount}/{status.totalCount} 完了
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="text-xs text-slate-400 hover:text-slate-600"
        >
          チェックリストを閉じる
        </button>
      </div>

      {/* プログレスバー */}
      <div className="w-full bg-slate-200 rounded-full h-2 mb-6">
        <div
          className="bg-blue-500 h-2 rounded-full transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* ステップリスト */}
      <div className="space-y-3">
        {sortedSteps.map((step) => {
          const completed = status.steps[step.key];
          const isRecommended = step.key === firstIncompleteKey;
          return (
            <div
              key={step.key}
              className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                completed
                  ? "opacity-40"
                  : isRecommended
                    ? "bg-blue-50 border border-blue-200"
                    : "hover:bg-slate-50"
              }`}
            >
              {/* チェックアイコン */}
              <div
                className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5 ${
                  completed
                    ? "bg-green-500 text-white"
                    : "bg-slate-200 text-slate-400"
                }`}
              >
                {completed ? (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  <span className="w-2 h-2 bg-slate-400 rounded-full" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <span
                  className={`text-sm font-medium ${
                    completed
                      ? "text-slate-400"
                      : "text-slate-900"
                  }`}
                >
                  {step.label}
                  {isRecommended && (
                    <span className="ml-2 inline-block text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-normal">
                      推奨
                    </span>
                  )}
                </span>
                <p className={`text-xs mt-0.5 ${
                  completed ? "text-slate-300" : "text-slate-500"
                }`}>
                  {step.description}
                </p>
              </div>

              {!completed && (
                <a
                  href={step.link}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium flex-shrink-0"
                >
                  設定する
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
