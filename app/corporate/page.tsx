"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import SplitText from "./components/SplitText";
import TextReveal from "./components/TextReveal";
import ScrollReveal from "./components/ScrollReveal";
import MagneticButton from "./components/MagneticButton";
import TextScramble from "./components/TextScramble";
import ParallaxText from "./components/ParallaxText";

const NetworkCanvas = dynamic(() => import("./components/NetworkCanvas"), { ssr: false });
const MouseGradient = dynamic(() => import("./components/MouseGradient"), { ssr: false });

export default function CorporateTopPage() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 100);
    const t2 = setTimeout(() => setPhase(2), 1200);
    const t3 = setTimeout(() => setPhase(3), 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <div className="bg-[#050608]">
      {/* ── ローディングバー ── */}
      <div
        className="fixed inset-x-0 top-0 z-[60] h-[2px] origin-left bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500"
        style={{
          transform: phase >= 1 ? "scaleX(1)" : "scaleX(0)",
          opacity: phase >= 2 ? 0 : 1,
          transition: phase >= 2 ? "opacity 600ms" : "transform 1000ms cubic-bezier(0.16,1,0.3,1)",
        }}
      />

      {/* ═══════════ HERO ═══════════ */}
      <section className="relative flex min-h-[100dvh] items-center overflow-hidden px-6 md:px-16">
        <div
          className="absolute inset-0 transition-opacity duration-[2500ms]"
          style={{ opacity: phase >= 2 ? 0.8 : 0 }}
        >
          <NetworkCanvas />
        </div>

        {/* ビネット */}
        <div className="pointer-events-none absolute inset-0" style={{
          background: "radial-gradient(ellipse 70% 70% at 50% 50%, transparent 30%, rgba(5,6,8,0.9) 100%)",
        }} />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-[#050608] to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#050608] to-transparent" />

        <div className="relative z-10 mx-auto w-full max-w-7xl py-32 md:py-0">
          <div className="max-w-4xl">
            <div
              className="mb-8 transition-all duration-700"
              style={{ opacity: phase >= 2 ? 1 : 0, transform: phase >= 2 ? "translateY(0)" : "translateY(12px)" }}
            >
              <span className="inline-flex items-center gap-2 text-[11px] font-medium tracking-[0.3em] text-slate-500">
                <span className="h-px w-8 bg-slate-700" />
                ORDIX Inc.
              </span>
            </div>

            {/* 1文字ずつアニメーション */}
            <div style={{ opacity: phase >= 2 ? 1 : 0, transition: "opacity 0.1s", transitionDelay: "200ms" }}>
              <SplitText
                as="h1"
                delay={0}
                stagger={40}
                className="text-[clamp(3.5rem,10vw,9rem)] font-black leading-[0.9] tracking-tighter text-white"
              >
                ORDIX
              </SplitText>
            </div>

            {/* サブテキスト — スクランブルデコード */}
            <div
              className="mt-8 transition-all duration-1000"
              style={{ opacity: phase >= 2 ? 1 : 0, transitionDelay: "800ms" }}
            >
              <TextScramble
                as="p"
                delay={600}
                className="text-[13px] tracking-[0.2em] text-slate-500"
              >
                Software Development & DX
              </TextScramble>
            </div>

            {/* マグネティックボタン */}
            <div
              className="mt-14 flex flex-wrap items-center gap-5 transition-all duration-1000"
              style={{
                opacity: phase >= 2 ? 1 : 0,
                transform: phase >= 2 ? "translateY(0)" : "translateY(30px)",
                transitionDelay: "1200ms",
              }}
            >
              <MagneticButton href="/corporate/product" strength={0.25}>
                <span className="group relative inline-flex items-center gap-2.5 overflow-hidden rounded-full bg-white px-10 py-4.5 text-[13px] font-bold text-slate-900 transition-all duration-500 hover:shadow-[0_0_40px_rgba(59,130,246,0.15)]">
                  <span className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-400 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                  <span className="relative z-10 flex items-center gap-2.5 transition-colors duration-500 group-hover:text-white">
                    Product
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3 w-3 transition-transform duration-500 group-hover:translate-x-1.5">
                      <path d="M3 8h10m-4-4 4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </span>
              </MagneticButton>
              <MagneticButton href="/corporate/about" strength={0.25}>
                <span className="inline-flex rounded-full border border-slate-700/50 px-10 py-4.5 text-[13px] font-medium text-slate-400 transition-all duration-500 hover:border-slate-500 hover:text-white">
                  About
                </span>
              </MagneticButton>
            </div>
          </div>
        </div>

        {/* スクロールインジケーター */}
        <div
          className="absolute bottom-10 left-1/2 -translate-x-1/2 transition-all duration-1000"
          style={{ opacity: phase >= 3 ? 0.4 : 0 }}
        >
          <div className="h-12 w-[1px] overflow-hidden">
            <div className="h-full w-full bg-gradient-to-b from-white to-transparent" style={{ animation: "scrollDown 2s ease-in-out infinite" }} />
          </div>
        </div>
      </section>

      {/* ═══════════ スクロール連動マーキー ═══════════ */}
      <section className="border-t border-slate-800/30 py-8">
        <ParallaxText baseVelocity={0.3} className="text-[clamp(2rem,5vw,4rem)] font-black tracking-tight text-slate-800/[0.06]">
          DEVELOPMENT — OPERATION — GROWTH — CLINIC DX — SaaS —
        </ParallaxText>
      </section>

      {/* ═══════════ SECTION — Product & Mission ═══════════ */}
      <section className="relative px-6 py-32 md:px-16 md:py-48">
        <MouseGradient size={800} opacity={0.05} />
        <div className="relative mx-auto max-w-7xl">
          <div className="grid gap-20 md:grid-cols-2 md:items-center">
            <ScrollReveal direction="left">
              <div>
                <span className="inline-flex items-center gap-2 text-[11px] font-medium tracking-[0.3em] text-slate-600">
                  <span className="h-px w-8 bg-slate-800" />
                  What we build
                </span>
                <div className="mt-10">
                  <TextScramble as="p" delay={200} className="text-[80px] font-black leading-none text-slate-800/30 md:text-[120px]">
                    01
                  </TextScramble>
                </div>
              </div>
            </ScrollReveal>

            <div>
              <ScrollReveal>
                <h2 className="text-3xl font-black leading-snug text-white md:text-5xl">
                  Lオペ for CLINIC
                </h2>
              </ScrollReveal>
              <ScrollReveal delay={200}>
                <p className="mt-8 max-w-md text-[15px] leading-[1.9] text-slate-500">
                  クリニック特化のLINE運用プラットフォーム。
                  予約・問診・決済・CRMをLINEに統合。
                </p>
              </ScrollReveal>
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden px-6 py-32 md:px-16 md:py-48">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/[0.03] blur-[150px]" />
        <div className="relative mx-auto max-w-7xl">
          <div className="grid gap-20 md:grid-cols-2 md:items-center">
            <div className="md:order-2">
              <ScrollReveal direction="right">
                <span className="inline-flex items-center gap-2 text-[11px] font-medium tracking-[0.3em] text-slate-600">
                  <span className="h-px w-8 bg-slate-800" />
                  Why we exist
                </span>
                <div className="mt-10">
                  <TextScramble as="p" delay={200} className="text-[80px] font-black leading-none text-slate-800/30 md:text-[120px]">
                    02
                  </TextScramble>
                </div>
              </ScrollReveal>
            </div>

            <div className="md:order-1">
              <ScrollReveal>
                <h2 className="text-3xl font-black leading-snug text-white md:text-5xl">
                  Mission
                </h2>
              </ScrollReveal>
              <ScrollReveal delay={200}>
                <p className="mt-8 max-w-md text-[15px] leading-[1.9] text-slate-500">
                  業種特化のSaaSで現場の業務を再設計し、
                  顧客体験と業務効率を同時にアップデートする。
                </p>
              </ScrollReveal>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ CTA ═══════════ */}
      <section className="relative px-6 py-32 md:px-16 md:py-48">
        <div className="mx-auto max-w-4xl text-center">
          <ScrollReveal>
            <p className="text-[11px] font-medium tracking-[0.3em] text-slate-600">
              Contact
            </p>
          </ScrollReveal>
          <ScrollReveal delay={100}>
            <h2 className="mt-6 text-4xl font-black text-white md:text-6xl">
              Get in touch
            </h2>
          </ScrollReveal>
          <ScrollReveal delay={300}>
            <MagneticButton href="/corporate/contact" strength={0.2}>
              <span className="group mt-12 inline-flex items-center gap-3 rounded-full border border-slate-700/50 px-12 py-5 text-[13px] font-medium text-slate-300 transition-all duration-500 hover:border-white hover:bg-white hover:text-slate-900">
                お問い合わせ
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3 transition-transform duration-500 group-hover:translate-x-1">
                  <path d="M3 8h10m-4-4 4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </MagneticButton>
          </ScrollReveal>
        </div>
      </section>

      <style jsx>{`
        @keyframes scrollDown {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
      `}</style>
    </div>
  );
}
