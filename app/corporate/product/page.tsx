"use client";

import Link from "next/link";
import TextReveal from "../components/TextReveal";
import ScrollReveal from "../components/ScrollReveal";
import TiltCard from "../components/TiltCard";
import TextScramble from "../components/TextScramble";

const FEATURES = [
  { label: "予約管理", desc: "LINE上で予約の受付・変更・リマインドを自動化" },
  { label: "Web問診", desc: "来院前にLINEで問診を完了、待ち時間ゼロ" },
  { label: "オンライン診療", desc: "LINEビデオ通話で場所を選ばない診療体験" },
  { label: "決済", desc: "クレジット・銀行振込をLINE内で完結" },
  { label: "CRM", desc: "患者情報の一元管理とセグメント配信" },
  { label: "電子カルテ", desc: "SOAP形式、テンプレート、写真管理" },
  { label: "自動返信", desc: "患者メッセージに24時間自動対応" },
  { label: "アナリティクス", desc: "売上・患者動向をリアルタイム可視化" },
];

export default function ProductPage() {
  return (
    <div className="pt-[72px]">
      {/* ── ヒーロー ── */}
      <section className="px-6 py-28 md:px-16 md:py-44">
        <div className="mx-auto max-w-7xl">
          <span className="inline-flex items-center gap-3 text-[11px] font-medium tracking-[0.3em] text-slate-400">
            <span className="h-px w-8 bg-slate-300" />
            Product
          </span>
          <div className="mt-8">
            <TextReveal as="h1" className="text-4xl font-black leading-[1.1] text-slate-900 md:text-7xl">
              Product
            </TextReveal>
          </div>
          <ScrollReveal delay={400}>
            <p className="mt-10 max-w-xl text-base leading-[1.9] text-slate-500 md:text-lg">
              予約・問診・決済・CRMをLINEに統合するクリニック特化SaaS
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* ── プロダクトカード（3D TiltCard） ── */}
      <section className="px-6 pb-20 md:px-16 md:pb-32">
        <div className="mx-auto max-w-6xl">
          <ScrollReveal direction="scale">
            <TiltCard className="rounded-[2rem] shadow-2xl shadow-slate-200/30" maxTilt={4}>
              <div className="overflow-hidden rounded-[2rem]">
                {/* ダークヘッダー */}
                <div className="relative bg-[#050608] px-8 py-16 md:px-16 md:py-24">
                  <div className="pointer-events-none absolute inset-0 opacity-[0.03]" style={{
                    backgroundImage: "linear-gradient(rgba(59,130,246,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.3) 1px, transparent 1px)",
                    backgroundSize: "40px 40px",
                  }} />
                  <div className="relative">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-1.5 text-[11px] font-bold text-blue-400">
                        SaaS
                      </span>
                      <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-1.5 text-[11px] font-bold text-emerald-400">
                        Production
                      </span>
                    </div>
                    <h2 className="mt-8 text-4xl font-black text-white md:text-6xl">
                      Lオペ for CLINIC
                    </h2>
                    <p className="mt-6 max-w-lg text-[15px] leading-[1.9] text-slate-400">
                      クリニック特化のLINE運用プラットフォーム。患者体験の向上と業務効率化を同時に実現。
                    </p>
                    <Link
                      href="/lp"
                      className="group mt-10 inline-flex items-center gap-2.5 rounded-full bg-white px-9 py-4 text-[13px] font-bold text-slate-900 transition-all duration-500 hover:shadow-[0_0_40px_rgba(59,130,246,0.15)]"
                      data-cursor-hover
                    >
                      サービスサイトへ
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3 w-3 transition-transform duration-500 group-hover:translate-x-1.5">
                        <path d="M3 8h10m-4-4 4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </Link>
                  </div>
                </div>

                {/* 機能グリッド */}
                <div className="grid grid-cols-2 gap-px bg-slate-100 md:grid-cols-4">
                  {FEATURES.map((f, i) => (
                    <ScrollReveal key={f.label} delay={i * 40}>
                      <div className="h-full bg-white p-6 transition-colors duration-300 hover:bg-slate-50 md:p-8">
                        <p className="text-[13px] font-bold text-slate-900">{f.label}</p>
                        <p className="mt-2 text-[12px] leading-relaxed text-slate-500">{f.desc}</p>
                      </div>
                    </ScrollReveal>
                  ))}
                </div>
              </div>
            </TiltCard>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
