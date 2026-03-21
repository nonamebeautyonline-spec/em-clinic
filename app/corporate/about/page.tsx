"use client";

import dynamic from "next/dynamic";
import TextReveal from "../components/TextReveal";
import ScrollReveal from "../components/ScrollReveal";
import TextScramble from "../components/TextScramble";
import TiltCard from "../components/TiltCard";

const MouseGradient = dynamic(() => import("../components/MouseGradient"), { ssr: false });

const COMPANY_INFO = [
  { label: "会社名", value: "株式会社ORDIX" },
  { label: "所在地", value: "東京都新宿区西新宿6丁目5-1\n新宿アイランドタワー2階" },
  { label: "メール", value: "contact@ordix.co.jp" },
];

const VALUES = [
  {
    num: "01",
    title: "Speed",
    desc: "業種ごとに必要な機能をLINE上に集約。顧客体験の向上と業務効率化を両立。",
  },
  {
    num: "02",
    title: "Engineering",
    desc: "クラウド技術を活用し、複雑な業務フローをシンプルに設計。品質に妥協しない。",
  },
  {
    num: "03",
    title: "Impact",
    desc: "導入して終わりではない。事業に浸透し、数字が動くところまで。",
  },
];

export default function AboutPage() {
  return (
    <div className="pt-[72px]">
      {/* ── ヒーロー ── */}
      <section className="px-6 py-28 md:px-16 md:py-44">
        <div className="mx-auto max-w-7xl">
          <span className="inline-flex items-center gap-3 text-[11px] font-medium tracking-[0.3em] text-slate-400">
            <span className="h-px w-8 bg-slate-300" />
            About us
          </span>
          <div className="mt-8">
            <TextReveal as="h1" className="text-4xl font-black leading-[1.1] text-slate-900 md:text-7xl">
              About
            </TextReveal>
          </div>
          <ScrollReveal delay={400}>
            <p className="mt-10 max-w-xl text-base leading-[1.9] text-slate-500 md:text-lg">
              ソフトウェアで事業のデジタル化を推進するテクノロジーカンパニー
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* ── 設立準備中カード ── */}
      <section className="border-t border-slate-100 px-6 py-24 md:px-16 md:py-32">
        <div className="mx-auto max-w-7xl">
          <ScrollReveal>
            <div className="rounded-2xl border border-blue-100 bg-blue-50/50 px-8 py-10 md:px-12 md:py-14">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
                </span>
                <span className="text-[12px] font-bold tracking-[0.15em] text-blue-600">ESTABLISHING</span>
              </div>
              <h2 className="mt-5 text-2xl font-black text-slate-900">設立準備中</h2>
              <p className="mt-3 max-w-lg text-sm leading-[1.9] text-slate-500">
                株式会社ORDIXは現在設立手続き中です。法人登記完了後、会社概要を公開します。
              </p>
            </div>
          </ScrollReveal>

          {/* 公開可能な情報 */}
          <div className="mt-12">
            {COMPANY_INFO.map((item, i) => (
              <ScrollReveal key={item.label} delay={i * 50}>
                <div className="flex flex-col border-b border-slate-100 py-6 last:border-0 md:flex-row md:items-start">
                  <dt className="w-28 shrink-0 text-[12px] font-bold uppercase tracking-[0.2em] text-slate-400">
                    {item.label}
                  </dt>
                  <dd className="mt-1.5 whitespace-pre-line text-[15px] leading-relaxed text-slate-800 md:mt-0">
                    {item.value}
                  </dd>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── バリュー（マウス追従グラデーション + TextScramble） ── */}
      <section className="relative bg-[#050608] px-6 py-28 md:px-16 md:py-40">
        <MouseGradient size={800} opacity={0.06} color="59,130,246" />
        <div className="relative mx-auto max-w-7xl">
          <ScrollReveal>
            <span className="inline-flex items-center gap-3 text-[11px] font-medium tracking-[0.3em] text-slate-600">
              <span className="h-px w-8 bg-slate-800" />
              Values
            </span>
          </ScrollReveal>

          <div className="mt-20">
            {VALUES.map((v, i) => (
              <ScrollReveal key={v.num} delay={i * 100}>
                <div className="group grid border-t border-slate-800/50 py-16 md:grid-cols-[120px_300px_1fr] md:items-start md:gap-10 md:py-20">
                  <TextScramble
                    as="p"
                    delay={i * 200}
                    className="text-5xl font-black text-white/[0.04] transition-colors duration-700 group-hover:text-blue-500/10 md:text-7xl"
                  >
                    {v.num}
                  </TextScramble>
                  <h3 className="mt-4 text-3xl font-black text-white md:mt-0 md:text-4xl">
                    {v.title}
                  </h3>
                  <p className="mt-4 max-w-md text-[15px] leading-[1.9] text-slate-500 md:mt-0">
                    {v.desc}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── ミッション ── */}
      <section className="relative overflow-hidden px-6 py-32 md:px-16 md:py-48">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-50/50 blur-[120px]" />
        <div className="relative mx-auto max-w-4xl text-center">
          <ScrollReveal>
            <span className="text-[11px] font-medium tracking-[0.3em] text-slate-400">Mission</span>
          </ScrollReveal>
          <div className="mt-10">
            <TextReveal as="p" className="text-3xl font-black leading-snug text-slate-900 md:text-6xl">
              現場の業務を、
            </TextReveal>
            <TextReveal as="p" delay={150} className="text-3xl font-black leading-snug md:text-6xl">
              <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                ソフトウェアで再設計する。
              </span>
            </TextReveal>
          </div>
        </div>
      </section>
    </div>
  );
}
