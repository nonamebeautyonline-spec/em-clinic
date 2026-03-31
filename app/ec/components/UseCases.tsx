"use client";

import { Section, Label, Title, Sub } from "./shared";
import { StaggerChildren, StaggerItem } from "./animations";

const useCases = [
  {
    industry: "D2Cブランド",
    icon: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z",
    bg: "bg-amber-50",
    accent: "text-amber-700",
    examples: ["ブランドストーリー配信でファン育成", "新商品先行販売のVIP限定通知", "定期購入者向けリピート促進シナリオ"],
  },
  {
    industry: "アパレルEC",
    icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
    bg: "bg-pink-50",
    accent: "text-pink-600",
    examples: ["サイズ・カラー再入荷通知", "季節セール情報のセグメント配信", "コーディネート提案でクロスセル促進"],
  },
  {
    industry: "食品EC",
    icon: "M12 8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z",
    bg: "bg-orange-50",
    accent: "text-orange-600",
    examples: ["賞味期限ベースの再購入リマインド", "季節限定商品の先行予約受付", "定期便の配送スケジュール通知"],
  },
  {
    industry: "サブスクEC",
    icon: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15",
    bg: "bg-violet-50",
    accent: "text-violet-600",
    examples: ["解約予兆のある顧客へ自動フォロー", "プラン変更・休止の簡単手続き", "継続特典・ランクアップ通知"],
  },
  {
    industry: "実店舗+EC連携",
    icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
    bg: "bg-sky-50",
    accent: "text-sky-600",
    examples: ["店舗来店後のオンライン購入促進", "ECポイントと店舗ポイントの統合管理", "店舗イベント情報のエリア限定配信"],
  },
];

export default function UseCases() {
  return (
    <Section id="usecases" className="bg-stone-50/50">
      <div className="text-center">
        <Label>USE CASES</Label>
        <Title>業態別の活用事例</Title>
        <Sub>D2C・アパレル・食品・サブスク・実店舗+EC連携など、あらゆるEC業態でLINE運用の成果を最大化できます。</Sub>
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
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-100 text-[8px] text-amber-600">&#10003;</span>
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
