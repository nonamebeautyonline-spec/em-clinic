"use client";

// コホート分析ウィジェット
// 月別初回購入コホートのリテンション率をヒートマップで表示

import { useState, useRef } from "react";
import useSWR from "swr";

/** コホートAPIレスポンスの型 */
interface CohortRetention {
  monthOffset: number;
  rate: number;
}

interface CohortRow {
  month: string;   // "YYYY-MM"
  size: number;    // コホート人数
  retention: CohortRetention[];
}

/** ツールチップ情報 */
interface TooltipInfo {
  x: number;
  y: number;
  cohortMonth: string;
  cohortSize: number;
  monthOffset: number;
  rate: number;
  activeCount: number;
}

/** 期間フィルタ */
type PeriodFilter = "6" | "12" | "all";

/** リテンション率に応じたセル背景色を返す */
function getCellColor(rate: number): string {
  if (rate >= 80) return "bg-green-600 text-white";
  if (rate >= 60) return "bg-green-400 text-white";
  if (rate >= 40) return "bg-yellow-400 text-claude-near-black";
  if (rate >= 20) return "bg-orange-400 text-white";
  if (rate > 0) return "bg-red-400 text-white";
  return "bg-claude-sand text-claude-stone";
}

/** リテンション率に応じたセル背景色（インラインスタイル用） */
function getCellBgStyle(rate: number): React.CSSProperties {
  // 緑（高）→ 黄 → 赤（低）のグラデーション
  if (rate >= 80) return { backgroundColor: "#16a34a", color: "#fff" };
  if (rate >= 60) return { backgroundColor: "#4ade80", color: "#fff" };
  if (rate >= 40) return { backgroundColor: "#facc15", color: "#1e293b" };
  if (rate >= 20) return { backgroundColor: "#fb923c", color: "#fff" };
  if (rate > 0) return { backgroundColor: "#f87171", color: "#fff" };
  return { backgroundColor: "#f1f5f9", color: "#94a3b8" };
}

/** 月表示を日本語ラベルに変換（"2025-10" → "25年10月"） */
function formatMonthLabel(month: string): string {
  const [y, m] = month.split("-");
  return `${y.slice(2)}年${parseInt(m)}月`;
}

