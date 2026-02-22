"use client";

import { useState } from "react";
import { DEMO_ANALYTICS } from "../_data/mock";

const TABS = ["概要", "売上", "患者"] as const;
type Tab = (typeof TABS)[number];

export default function DemoAnalyticsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("概要");

  return (
    <div className="p-6 pb-12 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">分析ダッシュボード</h1>
        <p className="text-sm text-slate-500 mt-1">LINE運用の各種指標を確認</p>
      </div>

      {/* タブ */}
      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-lg w-fit">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "概要" && <OverviewTab />}
      {activeTab === "売上" && <RevenueTab />}
      {activeTab === "患者" && <PatientTab />}
    </div>
  );
}

function OverviewTab() {
  const kpis = [
    { label: "LINE友だち", value: "2,847", sub: "+147 (今月)", color: "text-blue-600" },
    { label: "月間メッセージ数", value: "1,250", sub: "送信+受信", color: "text-green-600" },
    { label: "平均返信時間", value: "4.2分", sub: "営業時間内", color: "text-purple-600" },
    { label: "開封率", value: "72.5%", sub: "配信メッセージ", color: "text-amber-600" },
  ];

  const friendsData = DEMO_ANALYTICS.friendsGrowth;
  const maxAdded = Math.max(...friendsData.map((d) => d.added));
  const last30 = friendsData;

  const messageData = DEMO_ANALYTICS.messageStats.slice(-14);
  const maxMsg = Math.max(
    ...messageData.map((d) => Math.max(d.sent, d.received))
  );

  return (
    <div className="space-y-6">
      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="bg-white rounded-xl border border-slate-200 p-4"
          >
            <p className="text-xs text-slate-500 mb-1">{kpi.label}</p>
            <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
            <p className="text-xs text-slate-400 mt-1">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* 友だち推移 */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">
          友だち追加推移（直近30日）
        </h3>
        <div className="flex items-end gap-[3px] h-32">
          {last30.map((d, i) => (
            <div
              key={i}
              className="flex-1 flex flex-col items-center justify-end group relative"
            >
              <div
                className="w-full bg-blue-400 rounded-t hover:bg-blue-500 transition-colors min-h-[2px]"
                style={{
                  height: `${(d.added / maxAdded) * 100}%`,
                }}
              />
              <div className="absolute -top-8 bg-slate-800 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                +{d.added}人 ({d.date.slice(5)})
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-[10px] text-slate-400">
          <span>{last30[0]?.date.slice(5)}</span>
          <span>{last30[last30.length - 1]?.date.slice(5)}</span>
        </div>
      </div>

      {/* メッセージ統計 */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-sm font-semibold text-slate-700 mb-1">
          メッセージ統計（直近14日）
        </h3>
        <div className="flex gap-3 mb-4 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-blue-400 rounded" /> 送信
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-green-400 rounded" /> 受信
          </span>
        </div>
        <div className="flex items-end gap-1 h-32">
          {messageData.map((d, i) => (
            <div key={i} className="flex-1 flex gap-[1px] items-end group relative">
              <div
                className="flex-1 bg-blue-400 rounded-t min-h-[2px]"
                style={{ height: `${(d.sent / maxMsg) * 100}%` }}
              />
              <div
                className="flex-1 bg-green-400 rounded-t min-h-[2px]"
                style={{ height: `${(d.received / maxMsg) * 100}%` }}
              />
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                送{d.sent} / 受{d.received} ({d.date.slice(5)})
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-[10px] text-slate-400">
          <span>{messageData[0]?.date.slice(5)}</span>
          <span>{messageData[messageData.length - 1]?.date.slice(5)}</span>
        </div>
      </div>
    </div>
  );
}

function RevenueTab() {
  const revenueData = DEMO_ANALYTICS.revenueByMonth;
  const maxRevenue = Math.max(...revenueData.map((d) => d.revenue));

  const topMenus = DEMO_ANALYTICS.topMenus;
  const maxMenuRevenue = Math.max(...topMenus.map((m) => m.revenue));

  return (
    <div className="space-y-6">
      {/* 月間売上推移 */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">
          月間売上推移（6ヶ月）
        </h3>
        <div className="flex items-end gap-3 h-48">
          {revenueData.map((d) => (
            <div
              key={d.month}
              className="flex-1 flex flex-col items-center justify-end"
            >
              <p className="text-xs font-medium text-slate-600 mb-1">
                {(d.revenue / 10000).toFixed(0)}万
              </p>
              <div
                className="w-full bg-blue-400 rounded-t hover:bg-blue-500 transition-colors"
                style={{
                  height: `${(d.revenue / maxRevenue) * 100}%`,
                }}
              />
              <p className="text-xs text-slate-500 mt-2">{d.month}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 商品別売上ランキング */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">
          商品別売上ランキング
        </h3>
        <div className="space-y-3">
          {topMenus.map((m, i) => (
            <div key={m.name} className="flex items-center gap-3">
              <span className="text-sm font-bold text-slate-400 w-6 text-right">
                {i + 1}
              </span>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-slate-700">
                    {m.name}
                  </span>
                  <span className="text-sm text-slate-500">
                    {m.count}件 /
                    {" "}
                    {m.revenue >= 10000
                      ? `${(m.revenue / 10000).toFixed(1)}万円`
                      : `${m.revenue.toLocaleString()}円`}
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{
                      width: `${(m.revenue / maxMenuRevenue) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PatientTab() {
  const tagData = DEMO_ANALYTICS.tagDistribution;
  const maxTag = Math.max(...tagData.map((t) => t.count));

  return (
    <div className="space-y-6">
      {/* タグ分布 */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">タグ分布</h3>
        <div className="space-y-3">
          {tagData.map((t) => (
            <div key={t.name} className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-700 w-20 text-right">
                {t.name}
              </span>
              <div className="flex-1">
                <div className="w-full bg-slate-100 rounded-full h-4 relative">
                  <div
                    className="bg-blue-500 h-4 rounded-full transition-all flex items-center justify-end pr-2"
                    style={{ width: `${(t.count / maxTag) * 100}%` }}
                  >
                    {t.count > maxTag * 0.2 && (
                      <span className="text-[10px] text-white font-medium">
                        {t.count}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <span className="text-xs text-slate-500 w-12 text-right">
                {t.percentage}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* リピート率 */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">リピート率</h3>
        <div className="flex items-center gap-8">
          {/* 円グラフ風CSS */}
          <div className="relative w-40 h-40">
            <svg className="w-40 h-40 -rotate-90" viewBox="0 0 128 128">
              <circle
                cx="64"
                cy="64"
                r="56"
                fill="none"
                stroke="#e2e8f0"
                strokeWidth="12"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="12"
                strokeDasharray={`${78.5 * 3.518} ${(100 - 78.5) * 3.518}`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl font-bold text-slate-800">78.5%</span>
            </div>
          </div>
          <div>
            <p className="text-sm text-slate-600">
              全患者のうち <span className="font-bold text-blue-600">78.5%</span> が2回以上来院しています。
            </p>
            <p className="text-xs text-slate-400 mt-2">
              業界平均: 約60% / 当院は業界平均を大きく上回っています
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
