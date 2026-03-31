"use client";

import { FadeIn, GoldShimmer, AnimatedBlob } from "./animations";
import { ComingSoonBadge } from "./shared";

export function FinalCTA() {
  return (
    <section id="contact" className="relative overflow-hidden bg-amber-50/30 px-5 py-24 md:py-32">
      {/* 背景装飾 */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(184,134,11,0.05),transparent_60%)]" />
      <AnimatedBlob className="top-0 left-1/4" color="bg-amber-500/3" size={400} />
      <AnimatedBlob className="bottom-0 right-1/4" color="bg-[#C4A46D]/3" size={350} />

      <FadeIn className="relative mx-auto max-w-3xl text-center">
        <ComingSoonBadge size="large" className="mb-6" />
        <h2 className="mb-4 text-[1.7rem] font-extrabold leading-snug text-slate-900 md:text-4xl">
          ECのLINE運用を、<br className="md:hidden" />
          <span className="bg-gradient-to-r from-[#B8860B] via-[#C4A46D] to-[#DAA520] bg-clip-text text-transparent">次のステージへ</span>
        </h2>
        <p className="mx-auto mb-10 max-w-xl text-[14px] leading-relaxed text-slate-500">
          リリース時にいち早くご案内いたします。事前登録いただいた方には特別割引をご用意しています。
        </p>
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <GoldShimmer className="rounded-xl">
            <a href="/ec/contact?ref=ec" className="block rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-10 py-4 text-[13px] font-bold text-white shadow-lg shadow-amber-500/20 transition hover:shadow-xl hover:shadow-amber-500/30">
              リリース通知を受け取る
            </a>
          </GoldShimmer>
        </div>
        <p className="mt-6 text-[11px] text-slate-400">※ クレジットカード不要 / 無理な営業は一切行いません</p>
      </FadeIn>
    </section>
  );
}
