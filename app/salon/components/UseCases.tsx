"use client";

import { Section, Label, Title, Sub } from "./shared";
import { StaggerChildren, StaggerItem } from "./animations";

const useCases = [
  {
    industry: "美容室",
    icon: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z",
    bg: "bg-pink-50",
    accent: "text-pink-600",
    examples: ["スタイリスト指名予約をLINEで受付", "来店後のヘアケアフォロー自動配信", "カラー周期に合わせたリマインド配信"],
  },
  {
    industry: "ネイルサロン",
    icon: "M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01",
    bg: "bg-violet-50",
    accent: "text-violet-600",
    examples: ["デザインギャラリーをリッチメニューに設置", "オフ周期に合わせた予約促進配信", "新デザイン情報のセグメント配信"],
  },
  {
    industry: "エステサロン",
    icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
    bg: "bg-rose-50",
    accent: "text-rose-600",
    examples: ["コース契約後のフォローシナリオ配信", "ホームケア商品のLINE物販", "体験来店からの入会促進自動化"],
  },
  {
    industry: "まつげサロン",
    icon: "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z",
    bg: "bg-amber-50",
    accent: "text-amber-600",
    examples: ["リペア時期に合わせたリマインド配信", "デザインカタログのリッチメニュー設置", "スタンプカードでリピート来店を促進"],
  },
  {
    industry: "脱毛サロン",
    icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
    bg: "bg-sky-50",
    accent: "text-sky-600",
    examples: ["施術間隔に合わせた予約リマインド", "コース進捗の自動通知", "友だち紹介キャンペーンの自動化"],
  },
];

export default function UseCases() {
  return (
    <Section id="usecases" className="bg-slate-50/50">
      <div className="text-center">
        <Label>USE CASES</Label>
        <Title>業態別の活用事例</Title>
        <Sub>美容室・ネイル・エステ・まつげ・脱毛。あらゆるサロン業態でLINE運用の成果を最大化できます。</Sub>
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
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-pink-100 text-[8px] text-pink-500">&#10003;</span>
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
