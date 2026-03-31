"use client";

import { Section, Label, Title } from "./shared";
import { StaggerChildren, StaggerItem } from "./animations";

export default function Problems() {
  const items = [
    { icon: "M12 8v4m0 4h.01", text: "LINEの友だちは増えたけど活用しきれていない" },
    { icon: "M4 6h16M4 12h8m-8 6h16", text: "予約・問診・会計…バラバラなツールで管理が煩雑" },
    { icon: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15", text: "再診率・リピート率を上げる施策がない" },
    { icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z", text: "スタッフの電話対応・手作業に時間を取られすぎる" },
    { icon: "M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122", text: "患者属性に合わせたメッセージ配信ができない" },
    { icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z", text: "複数SaaSの費用がかさみコスト管理が難しい" },
  ];
  return (
    <Section>
      <div className="text-center">
        <Label>PROBLEM</Label>
        <Title>クリニック経営で<br className="md:hidden" />こんなお悩みはありませんか？</Title>
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
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-6 py-2.5 text-[15px] font-semibold text-blue-700">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          これらの課題を Lオペ for CLINIC がすべて解決します
        </div>
      </div>
    </Section>
  );
}
