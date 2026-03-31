"use client";

import { motion } from "motion/react";
import { FadeIn, PulseGlow } from "./animations";

/* ═══════════════════════════════════════════════════════════════════════════
   中間CTA — LINE緑グラデーション + 波形デザイン
   ═══════════════════════════════════════════════════════════════════════════ */

export function MidCTA({ title, sub }: { title: string; sub: string }) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-r from-[#06C755] via-[#00B900] to-emerald-500 px-5 py-16">
      {/* 背景パターン */}
      <div className="absolute inset-0 opacity-[0.05]">
        <div className="absolute top-4 left-[10%] h-20 w-20 rounded-full border-2 border-white" />
        <div className="absolute bottom-4 right-[15%] h-14 w-14 rounded-full border-2 border-white" />
        <div className="absolute top-1/2 left-[60%] h-10 w-10 rounded-full border-2 border-white" />
      </div>

      <FadeIn className="relative mx-auto max-w-3xl text-center">
        <motion.div
          initial={{ scale: 0.95 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="mb-3 text-xl font-extrabold text-white md:text-2xl">{title}</h2>
          <p className="mx-auto mb-8 max-w-xl text-[13px] leading-relaxed text-white/80">{sub}</p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <PulseGlow>
              <a
                href="/line/contact?ref=line"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-8 py-3.5 text-[13px] font-bold text-[#06C755] shadow-lg transition hover:bg-emerald-50 sm:w-auto"
              >
                無料で始める
              </a>
            </PulseGlow>
            <a
              href="#features"
              className="w-full rounded-xl border-2 border-white/25 px-8 py-3.5 text-[13px] font-bold text-white transition hover:bg-white/10 sm:w-auto"
            >
              機能を見る
            </a>
          </div>
        </motion.div>
      </FadeIn>
    </section>
  );
}
