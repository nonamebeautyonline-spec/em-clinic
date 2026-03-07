"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";

// ============================================================
// 型定義
// ============================================================

interface FormField {
  id: string;
  type: string;
  label: string;
}

interface Response {
  id: number;
  line_user_id: string | null;
  respondent_name: string | null;
  answers: Record<string, unknown>;
  submitted_at: string;
}

interface OptionStat {
  label: string;
  count: number;
}

interface FieldStat {
  id: string;
  label: string;
  type: string;
  total: number;
  options?: OptionStat[];
}

interface StatsData {
  formName: string;
  totalResponses: number;
  fields: FieldStat[];
}

// ============================================================
// グラフ用カラーパレット
// ============================================================

const CHART_COLORS = [
  "#6366f1", "#8b5cf6", "#a855f7", "#d946ef",
  "#ec4899", "#f43f5e", "#f97316", "#eab308",
  "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6",
];

// ============================================================
// 期間フィルタ定義
// ============================================================

type PeriodKey = "7d" | "30d" | "90d" | "all";
const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: "7d", label: "直近7日" },
  { key: "30d", label: "直近30日" },
  { key: "90d", label: "直近90日" },
  { key: "all", label: "全期間" },
];

function getPeriodDates(key: PeriodKey): { from?: string; to?: string } {
  if (key === "all") return {};
  const days = key === "7d" ? 7 : key === "30d" ? 30 : 90;
  const d = new Date();
  d.setDate(d.getDate() - days);
  return { from: d.toISOString().slice(0, 10) };
}

// ============================================================
// タブ定義
// ============================================================

type TabKey = "list" | "stats";

// ============================================================
// メインコンポーネント
// ============================================================

