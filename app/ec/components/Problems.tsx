"use client";

import { Section, Label, Title } from "./shared";
import { StaggerChildren, StaggerItem, CountUp } from "./animations";

export default function Problems() {
  const items = [
    {
      icon: "M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z",
      stat: 70,
      unit: "%",
      statLabel: "平均カゴ落ち率",
      text: "カゴ落ちが多いのに、回収する手段がなく売上を逃している",
      color: "text-red-400",
      bg: "bg-red-500/10",
      border: "border-red-500/20",
    },
    {
      icon: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15",
      stat: 25,
      unit: "%",
      statLabel: "リピート率の壁",
      text: "新規獲得に依存し、リピート率が上がらず利益率が低迷",
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
    },
    {
      icon: "M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0",
      stat: 3,
      unit: "h/日",
      statLabel: "手動通知の工数",
      text: "発送通知をLINEで自動化できず、手動メール対応に時間がかかる",
      color: "text-sky-400",
      bg: "bg-sky-500/10",
      border: "border-sky-500/20",
    },
    {
      icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
      stat: 4,
      unit: "ツール",
      statLabel: "分散した管理",
      text: "配信ツール・CRM・クーポン管理がバラバラで運用コストが膨らんでいる",
      color: "text-violet-400",
      bg: "bg-violet-500/10",
      border: "border-violet-500/20",
    },
  ];

  return (
    <Section className="bg-[#1a1a2e]">
      <div className="text-center">
        <Label>PROBLEM</Label>
        <Title>ECのLINE運用で<br className="md:hidden" />こんなお悩みはありませんか？</Title>
      </div>
      <StaggerChildren className="mx-auto mt-8 grid max-w-4xl gap-4 md:grid-cols-2">
        {items.map((p, i) => (
          <StaggerItem key={i}>
            <div className={`rounded-2xl border ${p.border} bg-slate-800/40 p-6 backdrop-blur transition hover:bg-slate-800/60`}>
              <div className="flex items-start gap-4">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${p.bg}`}>
                  <svg className={`h-5 w-5 ${p.color}`} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true"><path d={p.icon} /></svg>
                </div>
                <div className="flex-1">
                  <div className="mb-1 flex items-baseline gap-1.5">
                    <CountUp to={p.stat} className={`text-2xl font-black ${p.color}`} />
                    <span className={`text-[13px] font-bold ${p.color}`}>{p.unit}</span>
                    <span className="text-[11px] text-slate-500">{p.statLabel}</span>
                  </div>
                  <p className="text-[13px] leading-relaxed text-slate-400">{p.text}</p>
                </div>
              </div>
            </div>
          </StaggerItem>
        ))}
      </StaggerChildren>
      <div className="mt-12 flex justify-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-6 py-2.5 text-[14px] font-semibold text-amber-400">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          これらの課題を Lオペ for EC がすべて解決します
        </div>
      </div>
    </Section>
  );
}
