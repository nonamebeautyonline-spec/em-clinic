"use client";

import { Section, Label, Title } from "./shared";
import { StaggerChildren, StaggerItem } from "./animations";

export default function Problems() {
  const items = [
    { icon: "M12 8v4m0 4h.01", text: "LINE公式アカウントの友だちは増えたけど、配信が手間で活用しきれていない" },
    { icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z", text: "配信の効果を分析できず、施策の改善ができない" },
    { icon: "M4 6h16M4 12h8m-8 6h16", text: "配信ツール・予約ツール・フォームツール…バラバラで管理が煩雑" },
    { icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z", text: "複数SaaSの月額費用がかさみ、コスト管理が難しい" },
  ];
  return (
    <Section>
      <div className="text-center">
        <Label>PROBLEM</Label>
        <Title>LINE運用で<br className="md:hidden" />こんなお悩みはありませんか？</Title>
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
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-6 py-2.5 text-[15px] font-semibold text-emerald-700">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          これらの課題を Lオペ がすべて解決します
        </div>
      </div>
    </Section>
  );
}