export default function FormResponsesPage() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<TabKey>("list");
  const [formName, setFormName] = useState("");
  const [fields, setFields] = useState<FormField[]>([]);
  const [responses, setResponses] = useState<Response[]>([]);
  const [loading, setLoading] = useState(true);

  // 集計タブ用
  const [statsData, setStatsData] = useState<StatsData | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [period, setPeriod] = useState<PeriodKey>("all");
  const [chartMode, setChartMode] = useState<Record<string, "bar" | "pie">>({});

  // 一覧データ取得
  useEffect(() => {
    fetch(`/api/admin/line/forms/${id}/responses`, { credentials: "include" })
      .then(r => r.json())
      .then(data => {
        if (data.form) {
          setFormName(data.form.name);
          const allFields = (data.form.fields || []) as FormField[];
          setFields(allFields.filter(f => f.type !== "heading_sm" && f.type !== "heading_md"));
        }
        if (data.responses) setResponses(data.responses);
        setLoading(false);
      });
  }, [id]);

  // 集計データ取得
  const loadStats = useCallback(async (p: PeriodKey) => {
    setStatsLoading(true);
    const dates = getPeriodDates(p);
    const qs = new URLSearchParams();
    if (dates.from) qs.set("from", dates.from);
    if (dates.to) qs.set("to", dates.to);
    const url = `/api/admin/line/forms/${id}/responses/stats${qs.toString() ? "?" + qs.toString() : ""}`;
    const res = await fetch(url, { credentials: "include" });
    const data = await res.json();
    setStatsData(data);
    setStatsLoading(false);
  }, [id]);

  // タブ切替時に集計データ取得
  useEffect(() => {
    if (tab === "stats" && !statsData) {
      loadStats(period);
    }
  }, [tab, statsData, loadStats, period]);

  // 期間変更時
  const handlePeriodChange = (p: PeriodKey) => {
    setPeriod(p);
    loadStats(p);
  };

  // グラフモード切替
  const toggleChartMode = (fieldId: string) => {
    setChartMode(prev => ({
      ...prev,
      [fieldId]: prev[fieldId] === "pie" ? "bar" : "pie",
    }));
  };

  const downloadCsv = () => {
    window.open(`/api/admin/line/forms/${id}/responses?format=csv`, "_blank");
  };

  const formatValue = (val: unknown): string => {
    if (val === null || val === undefined) return "";
    if (Array.isArray(val)) return val.join(", ");
    if (typeof val === "object" && "name" in (val as Record<string, unknown>)) return (val as { name: string }).name;
    return String(val);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-[#00B900] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href={`/admin/line/forms/${id}`} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-800">
              {tab === "list" ? "回答一覧" : "回答集計"}
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">{formName} ({responses.length}件)</p>
          </div>
        </div>
        {tab === "list" && (
          <button
            onClick={downloadCsv}
            className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            CSV出力
          </button>
        )}
      </div>

      {/* タブ */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab("list")}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            tab === "list"
              ? "bg-white text-gray-800 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          一覧
        </button>
        <button
          onClick={() => setTab("stats")}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            tab === "stats"
              ? "bg-white text-gray-800 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          集計
        </button>
      </div>

      {/* 一覧タブ */}
      {tab === "list" && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 whitespace-nowrap">回答日時</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 whitespace-nowrap">回答者</th>
                {fields.map(f => (
                  <th key={f.id} className="text-left px-4 py-3 text-xs font-medium text-gray-500 whitespace-nowrap max-w-[200px]">
                    {f.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {responses.length === 0 ? (
                <tr>
                  <td colSpan={2 + fields.length} className="text-center py-16 text-gray-300">
                    まだ回答がありません
                  </td>
                </tr>
              ) : (
                responses.map(r => (
                  <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {r.submitted_at?.replace("T", " ").slice(0, 16)}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                      {r.respondent_name || r.line_user_id?.slice(0, 10) || "-"}
                    </td>
                    {fields.map(f => (
                      <td key={f.id} className="px-4 py-3 text-xs text-gray-600 max-w-[200px] truncate">
                        {formatValue(r.answers?.[f.id])}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 集計タブ */}
      {tab === "stats" && (
        <div>
          {/* 期間フィルタ */}
          <div className="flex items-center gap-3 mb-6">
            <span className="text-sm text-gray-500">期間:</span>
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              {PERIOD_OPTIONS.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => handlePeriodChange(opt.key)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    period === opt.key
                      ? "bg-white text-gray-800 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {statsData && (
              <span className="text-sm text-gray-400 ml-2">
                回答総数: {statsData.totalResponses}件
              </span>
            )}
          </div>

          {/* 集計グラフ */}
          {statsLoading ? (
            <div className="flex items-center justify-center py-24">
              <div className="w-8 h-8 border-2 border-gray-200 border-t-[#00B900] rounded-full animate-spin" />
            </div>
          ) : statsData && statsData.fields.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {statsData.fields.map(field => (
                <FieldStatsCard
                  key={field.id}
                  field={field}
                  chartMode={chartMode[field.id] || "bar"}
                  onToggleMode={() => toggleChartMode(field.id)}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 py-16 text-center text-gray-300">
              集計データがありません
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// フィールド別集計カード
// ============================================================

function FieldStatsCard({
  field,
  chartMode,
  onToggleMode,
}: {
  field: FieldStat;
  chartMode: "bar" | "pie";
  onToggleMode: () => void;
}) {
  const hasOptions = field.options && field.options.length > 0;
  const isChoiceType = ["radio", "dropdown", "checkbox", "prefecture"].includes(field.type);

  // フィールドタイプの日本語ラベル
  const typeLabel = (() => {
    switch (field.type) {
      case "radio": return "ラジオボタン";
      case "dropdown": return "プルダウン";
      case "checkbox": return "チェックボックス";
      case "prefecture": return "都道府県";
      case "text": return "テキスト";
      case "textarea": return "テキストエリア";
      case "date": return "日付";
      default: return field.type;
    }
  })();

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-all duration-200">
      {/* カードヘッダー */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
            {field.label}
          </h3>
          <p className="text-[11px] text-gray-400 mt-0.5 ml-3.5">
            {typeLabel} / 回答数: {field.total}件
          </p>
        </div>
        {isChoiceType && hasOptions && (
          <button
            onClick={onToggleMode}
            className="text-xs text-gray-400 hover:text-indigo-500 transition-colors px-2 py-1 rounded border border-gray-200 hover:border-indigo-200"
            title={chartMode === "bar" ? "円グラフに切替" : "棒グラフに切替"}
          >
            {chartMode === "bar" ? "円グラフ" : "棒グラフ"}
          </button>
        )}
      </div>

      {/* グラフ表示 */}
      {isChoiceType && hasOptions ? (
        chartMode === "bar" ? (
          <BarChartView options={field.options!} />
        ) : (
          <PieChartView options={field.options!} />
        )
      ) : (
        <div className="h-[120px] flex items-center justify-center">
          <div className="text-center">
            <div className="text-3xl font-bold text-indigo-600">{field.total}</div>
            <div className="text-xs text-gray-400 mt-1">回答件数</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// 棒グラフ
// ============================================================

function BarChartView({ options }: { options: OptionStat[] }) {
  // ラベルが長い場合は省略
  const data = options.map(opt => ({
    name: opt.label.length > 10 ? opt.label.slice(0, 10) + "..." : opt.label,
    fullName: opt.label,
    count: opt.count,
  }));

  return (
    <div>
      <ResponsiveContainer width="100%" height={Math.max(180, data.length * 36)}>
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 20, top: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#9ca3af" }} />
          <YAxis
            type="category"
            dataKey="name"
            width={100}
            tick={{ fontSize: 11, fill: "#6b7280" }}
          />
          <Tooltip
            formatter={(value: unknown) => [`${value}件`, "回答数"]}
            labelFormatter={(label: unknown, payload?: { payload?: { fullName?: string } }[]) => {
              const full = payload?.[0]?.payload?.fullName;
              return full || String(label);
            }}
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {/* 凡例（カウント表示） */}
      <div className="mt-3 space-y-1">
        {options.map((opt, i) => (
          <div key={opt.label} className="flex items-center gap-2 text-[11px]">
            <div
              className="w-2.5 h-2.5 rounded-sm shrink-0"
              style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
            />
            <span className="text-gray-600 truncate">{opt.label}</span>
            <span className="text-gray-400 ml-auto shrink-0">{opt.count}件</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// 円グラフ
// ============================================================

function PieChartView({ options }: { options: OptionStat[] }) {
  const total = options.reduce((s, o) => s + o.count, 0);
  const data = options.filter(o => o.count > 0).map(opt => ({
    name: opt.label,
    value: opt.count,
  }));

  if (data.length === 0) {
    return (
      <div className="h-[200px] flex items-center justify-center text-sm text-gray-300">
        データなし
      </div>
    );
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={45}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: unknown) => [`${value}件`, "回答数"]}
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
          />
        </PieChart>
      </ResponsiveContainer>
      {/* 凡例 */}
      <div className="mt-2 space-y-1">
        {options.map((opt, i) => {
          const pct = total > 0 ? Math.round((opt.count / total) * 100) : 0;
          return (
            <div key={opt.label} className="flex items-center gap-2 text-[11px]">
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
              />
              <span className="text-gray-600 truncate">{opt.label}</span>
              <span className="text-gray-400 ml-auto shrink-0">{opt.count}件 ({pct}%)</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
