"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import TextReveal from "../components/TextReveal";
import ScrollReveal from "../components/ScrollReveal";
import MagneticButton from "../components/MagneticButton";
import TiltCard from "../components/TiltCard";

const HorizontalScroll = dynamic(() => import("../components/HorizontalScroll"), { ssr: false });

const AREAS = [
  { tag: "01", title: "クラウド・SaaS開発", desc: "CRM、予約管理、販売管理、在庫管理、決済、配送。あらゆる業務プロセスをクラウドサービスとして設計・開発・運営。" },
  { tag: "02", title: "DX支援", desc: "業務分析から設計、実装、運用まで。経営課題をテクノロジーで解決するDXコンサルティング。" },
  { tag: "03", title: "LINE・SNSマーケティング", desc: "LINE公式アカウントの高度な運用、自動配信・ステップ配信、セグメント配信でLTV最大化。" },
  { tag: "04", title: "医療機関向けソリューション", desc: "クリニック経営のDX。オンライン診療、電子カルテ、予約・問診・決済の一元化。" },
  { tag: "05", title: "決済・EC", desc: "決済システム開発、決済代行・収納代行、ECプラットフォームの企画・構築・運営。" },
  { tag: "06", title: "業種特化ソリューション", desc: "小売・美容・サロン・飲食・フランチャイズ。業界の深い理解に基づく専用システム開発。" },
];

export default function BusinessPage() {
  return (
    <div className="pt-[72px]">
      {/* ── ヒーロー ── */}
      <section className="px-6 py-28 md:px-16 md:py-44">
        <div className="mx-auto max-w-7xl">
          <span className="inline-flex items-center gap-3 text-[11px] font-medium tracking-[0.3em] text-slate-400">
            <span className="h-px w-8 bg-slate-300" />
            Business
          </span>
          <div className="mt-8">
            <TextReveal as="h1" className="text-4xl font-black leading-[1.1] text-slate-900 md:text-7xl">
              Business
            </TextReveal>
          </div>
        </div>
      </section>

      {/* ── 横スクロール事業一覧 ── */}
      <HorizontalScroll className="border-t border-slate-100">
        {AREAS.map((area) => (
          <TiltCard key={area.tag} className="shrink-0 rounded-2xl" maxTilt={6}>
            <div className="flex h-[400px] w-[340px] flex-col justify-between rounded-2xl border border-slate-100 bg-white p-10 transition-shadow duration-500 hover:shadow-2xl hover:shadow-slate-200/40 md:w-[420px]">
              <div>
                <p className="font-mono text-sm font-bold text-slate-300">
                  {area.tag}
                </p>
                <h3 className="mt-6 text-2xl font-bold text-slate-900">
                  {area.title}
                </h3>
                <p className="mt-4 text-[14px] leading-[1.9] text-slate-500">
                  {area.desc}
                </p>
              </div>
              <div className="mt-8 h-px w-12 bg-slate-200" />
            </div>
          </TiltCard>
        ))}
      </HorizontalScroll>

      {/* ── CTA ── */}
      <section className="bg-[#050608] px-6 py-28 md:px-16 md:py-40">
        <div className="mx-auto max-w-4xl text-center">
          <ScrollReveal>
            <h2 className="text-3xl font-black text-white md:text-5xl">
              Get in touch
            </h2>
          </ScrollReveal>
          <ScrollReveal delay={200}>
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
    </div>
  );
}
