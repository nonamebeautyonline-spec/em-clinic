"use client";

// KPI目標 vs 実績ウィジェット
// プログレスバー + 達成率% 表示、目標設定モーダル付き

import { useState } from "react";
import useSWR, { mutate } from "swr";

// KPI目標データの型
interface KPITarget {
  id: string;
  metric_type: string;
  target_value: number;
  year_month: string;
  actual_value: number | null;
  achievement_rate: number | null;
}

interface KPITargetResponse {
  targets: KPITarget[];
  actuals: Record<string, number>;
}

// メトリクスタイプの日本語ラベルと単位
const METRIC_CONFIG: Record<string, { label: string; unit: string; format: (v: number) => string }> = {
  revenue: {
    label: "売上",
    unit: "円",
    format: (v) => `¥${v.toLocaleString()}`,
  },
  new_patients: {
    label: "新規患者数",
    unit: "人",
    format: (v) => `${v.toLocaleString()}人`,
  },
  reservations: {
    label: "予約数",
    unit: "件",
    format: (v) => `${v.toLocaleString()}件`,
  },
  paid_count: {
    label: "決済完了数",
    unit: "件",
    format: (v) => `${v.toLocaleString()}件`,
  },
  repeat_rate: {
    label: "リピート率",
    unit: "%",
    format: (v) => `${v}%`,
  },
  payment_rate: {
    label: "診療後決済率",
    unit: "%",
    format: (v) => `${v}%`,
  },
};

// 全メトリクスタイプ
const ALL_METRIC_TYPES = Object.keys(METRIC_CONFIG);

function getCurrentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function KPITargetWidget() {
  const [yearMonth, setYearMonth] = useState(getCurrentYearMonth());
  const [showModal, setShowModal] = useState(false);

  const swrKey = `/api/admin/kpi-targets?year_month=${yearMonth}&with_actuals=true`;
  const { data: kpiData, isLoading: loading } = useSWR<KPITargetResponse>(swrKey);
  const targets = kpiData?.targets ?? [];
  const actuals = kpiData?.actuals ?? {};

  const fetchTargets = () => mutate(swrKey);

  // 達成率に応じた色を返す
  const getProgressColor = (rate: number | null): string => {
    if (rate == null) return "bg-slate-300";
    if (rate >= 100) return "bg-green-500";
    if (rate >= 75) return "bg-blue-500";
    if (rate >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getTextColor = (rate: number | null): string => {
    if (rate == null) return "text-slate-500";
    if (rate >= 100) return "text-green-600";
    if (rate >= 75) return "text-blue-600";
    if (rate >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  // 月の表示名
  const formatYearMonth = (ym: string) => {
    const [y, m] = ym.split("-");
    return `${y}年${parseInt(m)}月`;
  };

  // 前月・翌月ナビゲーション
  const navigateMonth = (direction: -1 | 1) => {
    const [y, m] = yearMonth.split("-").map(Number);
    const newMonth = m + direction;
    if (newMonth < 1) {
      setYearMonth(`${y - 1}-12`);
    } else if (newMonth > 12) {
      setYearMonth(`${y + 1}-01`);
    } else {
      setYearMonth(`${y}-${String(newMonth).padStart(2, "0")}`);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 animate-pulse">
        <div className="h-4 w-48 bg-slate-200 rounded mb-4" />
        <div className="space-y-4">
          <div className="h-16 bg-slate-100 rounded" />
          <div className="h-16 bg-slate-100 rounded" />
          <div className="h-16 bg-slate-100 rounded" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold text-slate-900">KPI目標 vs 実績</h3>
            {/* 月ナビゲーション */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => navigateMonth(-1)}
                className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                aria-label="前月"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="text-sm font-medium text-slate-600 min-w-[100px] text-center">
                {formatYearMonth(yearMonth)}
              </span>
              <button
                onClick={() => navigateMonth(1)}
                className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                aria-label="翌月"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            目標設定
          </button>
        </div>

        {/* KPI一覧 */}
        {targets.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <p className="text-sm">目標が未設定です</p>
            <p className="text-xs mt-1">「目標設定」ボタンから設定してください</p>
            {/* 目標未設定でも実績だけ表示 */}
            {Object.keys(actuals).length > 0 && (
              <div className="mt-6 text-left">
                <h4 className="text-sm font-semibold text-slate-600 mb-3">今月の実績</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {ALL_METRIC_TYPES.map((mt) => {
                    const config = METRIC_CONFIG[mt];
                    const val = actuals[mt];
                    if (val == null) return null;
                    return (
                      <div key={mt} className="bg-slate-50 rounded-lg p-3">
                        <div className="text-xs text-slate-500">{config.label}</div>
                        <div className="text-lg font-bold text-slate-900 mt-1">
                          {config.format(val)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {targets.map((target) => {
              const config = METRIC_CONFIG[target.metric_type] || {
                label: target.metric_type,
                unit: "",
                format: (v: number) => `${v}`,
              };
              const rate = target.achievement_rate;
              const progressWidth = Math.min(rate || 0, 100);

              return (
                <div key={target.id} className="group">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-slate-700">
                      {config.label}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-500">
                        {target.actual_value != null
                          ? config.format(target.actual_value)
                          : "---"}{" "}
                        / {config.format(target.target_value)}
                      </span>
                      <span
                        className={`text-sm font-bold ${getTextColor(rate)} min-w-[48px] text-right`}
                      >
                        {rate != null ? `${rate}%` : "---"}
                      </span>
                    </div>
                  </div>
                  {/* プログレスバー */}
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${getProgressColor(rate)}`}
                      style={{ width: `${progressWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 目標設定モーダル */}
      {showModal && (
        <KPITargetModal
          yearMonth={yearMonth}
          existingTargets={targets}
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false);
            fetchTargets();
          }}
        />
      )}
    </>
  );
}

// ─── 目標設定モーダル ──────────────────────────────────────

interface KPITargetModalProps {
  yearMonth: string;
  existingTargets: KPITarget[];
  onClose: () => void;
  onSaved: () => void;
}

function KPITargetModal({
  yearMonth,
  existingTargets,
  onClose,
  onSaved,
}: KPITargetModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // 各メトリクスの目標値（既存値で初期化）
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const mt of ALL_METRIC_TYPES) {
      const existing = existingTargets.find((t) => t.metric_type === mt);
      initial[mt] = existing ? String(existing.target_value) : "";
    }
    return initial;
  });

  const handleSave = async () => {
    setSaving(true);
    setError("");

    try {
      // 値が入力されたものだけ保存
      const toSave = ALL_METRIC_TYPES.filter(
        (mt) => values[mt] !== "" && !isNaN(Number(values[mt])),
      );

      // 値がクリアされたもの（以前あったが空になった）は削除
      const toDelete = existingTargets.filter(
        (t) => values[t.metric_type] === "" || values[t.metric_type] == null,
      );

      // 保存
      for (const mt of toSave) {
        const res = await fetch("/api/admin/kpi-targets", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            metric_type: mt,
            target_value: Number(values[mt]),
            year_month: yearMonth,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "保存に失敗しました");
        }
      }

      // 削除
      for (const t of toDelete) {
        await fetch("/api/admin/kpi-targets", {
          method: "DELETE",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: t.id }),
        });
      }

      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const formatYearMonth = (ym: string) => {
    const [y, m] = ym.split("-");
    return `${y}年${parseInt(m)}月`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-900">KPI目標設定</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {formatYearMonth(yearMonth)}の目標
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 transition-colors rounded-lg hover:bg-slate-100"
            aria-label="閉じる"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* フォーム */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {ALL_METRIC_TYPES.map((mt) => {
            const config = METRIC_CONFIG[mt];
            return (
              <div key={mt}>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {config.label}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step={mt === "repeat_rate" || mt === "payment_rate" ? "0.1" : "1"}
                    value={values[mt]}
                    onChange={(e) =>
                      setValues((prev) => ({ ...prev, [mt]: e.target.value }))
                    }
                    placeholder={`目標${config.label}を入力`}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                    {config.unit}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* フッター */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}
