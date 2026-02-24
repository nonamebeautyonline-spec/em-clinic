"use client";

import { useState, useEffect } from "react";

interface SetupStatus {
  ok: boolean;
  setupComplete: boolean;
  completedCount: number;
  totalCount: number;
  steps: {
    line: boolean;
    payment: boolean;
    products: boolean;
    schedule: boolean;
    staff: boolean;
    richMenu: boolean;
  };
}

// ステップ定義（ラベル・リンク・説明）
const STEP_DEFINITIONS = [
  {
    key: "line" as const,
    label: "LINE連携設定",
    description: "LINE Messaging APIのチャネルアクセストークンを設定",
    link: "/admin/settings",
  },
  {
    key: "payment" as const,
    label: "決済設定",
    description: "Square/GMOなどの決済サービスを連携",
    link: "/admin/settings",
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
    key: "staff" as const,
    label: "スタッフ追加",
    description: "チームメンバーを招待（2名以上）",
    link: "/admin/settings",
  },
  {
    key: "richMenu" as const,
    label: "リッチメニュー設定",
    description: "LINEリッチメニューを作成",
    link: "/admin/rich-menus",
  },
];

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
        if (data) setStatus(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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
          onClick={onDismiss}
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
        {STEP_DEFINITIONS.map((step) => {
          const completed = status.steps[step.key];
          return (
            <div
              key={step.key}
              className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                completed
                  ? "opacity-40"
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
