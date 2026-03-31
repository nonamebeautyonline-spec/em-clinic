"use client";

import { Section, Label, Title } from "./shared";
import { CountUp, StaggerChildren, StaggerItem } from "./animations";

export default function SocialProof() {
  return (
    <Section className="bg-gradient-to-b from-white to-blue-50/30">
      <div className="text-center">
        <Label>SOCIAL PROOF</Label>
        <Title>Lオペ for CLINIC が目指す成果</Title>
      </div>

      {/* KPIカード（サービス目標値） */}
      <StaggerChildren className="mx-auto mt-8 grid max-w-3xl grid-cols-1 gap-4 md:grid-cols-3">
        {[
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
    </Section>
  );
}
