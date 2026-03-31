"use client";

import { FadeIn, GoldShimmer } from "./animations";

export function MidCTA({ title, sub }: { title: string; sub: string }) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-r from-[#1a1a2e] via-[#16213e] to-[#1a1a2e] px-5 py-14">
      {/* ゴールドのライン装飾 */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(184,134,11,0.08),transparent_70%)]" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />

      <FadeIn className="relative mx-auto max-w-3xl text-center">
        <h2 className="mb-2 text-xl font-extrabold text-white md:text-2xl">{title}</h2>
        <p className="mx-auto mb-8 max-w-xl text-[13px] leading-relaxed text-slate-400">{sub}</p>
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href="/ec/contact?ref=ec"
            className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-8 py-3.5 text-[13px] font-bold text-white shadow-lg shadow-amber-500/20 transition hover:shadow-xl hover:shadow-amber-500/30 sm:w-auto"
          >
            事前登録はこちら
          </a>
          <a
            href="#features"
            className="w-full rounded-xl border border-slate-600 bg-white/5 px-8 py-3.5 text-[13px] font-bold text-slate-300 backdrop-blur transition hover:border-amber-500/40 hover:text-amber-400 sm:w-auto"
          >
            機能を見る
          </a>
        </div>
      </FadeIn>
    </section>
  );
}
