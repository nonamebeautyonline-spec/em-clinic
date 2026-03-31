"use client";

import { motion } from "motion/react";
import { Section, Label, Title } from "./shared";
import { FadeIn, StaggerChildren, StaggerItem, ScaleIn } from "./animations";

/* ═══════════════════════════════════════════════════════════════════════════
   課題提起セクション — LINE会話バブル風レイアウト
   ═══════════════════════════════════════════════════════════════════════════ */

const problems = [
  {
    icon: "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    title: "配信が手間で活用しきれない",
    desc: "友だちは増えたものの、配信準備に毎回時間がかかり、定期的な配信が続かない。",
    emoji: "😰",
  },
  {
    icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
    title: "効果測定ができない",
    desc: "配信しっぱなしで、開封率やクリック率が見えず、改善のしようがない。",
    emoji: "📉",
  },
  {
    icon: "M4 6h16M4 12h8m-8 6h16",
    title: "ツールがバラバラで非効率",
    desc: "配信・予約・フォーム・分析…ツールが分散して管理が煩雑。データの連携もできない。",
    emoji: "🔀",
  },
  {
    icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    title: "複数SaaSのコストが膨大",
    desc: "配信ツール・予約システム・フォーム作成ツール…月額費用の合計が馬鹿にならない。",
    emoji: "💸",
  },
];

export default function Problems() {
  return (
    <Section className="relative overflow-hidden">
      {/* 薄い背景パターン */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(6,199,85,0.03)_0%,transparent_70%)]" />

      <div className="relative text-center">
        <Label>PROBLEM</Label>
        <Title>LINE運用で<br className="md:hidden" />こんなお悩みはありませんか？</Title>
      </div>

      <StaggerChildren className="relative mx-auto mt-10 grid max-w-4xl gap-4 md:grid-cols-2">
        {problems.map((p, i) => (
          <StaggerItem key={i}>
            <motion.div
              className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 transition hover:border-rose-200 hover:shadow-lg"
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
            >
              {/* 背景装飾 */}
              <div className="absolute -right-4 -top-4 text-5xl opacity-[0.06]">{p.emoji}</div>

              <div className="flex gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-xl">
                  {p.emoji}
                </div>
                <div>
                  <h3 className="mb-1.5 text-[15px] font-bold text-slate-800">{p.title}</h3>
                  <p className="text-[13px] leading-relaxed text-slate-400">{p.desc}</p>
                </div>
              </div>
            </motion.div>
          </StaggerItem>
        ))}
      </StaggerChildren>

      <ScaleIn delay={0.3}>
        <div className="mt-14 flex justify-center">
          <motion.div
            className="inline-flex items-center gap-3 rounded-2xl border-2 border-[#06C755]/20 bg-gradient-to-r from-[#06C755]/5 to-emerald-50 px-8 py-4"
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#06C755]">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <span className="text-[16px] font-bold text-[#06C755]">これらの課題を Lオペ for LINE がすべて解決します</span>
          </motion.div>
        </div>
      </ScaleIn>
    </Section>
  );
}
