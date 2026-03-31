"use client";

import { Section, Label, Title } from "./shared";
import { StaggerChildren, StaggerItem } from "./animations";

export default function Problems() {
  const items = [
    { icon: "M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z", text: "カゴ落ちが多いのに、回収する手段がなく売上を逃している" },
    { icon: "M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0", text: "発送通知をLINEで自動化できず、手動メール対応に時間がかかる" },
    { icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z", text: "購買データを活用したセグメント配信ができず、一斉配信でブロック率が上昇" },
    { icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z", text: "配信ツール・CRM・クーポン管理がバラバラで運用コストが膨らんでいる" },
  ];
  return (
    <Section>
      <div className="text-center">
        <Label>PROBLEM</Label>
        <Title>ECのLINE運用で<br className="md:hidden" />こんなお悩みはありませんか？</Title>
      </div>
      <StaggerChildren className="mx-auto mt-8 grid max-w-4xl gap-3 md:grid-cols-2">
        {items.map((p, i) => (
          <StaggerItem key={i}>
            <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-5 transition hover:border-rose-200 hover:shadow-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50">
                <svg className="h-5 w-5 text-rose-400" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true"><path d={p.icon} /></svg>
              </div>
              <p className="text-[15px] leading-relaxed text-slate-600">{p.text}</p>
            </div>
          </StaggerItem>
        ))}
      </StaggerChildren>
      <div className="mt-12 flex justify-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-6 py-2.5 text-[15px] font-semibold text-amber-800">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          これらの課題を Lオペ for EC がすべて解決します
        </div>
      </div>
    </Section>
  );
}