export default function CohortWidget() {
  const { data: rawData, error, isLoading } = useSWR<{ cohort: CohortRow[] }>("/api/admin/analytics?type=cohort");
  const data = rawData?.cohort || [];
  const [period, setPeriod] = useState<PeriodFilter>("12");
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 期間フィルタに応じてデータを絞り込む
  const filteredData = (() => {
    if (period === "all") return data;
    const months = parseInt(period);
    return data.slice(-months);
  })();

  // 最大経過月数を算出（全行のretention配列の最大長）
  const maxOffset = filteredData.reduce(
    (max, row) => Math.max(max, row.retention.length - 1),
    0,
  );

  /** セルのマウスイベントハンドラ */
  const handleCellMouseEnter = (
    e: React.MouseEvent,
    row: CohortRow,
    ret: CohortRetention,
  ) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const activeCount = Math.round((ret.rate / 100) * row.size);
    setTooltip({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      cohortMonth: row.month,
      cohortSize: row.size,
      monthOffset: ret.monthOffset,
      rate: ret.rate,
      activeCount,
    });
  };

  const handleCellMouseLeave = () => {
    setTooltip(null);
  };

  // ローディング
  if (isLoading) {
    return (
      <div className="bg-claude-ivory rounded-2xl border border-claude-border-cream p-6 animate-pulse">
        <div className="h-4 w-48 bg-claude-parchment rounded mb-4" />
        <div className="h-64 bg-claude-parchment rounded" />
      </div>
    );
  }

  // エラー
  if (error) {
    return (
      <div className="bg-claude-ivory rounded-2xl border border-claude-border-cream p-6">
        <h3 className="text-lg font-heading text-claude-near-black mb-2">コホート分析</h3>
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error instanceof Error ? error.message : "エラーが発生しました"}
        </div>
      </div>
    );
  }

  // データなし
  if (filteredData.length === 0) {
    return (
      <div className="bg-claude-ivory rounded-2xl border border-claude-border-cream p-6">
        <h3 className="text-lg font-heading text-claude-near-black mb-2">コホート分析</h3>
        <p className="text-claude-olive text-sm">コホートデータがありません</p>
      </div>
    );
  }

  return (
    <div
      className="bg-claude-ivory rounded-2xl border border-claude-border-cream p-6"
      ref={containerRef}
      style={{ position: "relative" }}
    >
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-heading text-claude-near-black">コホート分析</h3>
          <p className="text-xs text-claude-olive mt-1">
            月別初回購入コホートのリテンション率
          </p>
        </div>

        {/* 期間選択 */}
        <div className="flex gap-1 bg-claude-parchment rounded-lg p-1">
          {(
            [
              { value: "6", label: "6ヶ月" },
              { value: "12", label: "12ヶ月" },
              { value: "all", label: "全期間" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                period === opt.value
                  ? "bg-claude-ivory text-claude-near-black shadow-sm"
                  : "text-claude-olive hover:text-claude-charcoal"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ヒートマップテーブル */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="text-left p-2 font-semibold text-claude-olive whitespace-nowrap sticky left-0 bg-claude-ivory z-10">
                登録月
              </th>
              <th className="p-2 font-semibold text-claude-olive whitespace-nowrap">
                人数
              </th>
              {Array.from({ length: maxOffset + 1 }, (_, i) => (
                <th
                  key={i}
                  className="p-2 font-semibold text-claude-olive whitespace-nowrap text-center"
                >
                  {i === 0 ? "初月" : `${i}ヶ月後`}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredData.map((row) => (
              <tr key={row.month} className="border-t border-claude-border-cream">
                {/* 登録月 */}
                <td className="p-2 font-medium text-claude-charcoal whitespace-nowrap sticky left-0 bg-claude-ivory z-10">
                  {formatMonthLabel(row.month)}
                </td>
                {/* コホート人数 */}
                <td className="p-2 text-center text-claude-olive font-medium">
                  {row.size}人
                </td>
                {/* リテンション率セル */}
                {Array.from({ length: maxOffset + 1 }, (_, i) => {
                  const ret = row.retention.find(
                    (r) => r.monthOffset === i,
                  );
                  if (!ret) {
                    return (
                      <td key={i} className="p-1">
                        <div className="w-full h-8 rounded bg-claude-parchment" />
                      </td>
                    );
                  }
                  return (
                    <td key={i} className="p-1">
                      <div
                        className="w-full h-8 rounded flex items-center justify-center text-xs font-bold cursor-pointer transition-transform hover:scale-105"
                        style={getCellBgStyle(ret.rate)}
                        onMouseEnter={(e) =>
                          handleCellMouseEnter(e, row, ret)
                        }
                        onMouseLeave={handleCellMouseLeave}
                      >
                        {ret.rate}%
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 凡例 */}
      <div className="mt-4 flex items-center gap-2 text-xs text-claude-olive">
        <span>低</span>
        <div className="flex gap-0.5">
          {[
            { rate: 5, label: "0-19%" },
            { rate: 25, label: "20-39%" },
            { rate: 45, label: "40-59%" },
            { rate: 65, label: "60-79%" },
            { rate: 85, label: "80-100%" },
          ].map((item) => (
            <div
              key={item.rate}
              className="w-8 h-4 rounded-sm"
              style={getCellBgStyle(item.rate)}
              title={item.label}
            />
          ))}
        </div>
        <span>高</span>
      </div>

      {/* ツールチップ */}
      {tooltip && (
        <div
          className="absolute z-50 bg-claude-ivory border border-claude-border-warm rounded-lg shadow-lg p-3 pointer-events-none"
          style={{
            left: Math.min(tooltip.x + 12, (containerRef.current?.clientWidth || 400) - 220),
            top: tooltip.y - 80,
          }}
        >
          <div className="text-sm font-heading text-claude-near-black mb-1">
            {formatMonthLabel(tooltip.cohortMonth)} コホート
          </div>
          <div className="space-y-1 text-xs text-claude-olive">
            <div className="flex justify-between gap-4">
              <span>コホート人数:</span>
              <span className="font-medium text-claude-near-black">
                {tooltip.cohortSize}人
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span>経過:</span>
              <span className="font-medium text-claude-near-black">
                {tooltip.monthOffset === 0
                  ? "初月"
                  : `${tooltip.monthOffset}ヶ月後`}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span>アクティブ人数:</span>
              <span className="font-medium text-claude-near-black">
                {tooltip.activeCount}人
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span>リテンション率:</span>
              <span className="font-heading text-claude-near-black">
                {tooltip.rate}%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
