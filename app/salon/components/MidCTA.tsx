"use client";

import { FadeIn } from "./animations";

export function MidCTA({ title, sub }: { title: string; sub: string }) {
  return (
    <section className="bg-gradient-to-r from-pink-500 via-rose-500 to-pink-400 px-5 py-14">
      <FadeIn className="mx-auto max-w-3xl text-center">
        <h2 className="mb-2 text-xl font-extrabold text-white md:text-2xl">{title}</h2>
        <p className="mx-auto mb-8 max-w-xl text-[13px] leading-relaxed text-pink-100">{sub}</p>
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href="/salon/contact?ref=salon"
            className="w-full rounded-xl bg-white px-8 py-3.5 text-[13px] font-bold text-pink-700 shadow-lg transition hover:bg-pink-50 sm:w-auto"
          >
            無料で相談する
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
