"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";

// Rechartsはクライアントのみ
const AreaChart = dynamic(() => import("recharts").then(m => m.AreaChart), { ssr: false });
const Area = dynamic(() => import("recharts").then(m => m.Area), { ssr: false });
const BarChart = dynamic(() => import("recharts").then(m => m.BarChart), { ssr: false });
const Bar = dynamic(() => import("recharts").then(m => m.Bar), { ssr: false });
const XAxis = dynamic(() => import("recharts").then(m => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then(m => m.YAxis), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then(m => m.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import("recharts").then(m => m.ResponsiveContainer), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then(m => m.CartesianGrid), { ssr: false });

type Tab = "revenue" | "ltv" | "cohort" | "products";

interface DailyData {
  date: string;
  revenue: number;
  gross: number;
  refunds: number;
  count: number;
}

interface LTVData {
  avgLtv: number;
  avgOrders: number;
  totalPatients: number;
  totalRevenue: number;
  distribution: { label: string; count: number }[];
  repeatDist: { label: string; count: number }[];
}

interface CohortRow {
  month: string;
  size: number;
  retention: { monthOffset: number; rate: number }[];
}

interface ProductData {
  code: string;
  revenue: number;
  count: number;
}

export default function AnalyticsPage() {
  const [tab, setTab] = useState<Tab>("revenue");
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split("T")[0];
  });
  const [to, setTo] = useState(() => new Date().toISOString().split("T")[0]);

  const [daily, setDaily] = useState<DailyData[]>([]);
  const [ltv, setLtv] = useState<LTVData | null>(null);
  const [cohort, setCohort] = useState<CohortRow[]>([]);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    if (tab === "revenue") {
      const res = await fetch(`/api/admin/analytics?type=daily&from=${from}&to=${to}`, { credentials: "include" });
      const data = await res.json();
      setDaily(data.daily || []);
    } else if (tab === "ltv") {
      const res = await fetch("/api/admin/analytics?type=ltv", { credentials: "include" });
      const data = await res.json();
      setLtv(data.ltv || null);
    } else if (tab === "cohort") {
      const res = await fetch("/api/admin/analytics?type=cohort", { credentials: "include" });
      const data = await res.json();
      setCohort(data.cohort || []);
    } else if (tab === "products") {
      const res = await fetch(`/api/admin/analytics?type=products&from=${from}&to=${to}`, { credentials: "include" });
      const data = await res.json();
      setProducts(data.products || []);
    }
    setLoading(false);
  }, [tab, from, to]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleExport = () => {
    window.open(`/api/admin/analytics/export?from=${from}&to=${to}`, "_blank");
  };

  const formatYen = (n: number) => `¥${n.toLocaleString()}`;

  const tabs: { key: Tab; label: string }[] = [
    { key: "revenue", label: "売上推移" },
    { key: "ltv", label: "LTV分析" },
    { key: "cohort", label: "コホート" },
    { key: "products", label: "商品別" },
  ];

  const totalRevenue = daily.reduce((s, d) => s + d.revenue, 0);
  const totalOrders = daily.reduce((s, d) => s + d.count, 0);
  const avgDaily = daily.length > 0 ? Math.round(totalRevenue / daily.length) : 0;

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">売上分析</h1>
          <p className="text-sm text-gray-500 mt-1">売上推移・LTV・コホート・商品別分析</p>
        </div>
        <button
          onClick={handleExport}
          className="px-4 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          CSVエクスポート
        </button>
      </div>

      {/* タブ + 日付範囲 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${
                tab === t.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {(tab === "revenue" || tab === "products") && (
          <div className="flex items-center gap-2">
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg" />
            <span className="text-xs text-gray-400">〜</span>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg" />
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent" />
        </div>
      ) : (
        <>
          {/* 売上推移 */}
          {tab === "revenue" && (
            <div className="space-y-4">
              {/* KPI */}
              <div className="grid grid-cols-3 gap-4">
                <KPICard label="期間売上" value={formatYen(totalRevenue)} color="emerald" />
                <KPICard label="注文件数" value={`${totalOrders}件`} color="blue" />
                <KPICard label="日平均売上" value={formatYen(avgDaily)} color="amber" />
              </div>
              {/* グラフ */}
              <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                <h3 className="text-sm font-bold text-gray-700 mb-4">日別売上推移</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={daily}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => d.slice(5)} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip
                        formatter={(v: unknown) => formatYen(Number(v ?? 0))}
                        labelFormatter={l => l}
                        contentStyle={{ fontSize: 12 }}
                      />
                      <Area type="monotone" dataKey="revenue" name="純売上" stroke="#10b981" fill="#10b98133" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* LTV分析 */}
          {tab === "ltv" && ltv && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                <KPICard label="平均LTV" value={formatYen(ltv.avgLtv)} color="purple" />
                <KPICard label="平均注文回数" value={`${ltv.avgOrders}回`} color="blue" />
                <KPICard label="総患者数" value={`${ltv.totalPatients}人`} color="emerald" />
                <KPICard label="総売上" value={formatYen(ltv.totalRevenue)} color="amber" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                {/* LTV分布 */}
                <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                  <h3 className="text-sm font-bold text-gray-700 mb-4">LTV分布</h3>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={ltv.distribution}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="label" tick={{ fontSize: 9 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip contentStyle={{ fontSize: 12 }} />
                        <Bar dataKey="count" name="患者数" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                {/* リピーター分布 */}
                <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                  <h3 className="text-sm font-bold text-gray-700 mb-4">購入回数分布</h3>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={ltv.repeatDist}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip contentStyle={{ fontSize: 12 }} />
                        <Bar dataKey="count" name="患者数" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* コホート */}
          {tab === "cohort" && (
            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <h3 className="text-sm font-bold text-gray-700 mb-4">月別コホート分析（初回購入月 → N月後の継続率）</h3>
              {cohort.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">データがありません</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="py-2 px-3 text-left text-gray-500 font-medium">初回月</th>
                        <th className="py-2 px-3 text-right text-gray-500 font-medium">人数</th>
                        {[0, 1, 2, 3, 4, 5].map(i => (
                          <th key={i} className="py-2 px-3 text-center text-gray-500 font-medium">{i === 0 ? "当月" : `${i}ヶ月後`}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {cohort.map(row => (
                        <tr key={row.month} className="border-b border-gray-50">
                          <td className="py-2 px-3 font-medium text-gray-700">{row.month}</td>
                          <td className="py-2 px-3 text-right text-gray-600">{row.size}</td>
                          {[0, 1, 2, 3, 4, 5].map(i => {
                            const ret = row.retention.find(r => r.monthOffset === i);
                            const rate = ret?.rate ?? null;
                            const bg = rate === null ? "" :
                              rate >= 80 ? "bg-emerald-100 text-emerald-800" :
                              rate >= 50 ? "bg-emerald-50 text-emerald-700" :
                              rate >= 30 ? "bg-yellow-50 text-yellow-700" :
                              rate >= 10 ? "bg-orange-50 text-orange-700" :
                              "bg-red-50 text-red-600";
                            return (
                              <td key={i} className={`py-2 px-3 text-center font-medium rounded ${bg}`}>
                                {rate !== null ? `${rate}%` : "-"}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 商品別 */}
          {tab === "products" && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                <h3 className="text-sm font-bold text-gray-700 mb-4">商品別売上</h3>
                {products.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">データがありません</p>
                ) : (
                  <>
                    <div className="h-64 mb-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={products.slice(0, 10)} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                          <YAxis type="category" dataKey="code" tick={{ fontSize: 9 }} width={120} />
                          <Tooltip formatter={(v: unknown) => formatYen(Number(v ?? 0))} contentStyle={{ fontSize: 12 }} />
                          <Bar dataKey="revenue" name="売上" fill="#10b981" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-1.5">
                      {products.map((p, i) => (
                        <div key={p.code} className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg">
                          <span className="text-xs font-bold text-gray-400 w-6">{i + 1}</span>
                          <span className="text-xs font-medium text-gray-800 flex-1">{p.code}</span>
                          <span className="text-xs font-bold text-emerald-700">{formatYen(p.revenue)}</span>
                          <span className="text-[10px] text-gray-400">{p.count}件</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function KPICard({ label, value, color }: { label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    emerald: "from-emerald-50 to-green-50 border-emerald-100",
    blue: "from-blue-50 to-indigo-50 border-blue-100",
    amber: "from-amber-50 to-yellow-50 border-amber-100",
    purple: "from-purple-50 to-violet-50 border-purple-100",
  };
  const textColors: Record<string, string> = {
    emerald: "text-emerald-700",
    blue: "text-blue-700",
    amber: "text-amber-700",
    purple: "text-purple-700",
  };
  return (
    <div className={`bg-gradient-to-br ${colors[color]} rounded-xl border p-4`}>
      <div className="text-[11px] text-gray-500 font-medium">{label}</div>
      <div className={`text-xl font-bold mt-1 ${textColors[color]}`}>{value}</div>
    </div>
  );
}
