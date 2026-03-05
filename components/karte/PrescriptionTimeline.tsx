// 処方歴タイムラインコンポーネント — 用量変更の推移を時系列で表示
"use client";

import type { TimelineEntry, PrescriptionChange } from "@/lib/prescription-timeline";

const CHANGE_STYLES: Record<PrescriptionChange, { bg: string; text: string; label: string }> = {
  increase: { bg: "bg-rose-50", text: "text-rose-700", label: "増量" },
  decrease: { bg: "bg-blue-50", text: "text-blue-700", label: "減量" },
  same: { bg: "bg-gray-50", text: "text-gray-500", label: "同量" },
  initial: { bg: "bg-emerald-50", text: "text-emerald-700", label: "初回" },
};

const CHANGE_DOT: Record<PrescriptionChange, string> = {
  increase: "bg-rose-400",
  decrease: "bg-blue-400",
  same: "bg-gray-300",
  initial: "bg-emerald-400",
};

function formatDate(iso: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

interface PrescriptionTimelineProps {
  entries: TimelineEntry[];
  loading?: boolean;
}

export default function PrescriptionTimeline({ entries, loading }: PrescriptionTimelineProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-gray-400">
        処方履歴がありません
      </div>
    );
  }

  return (
    <div className="relative">
      {/* 縦線 */}
      <div className="absolute left-3 top-0 bottom-0 w-px bg-gray-200" />

      <div className="space-y-0">
        {entries.map((entry, i) => {
          const style = CHANGE_STYLES[entry.change];
          const dot = CHANGE_DOT[entry.change];
          return (
            <div key={`${entry.date}-${i}`} className="relative pl-8 py-2.5">
              {/* ドット */}
              <div className={`absolute left-1.5 top-4 w-3 h-3 rounded-full ${dot} ring-2 ring-white`} />

              <div className="flex items-start gap-2">
                {/* 日付 */}
                <span className="text-xs text-gray-400 min-w-[70px] pt-0.5">{formatDate(entry.date)}</span>

                <div className="flex-1 min-w-0">
                  {/* 商品名 + 変化タグ */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-800">{entry.productName}</span>
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${style.bg} ${style.text}`}>
                      {style.label}
                    </span>
                    {entry.source === "reorder" && (
                      <span className="text-[10px] text-gray-400">再処方</span>
                    )}
                  </div>

                  {/* 用量変化の詳細 */}
                  {entry.prevDose !== null && entry.dose !== null && entry.change !== "initial" && (
                    <div className="text-xs text-gray-400 mt-0.5">
                      {entry.prevDose}mg → {entry.dose}mg
                    </div>
                  )}

                  {/* カルテノート */}
                  {entry.karteNote && (
                    <div className="text-xs text-gray-500 mt-1 bg-gray-50 rounded px-2 py-1">
                      {entry.karteNote.split("\n").slice(0, 2).join(" / ")}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
