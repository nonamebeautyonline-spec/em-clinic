/* コラム記事内で使用するビジュアルウィジェット — サイト横断で共有 */
import type { ReactNode } from "react";

/* ─── 成果ハイライト（Before → After カード） ─── */
export function ResultCard({ before, after, metric, description }: {
  before: string;
  after: string;
  metric: string;
  description?: string;
}) {
  return (
    <div className="my-6 overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="flex items-stretch divide-x divide-slate-200">
        <div className="flex-1 bg-gray-50 p-4 text-center">
          <p className="text-[11px] font-bold text-gray-400 uppercase">Before</p>
          <p className="mt-1 text-[22px] font-bold text-gray-400">{before}</p>
        </div>
        <div className="flex items-center px-3">
          <svg className="h-5 w-5 text-sky-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M13 7l5 5m0 0l-5 5m5-5H6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <div className="flex-1 bg-sky-50 p-4 text-center">
          <p className="text-[11px] font-bold text-sky-600 uppercase">After</p>
          <p className="mt-1 text-[22px] font-bold text-sky-600">{after}</p>
        </div>
      </div>
      <div className="border-t border-gray-100 px-4 py-2.5 text-center">
        <p className="text-[13px] font-bold text-gray-700">{metric}</p>
        {description && <p className="mt-0.5 text-[12px] text-gray-400">{description}</p>}
      </div>
    </div>
  );
}

/* ─── 数値グリッド（KPI表示） ─── */
export function StatGrid({ stats }: { stats: { value: string; unit?: string; label: string }[] }) {
  return (
    <div className={`my-6 grid gap-4 ${stats.length <= 3 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-2 md:grid-cols-4"}`}>
      {stats.map((s) => (
        <div key={s.label} className="rounded-lg border border-gray-200 bg-white px-5 py-5 text-center">
          <p className="text-[26px] font-bold tracking-tight text-gray-900">
            {s.value}<span className="ml-0.5 text-[15px] text-gray-400">{s.unit || ""}</span>
          </p>
          <p className="mt-2 text-[13px] leading-snug text-gray-500">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

/* ─── 横棒グラフ（比較表示） ─── */
export function BarChart({ data, unit }: { data: { label: string; value: number; color?: string }[]; unit?: string }) {
  const maxVal = Math.max(...data.map((d) => d.value)) || 1;
  return (
    <div className="my-6 space-y-4">
      {data.map((d) => (
        <div key={d.label}>
          <span className="mb-1 block text-[13px] font-medium text-gray-600">{d.label}</span>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="h-8 rounded bg-gray-100">
                <div
                  className={`h-full rounded ${d.color?.startsWith("#") || d.color?.startsWith("rgb") ? "" : d.color || "bg-sky-500"} transition-all duration-500`}
                  style={{ width: `${(d.value / maxVal) * 100}%`, ...(d.color?.startsWith("#") || d.color?.startsWith("rgb") ? { backgroundColor: d.color } : {}) }}
                />
              </div>
            </div>
            <span className="w-20 shrink-0 text-right text-[14px] font-bold text-gray-700">{d.value}{unit || ""}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── 比較テーブル ─── */
export function ComparisonTable({ headers, rows }: {
  headers: string[];
  rows: (string | boolean)[][];
}) {
  return (
    <div className="my-6 overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full text-[14px]">
        <thead>
          <tr className="bg-gray-50">
            {headers.map((h, i) => (
              <th key={i} className={`px-5 py-4 font-semibold text-gray-700 ${i === 0 ? "text-left" : "text-center"}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, ri) => (
            <tr key={ri} className="hover:bg-gray-50/50">
              {row.map((cell, ci) => (
                <td key={ci} className={`px-5 py-4 leading-relaxed ${ci === 0 ? "text-left text-gray-700" : "text-center"}`}>
                  {typeof cell === "boolean" ? (
                    cell ? (
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-100 text-sky-600">
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </span>
                    ) : <span className="text-gray-300">—</span>
                  ) : cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── コールアウトボックス（注意・ポイント） ─── */
export function Callout({ type = "info", title, children }: {
  type?: "info" | "warning" | "success" | "point";
  title?: string;
  children: ReactNode;
}) {
  const styles = {
    info: { border: "border-sky-200", bg: "bg-sky-50/50", icon: "text-sky-500", titleColor: "text-sky-800" },
    warning: { border: "border-amber-200", bg: "bg-amber-50/50", icon: "text-amber-500", titleColor: "text-amber-800" },
    success: { border: "border-emerald-200", bg: "bg-emerald-50/50", icon: "text-emerald-500", titleColor: "text-emerald-800" },
    point: { border: "border-violet-200", bg: "bg-violet-50/50", icon: "text-violet-500", titleColor: "text-violet-800" },
  };
  const s = styles[type];
  const icons = {
    info: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    warning: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z",
    success: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    point: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
  };
  return (
    <div className={`my-6 rounded-lg border ${s.border} ${s.bg} p-5`}>
      <div className="flex items-start gap-3">
        <svg className={`h-5 w-5 shrink-0 ${s.icon}`} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path d={icons[type]} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div>
          {title && <p className={`text-[13px] font-bold ${s.titleColor}`}>{title}</p>}
          <div className="mt-1 text-[13px] leading-relaxed text-gray-600">{children}</div>
        </div>
      </div>
    </div>
  );
}

/* ─── フローステップ（番号付き） ─── */
export function FlowSteps({ steps }: { steps: { title: string; desc: string }[] }) {
  return (
    <div className="my-6 space-y-0">
      {steps.map((s, i) => (
        <div key={i} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[12px] font-bold text-white">
              {i + 1}
            </div>
            {i < steps.length - 1 && <div className="h-full w-px bg-gray-200" />}
          </div>
          <div className="pb-6">
            <p className="text-[14px] font-bold text-gray-900">{s.title}</p>
            <p className="mt-1 text-[13px] leading-relaxed text-gray-500">{s.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── 円グラフ風（SVGドーナツ） ─── */
export function DonutChart({ percentage, label, sublabel }: {
  percentage: number;
  label: string;
  sublabel?: string;
}) {
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  return (
    <div className="my-6 flex items-center justify-center gap-6">
      <div className="relative h-28 w-28">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle cx="50" cy="50" r="40" fill="none" stroke="#f3f4f6" strokeWidth="8" />
          <circle
            cx="50" cy="50" r="40" fill="none" stroke="#0ea5e9" strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[20px] font-bold text-gray-900">{percentage}%</span>
        </div>
      </div>
      <div>
        <p className="text-[15px] font-bold text-gray-900">{label}</p>
        {sublabel && <p className="mt-0.5 text-[12px] text-gray-400">{sublabel}</p>}
      </div>
    </div>
  );
}

/* ─── 日付フォーマット ─── */
export function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}
