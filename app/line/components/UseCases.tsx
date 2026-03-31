"use client";

import { Section, Label, Title, Sub } from "./shared";
import { StaggerChildren, StaggerItem } from "./animations";

const useCases = [
  {
    industry: "飲食店",
    icon: "M12 8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z",
    bg: "bg-orange-50",
    accent: "text-orange-600",
    examples: ["来店後のサンクスメッセージ自動配信", "曜日・時間帯別のクーポン配信", "ランチ/ディナーのセグメント配信"],
  },
  {
    industry: "美容サロン",
    icon: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z",
    bg: "bg-pink-50",
    accent: "text-pink-600",
    examples: ["施術後のフォローアップ自動配信", "リピート促進のシナリオ配信", "スタイリスト指名予約の受付"],
  },
  {
    industry: "ECショップ",
    icon: "M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z",
    bg: "bg-emerald-50",
    accent: "text-emerald-600",
    examples: ["購入後レビュー依頼の自動配信", "カゴ落ちリマインド", "新商品・セール情報のセグメント配信"],
  },
  {
    industry: "不動産",
    icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
    bg: "bg-green-50",
    accent: "text-green-600",
    examples: ["内見予約のリマインド配信", "新着物件の条件マッチ配信", "契約後のアフターフォロー自動化"],
  },
  {
    industry: "教育・スクール",
    icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
    bg: "bg-violet-50",
    accent: "text-violet-600",
    examples: ["体験レッスン後のフォローシナリオ", "授業リマインドの自動配信", "保護者向けの一斉連絡"],
  },
];

export default function UseCases() {
  return (
    <Section id="usecases" className="bg-slate-50/50">
      <div className="text-center">
        <Label>USE CASES</Label>
        <Title>業種別の活用事例</Title>
        <Sub>飲食・美容・EC・不動産・教育など、あらゆる業種でLINE運用の成果を最大化できます。</Sub>
      </div>
      <StaggerChildren className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {useCases.map((uc) => (
          <StaggerItem key={uc.industry}>
            <div className={`rounded-2xl border border-slate-100 bg-white p-6 transition hover:shadow-lg`}>
              <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${uc.bg}`}>
                <svg className={`h-6 w-6 ${uc.accent}`} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true"><path d={uc.icon} /></svg>
              </div>
              <h3 className="mb-3 text-[15px] font-bold text-slate-800">{uc.industry}</h3>
              <ul className="space-y-2">
                {uc.examples.map((ex) => (
                  <li key={ex} className="flex items-start gap-2 text-[13px] text-slate-500">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[8px] text-[#06C755]">&#10003;</span>
                    {ex}
                  </li>
                ))}
              </ul>
            </div>
          </StaggerItem>
        ))}
      </StaggerChildren>
    </Section>
  );
}
