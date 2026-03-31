"use client";

import { FadeIn } from "./animations";

export function MidCTA({ title, sub }: { title: string; sub: string }) {
  return (
    <section className="bg-gradient-to-r from-stone-700 via-[#8B7355] to-amber-700 px-5 py-14">
      <FadeIn className="mx-auto max-w-3xl text-center">
        <h2 className="mb-2 text-xl font-extrabold text-white md:text-2xl">{title}</h2>
        <p className="mx-auto mb-8 max-w-xl text-[13px] leading-relaxed text-stone-200">{sub}</p>
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href="/ec/contact?ref=ec"
            className="w-full rounded-xl bg-white px-8 py-3.5 text-[13px] font-bold text-stone-700 shadow-lg transition hover:bg-amber-50 sm:w-auto"
          >
            無料トライアルを始める
          </a>
          <a
            href="#features"
            className="w-full rounded-xl border-2 border-white/25 px-8 py-3.5 text-[13px] font-bold text-white transition hover:bg-white/10 sm:w-auto"
          >
            機能を見る
          </a>
        </div>
      </FadeIn>
    </section>
  );
}
