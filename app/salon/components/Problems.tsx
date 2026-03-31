"use client";

import { Section, Label, Title } from "./shared";
import { StaggerChildren, StaggerItem } from "./animations";

export default function Problems() {
  const items = [
    { icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z", text: "予約管理が電話・ホットペッパー・LINEとバラバラで、ダブルブッキングや漏れが発生" },
    { icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z", text: "お客様の来店履歴や好みを把握しきれず、パーソナルな接客ができない" },
    { icon: "M13 10V3L4 14h7v7l9-11h-7z", text: "リピート促進の施策が打てず、新規集客コストばかりかさんでいる" },
    { icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z", text: "ポイントカードが紙のまま。デジタル化したいけど何から始めればいいかわからない" },
  ];
  return (
    <Section>
      <div className="text-center">
        <Label>PROBLEM</Label>
        <Title>サロンのLINE運用で<br className="md:hidden" />こんなお悩みはありませんか？</Title>
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
        <div className="inline-flex items-center gap-2 rounded-full border border-pink-200 bg-pink-50 px-6 py-2.5 text-[15px] font-semibold text-pink-700">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          これらの課題を Lオペ for SALON がすべて解決します
        </div>
      </div>
    </Section>
  );
}
