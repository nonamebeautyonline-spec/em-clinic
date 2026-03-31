"use client";

import { motion } from "motion/react";
import { FadeIn, AnimatedBlob, FloatingPetals } from "./animations";
import { ComingSoonBadge } from "./shared";

/* ═══════════════════════════════════════════════════════════════════════════
   中間CTA — ピンクグラデーション + 花びらパーティクル
   ═══════════════════════════════════════════════════════════════════════════ */

export function MidCTA({ title, sub }: { title: string; sub: string }) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-r from-pink-500 via-rose-400 to-fuchsia-400 px-5 py-16">
      <FloatingPetals count={4} />
      <AnimatedBlob className="-top-20 -left-20" color="bg-white/10" size={200} />
      <AnimatedBlob className="-bottom-20 -right-20" color="bg-white/10" size={200} />

      <FadeIn className="relative mx-auto max-w-3xl text-center">
        <h2 className="mb-3 text-xl font-extrabold text-white md:text-2xl">{title}</h2>
        <p className="mx-auto mb-6 max-w-xl text-[13px] leading-relaxed text-pink-100">{sub}</p>
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <motion.a
            href="/salon/contact?ref=salon"
            className="w-full rounded-xl bg-white px-8 py-3.5 text-[13px] font-bold text-pink-700 shadow-lg transition hover:bg-pink-50 sm:w-auto"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
          >
            無料で相談する
          </motion.a>
          <a
            href="#features"
            className="w-full rounded-xl border-2 border-white/30 px-8 py-3.5 text-[13px] font-bold text-white transition hover:bg-white/10 sm:w-auto"
          >
            機能を見る
          </a>
        </div>
        <div className="mt-5">
          <ComingSoonBadge className="border-white/30 bg-white/10 text-white [&_span_span]:bg-white" />
        </div>
      </FadeIn>
    </section>
  );
}
