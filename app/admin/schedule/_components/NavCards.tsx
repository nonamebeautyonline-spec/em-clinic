"use client";

import Link from "next/link";

const CARDS = [
  {
    href: "/admin/schedule/doctors",
    label: "医師マスタ",
    description: "医師の登録・編集",
    gradient: "from-blue-500 to-blue-600",
    hoverBorder: "hover:border-blue-200",
    bgAccent: "from-blue-50",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    href: "/admin/schedule/monthly",
    label: "スケジュール",
    description: "月別・日別・週間スケジュール管理",
    gradient: "from-emerald-500 to-emerald-600",
    hoverBorder: "hover:border-emerald-200",
    bgAccent: "from-emerald-50",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    href: "/admin/schedule/reservation-settings",
    label: "予約設定",
    description: "受付期間・メニュー・通知設定",
    gradient: "from-violet-500 to-violet-600",
    hoverBorder: "hover:border-violet-200",
    bgAccent: "from-violet-50",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    href: "/admin/schedule/work-hours",
    label: "業務時間管理",
    description: "Dr別の月間業務時間集計・修正",
    gradient: "from-amber-500 to-amber-600",
    hoverBorder: "hover:border-amber-200",
    bgAccent: "from-amber-50",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

export default function NavCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {CARDS.map((card) => (
        <Link
          key={card.href}
          href={card.href}
          className={`group relative bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md ${card.hoverBorder} transition-all overflow-hidden`}
        >
          <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${card.bgAccent} to-transparent rounded-bl-full`} />
          <div className="relative">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center text-white mb-4`}>
              {card.icon}
            </div>
            <h2 className="text-lg font-bold text-slate-800 group-hover:text-blue-600 transition">
              {card.label}
            </h2>
            <p className="text-sm text-slate-500 mt-1">{card.description}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
