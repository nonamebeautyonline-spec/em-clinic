"use client";

import { FadeIn } from "./animations";

export function FinalCTA() {
  return (
    <section id="contact" className="bg-gradient-to-br from-pink-500 via-rose-500 to-pink-400 px-5 py-24 md:py-32">
      <FadeIn className="mx-auto max-w-3xl text-center">
        <h2 className="mb-4 text-[1.7rem] font-extrabold leading-snug text-white md:text-4xl">サロンのLINE運用を、<br className="md:hidden" />次のステージへ</h2>
        <p className="mx-auto mb-10 max-w-xl text-[14px] leading-relaxed text-pink-100">月額9,800円から。まずはお気軽にご相談ください。</p>
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a href="/salon/contact?ref=salon" className="w-full rounded-xl bg-white px-10 py-4 text-[13px] font-bold text-pink-700 shadow-lg transition hover:bg-pink-50 sm:w-auto">リリース通知を受け取る</a>
        </div>
        <p className="mt-6 text-[11px] text-pink-200">※ 初期費用なし / 無理な営業は一切行いません</p>
      </FadeIn>
    </section>
  );
}
