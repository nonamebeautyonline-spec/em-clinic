"use client";

import { DEMO_STATS } from "./_data/mock";

const statCards = [
  { label: "本日の予約", value: DEMO_STATS.todayReservations, unit: "件", icon: "📅", color: "blue" },
  { label: "LINE友だち", value: DEMO_STATS.lineFriends.toLocaleString(), unit: "人", icon: "💬", color: "green" },
  { label: "月間売上", value: `¥${DEMO_STATS.monthlyRevenue.toLocaleString()}`, unit: "", icon: "💰", color: "purple" },
  { label: "リピート率", value: DEMO_STATS.repeatRate, unit: "%", icon: "🔄", color: "amber" },
];

const colorMap: Record<string, { bg: string; border: string; text: string }> = {
  blue: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700" },
  green: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700" },
  purple: { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700" },
  amber: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700" },
};

const notifIcons: Record<string, string> = {
  reservation: "📅",
  message: "💬",
  intake: "📝",
  reorder: "🔄",
  payment: "💳",
};

export default function DemoDashboardPage() {
  const maxBar = Math.max(...DEMO_STATS.weeklyReservations);

  return (
    <div className="p-6 pb-16 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">ダッシュボード</h1>
        <p className="text-sm text-slate-500 mt-1">本日の概況</p>
      </div>

      {/* KPIカード */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card) => {
          const c = colorMap[card.color];
          return (
            <div key={card.label} className={`${c.bg} ${c.border} border rounded-xl p-5`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-600">{card.label}</span>
                <span className="text-xl">{card.icon}</span>
              </div>
              <div className={`text-2xl font-bold ${c.text}`}>
                {card.value}
                <span className="text-sm font-normal ml-1">{card.unit}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* 予約推移グラフ */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">直近7日間の予約数</h2>
          <div className="flex items-end gap-3 h-48">
            {DEMO_STATS.weeklyReservations.map((count, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <span className="text-xs font-medium text-slate-600">{count}</span>
                <div
                  className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-md transition-all duration-500"
                  style={{ height: `${(count / maxBar) * 100}%`, minHeight: 4 }}
                />
                <span className="text-xs text-slate-500">{DEMO_STATS.weekLabels[i]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 対応状況パネル */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">対応状況</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
              <span className="text-sm font-medium text-red-700">未返信メッセージ</span>
              <span className="text-xl font-bold text-red-600">{DEMO_STATS.pending.unreplied}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <span className="text-sm font-medium text-amber-700">診察待ち</span>
              <span className="text-xl font-bold text-amber-600">{DEMO_STATS.pending.waitingConsult}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <span className="text-sm font-medium text-blue-700">発送待ち</span>
              <span className="text-xl font-bold text-blue-600">{DEMO_STATS.pending.waitingShip}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 最近の通知 */}
      <div className="mt-6 bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">最近の通知</h2>
        <div className="divide-y divide-slate-100">
          {DEMO_STATS.notifications.map((notif) => (
            <div key={notif.id} className="flex items-center gap-3 py-3">
              <span className="text-lg">{notifIcons[notif.type]}</span>
              <div className="flex-1">
                <p className="text-sm text-slate-700">{notif.text}</p>
              </div>
              <span className="text-xs text-slate-400 whitespace-nowrap">{notif.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
