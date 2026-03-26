"use client";

import { Section, Label, Title, Sub } from "./shared";
import { StaggerChildren, StaggerItem } from "./animations";

export default function About() {
  return (
    <Section className="bg-gradient-to-b from-blue-50/40 to-white">
      <div className="text-center">
        <Label>ABOUT</Label>
        <Title>Lオペ for CLINIC とは</Title>
        <Sub>Lオペ for CLINIC は、LINE公式アカウントを「クリニックの業務基盤」へ進化させる、医療機関専用のオールインワン運用プラットフォームです。</Sub>
      </div>
      <StaggerChildren className="grid gap-5 md:grid-cols-3">
        {[
          { icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z", title: "LINE起点のCRM", desc: "友だち追加から問診・予約・フォローアップまで、患者とのすべてのタッチポイントをLINE上で一元管理。" },
          { icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4", title: "業務オールインワン", desc: "予約・会計・配送・カルテ・スケジュール管理まで、バラバラだったツールを1つに統合。" },
          { icon: "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z", title: "最新AI搭載", desc: "Claude・GPTなど最新AIモデルを搭載。患者対応の自動返信、診察音声からのカルテ自動生成、スタッフの修正から学習するRAG方式で、使うほど精度が向上します。" },
        ].map((c) => (
          <StaggerItem key={c.title}>
            <div className="group rounded-2xl border border-slate-100 bg-white p-8 text-center transition hover:border-blue-200 hover:shadow-lg hover:shadow-blue-50">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-sky-50 transition group-hover:from-blue-100 group-hover:to-sky-100">
                <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d={c.icon} /></svg>
              </div>
              <h3 className="mb-2 text-lg font-bold tracking-tight">{c.title}</h3>
              <p className="text-[13px] leading-relaxed text-slate-400">{c.desc}</p>
            </div>
          </StaggerItem>
        ))}
      </StaggerChildren>
    </Section>
  );
}
