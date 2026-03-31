"use client";

import { motion } from "motion/react";
import { FadeIn, AnimatedBlob, FloatingPetals, Shimmer } from "./animations";
import { ComingSoonBadge } from "./shared";

/* ═══════════════════════════════════════════════════════════════════════════
   最終CTA — ピンク＋ローズゴールドの華やかなセクション
   花びらパーティクル + 準備中表示
   ═══════════════════════════════════════════════════════════════════════════ */

export function FinalCTA() {
  return (
    <section id="contact" className="relative overflow-hidden bg-gradient-to-br from-pink-500 via-rose-400 to-fuchsia-500 px-5 py-24 md:py-32">
      <FloatingPetals count={8} />
      <AnimatedBlob className="-top-30 -left-20" color="bg-white/10" size={300} />
      <AnimatedBlob className="-bottom-30 -right-20" color="bg-white/10" size={300} />

      <FadeIn className="relative mx-auto max-w-3xl text-center">
        {/* ローズゴールド装飾 */}
        <div className="mb-6 flex items-center justify-center gap-3">
          <div className="h-px w-12 bg-white/30" />
          <div className="h-2 w-2 rounded-full bg-white/50" />
          <div className="h-px w-12 bg-white/30" />
        </div>

        <h2 className="mb-4 text-[1.7rem] font-extrabold leading-snug text-white md:text-4xl">
          サロンのLINE運用を、
          <br className="md:hidden" />
          次のステージへ
        </h2>
        <p className="mx-auto mb-6 max-w-xl text-[14px] leading-relaxed text-pink-100">
          予約管理・顧客管理・配信・スタンプカード・物販まで。
          <br className="hidden md:block" />
          サロンに必要な全てをひとつの管理画面で。
        </p>

        <ComingSoonBadge className="mb-8 border-white/30 bg-white/15 text-white shadow-none [&_span_span]:bg-white" />

        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <motion.a
            href="/salon/contact?ref=salon"
            className="w-full rounded-xl bg-white px-10 py-4 text-[14px] font-bold text-pink-700 shadow-xl transition hover:bg-pink-50 sm:w-auto"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
          >
            事前登録はこちら
          </motion.a>
          <a
            href="#features"
            className="w-full rounded-xl border-2 border-white/30 px-10 py-4 text-[14px] font-bold text-white transition hover:bg-white/10 sm:w-auto"
          >
            機能を見る
          </a>
        </div>

        <p className="mt-8 text-[11px] text-pink-200">
          ※ 初期費用なし / 月額9,800円から / 無理な営業は一切行いません
        </p>
      </FadeIn>
    </section>
  );
}
