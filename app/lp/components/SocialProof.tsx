"use client";

import { Section, Label, Title } from "./shared";
import { CountUp, StaggerChildren, StaggerItem, FadeIn } from "./animations";

export default function SocialProof() {
  return (
    <Section className="bg-gradient-to-b from-white to-blue-50/30">
      <div className="text-center">
        <Label>SOCIAL PROOF</Label>
        <Title>多くのクリニックで導入いただいています</Title>
      </div>

      {/* KPIカード */}
      {/* TODO: 実データに差し替え */}
      <StaggerChildren className="mx-auto mt-8 grid max-w-4xl grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "導入院数", value: 50, suffix: "院+", color: "text-blue-600" },
          { label: "業務削減率", value: 60, suffix: "%+", color: "text-sky-600" },
          { label: "リピート率向上", value: 15, prefix: "+", suffix: "%", color: "text-violet-600" },
          { label: "患者満足度", value: 98, suffix: "%+", color: "text-amber-600" },
        ].map((kpi) => (
          <StaggerItem key={kpi.label}>
            <div className="rounded-2xl border border-blue-100 bg-white p-6 text-center shadow-sm transition hover:shadow-md">
              <div className="text-[12px] font-semibold text-slate-400">{kpi.label}</div>
              <div className={`mt-2 text-3xl font-extrabold ${kpi.color}`}>
                <CountUp to={kpi.value} prefix={kpi.prefix} suffix={kpi.suffix} />
              </div>
            </div>
          </StaggerItem>
        ))}
      </StaggerChildren>

      {/* お客様の声 */}
      {/* TODO: 実データに差し替え */}
      <StaggerChildren className="mx-auto mt-14 grid max-w-5xl gap-5 md:grid-cols-3">
        {[
          {
            clinic: "Aクリニック",
            role: "院長",
            quote: "予約・問診がLINEで完結し、スタッフの負担が激減しました",
          },
          {
            clinic: "Bクリニック",
            role: "事務長",
            quote: "バラバラだったツールが1つになり、月額コストも半減",
          },
          {
            clinic: "Cクリニック",
            role: "院長",
            quote: "AI自動返信のおかげで営業時間外の対応がゼロに",
          },
        ].map((voice) => (
          <StaggerItem key={voice.clinic}>
            <div className="relative rounded-2xl border border-blue-100 bg-white p-7 shadow-sm transition hover:shadow-md">
              {/* 引用符 */}
              <span className="absolute top-4 left-5 text-4xl leading-none text-blue-100 select-none">&ldquo;</span>
              <p className="relative z-10 mt-4 text-[14px] leading-relaxed text-slate-600">
                {voice.quote}
              </p>
              <div className="mt-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-sky-100">
                  <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                </div>
                <div>
                  <div className="text-[13px] font-bold text-slate-700">{voice.clinic}</div>
                  <div className="text-[11px] text-slate-400">{voice.role}</div>
                </div>
              </div>
            </div>
          </StaggerItem>
        ))}
      </StaggerChildren>
    </Section>
  );
}
