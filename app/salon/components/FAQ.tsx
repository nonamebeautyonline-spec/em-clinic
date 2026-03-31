"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Section, Label, Title, RoseGoldDivider } from "./shared";
import { FadeIn, StaggerChildren, StaggerItem } from "./animations";

/* ═══════════════════════════════════════════════════════════════════════════
   FAQ — ピンクアコーディオン + ソフトシェイプ装飾
   ═══════════════════════════════════════════════════════════════════════════ */

const faqs = [
  { q: "LINE公式アカウントがなくても使えますか？", a: "はい。LINE公式アカウントの開設がまだの場合も、導入サポートの中でアカウント開設からMessaging API設定まで代行いたします。" },
  { q: "ホットペッパーとの連携はいつからできますか？", a: "現在開発中です。リリース時期が決まり次第、ご登録いただいたメールアドレスにご案内いたします。連携前でもLINE予約機能は単体でご利用いただけます。" },
  { q: "スタッフがITに詳しくなくても使えますか？", a: "はい。管理画面はスマホ・タブレットにも対応しており、直感的に操作できます。初期設定はサポートチームが代行するため、現場の負担はほぼゼロです。" },
  { q: "既存の紙のポイントカードからの移行はできますか？", a: "はい。デジタルスタンプカードへの移行をサポートします。既存のポイント残高の引き継ぎ方法もご案内いたします。" },
  { q: "複数店舗での利用は可能ですか？", a: "プレミアムプランで複数店舗管理に対応しています。店舗ごとの顧客管理・配信・予約を一元的に管理できます。" },
  { q: "契約期間の縛りはありますか？", a: "最低契約期間は1ヶ月で、いつでもプラン変更・解約が可能です。アップグレードは即時反映、ダウングレードは次月から適用されます。" },
  { q: "物販機能で何が売れますか？", a: "サロン専売品・ホームケア商品・ギフト券など、LINE上で販売可能です。在庫管理・発送管理も管理画面から一元管理できます。" },
  { q: "リリース時期はいつですか？", a: "2026年夏のリリースを予定しています。事前登録いただいた方には、最新情報と早期割引のご案内をお届けします。" },
];

/* FAQPage JSON-LD */
const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export function FAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  return (
    <Section id="faq" className="relative bg-gradient-to-b from-pink-50/30 via-white to-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* ソフトシェイプ装飾 */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 h-64 w-96 rounded-full bg-pink-100/20 blur-[100px]" />

      <div className="text-center">
        <Label>FAQ</Label>
        <Title>よくあるご質問</Title>
      </div>

      <div className="mx-auto mt-8 max-w-3xl">
        <StaggerChildren className="space-y-3">
          {faqs.map((f, i) => (
            <StaggerItem key={i}>
              <div className={`overflow-hidden rounded-2xl border transition-all ${
                openIdx === i
                  ? "border-pink-200 bg-pink-50/30 shadow-sm shadow-pink-100/30"
                  : "border-slate-100 bg-white hover:border-pink-100"
              }`}>
                <button
                  className="flex w-full items-center justify-between px-6 py-5 text-left"
                  onClick={() => setOpenIdx(openIdx === i ? null : i)}
                  aria-expanded={openIdx === i}
                  aria-controls={`faq-answer-${i}`}
                >
                  <span className="flex items-start gap-3 text-[13px] font-semibold text-slate-700 md:text-[14px]">
                    <span className="mt-0.5 shrink-0 rounded-lg bg-gradient-to-br from-pink-500 to-rose-400 px-2 py-0.5 text-[10px] font-bold text-white">
                      Q
                    </span>
                    {f.q}
                  </span>
                  <motion.div
                    className="ml-3 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-pink-100/60"
                    animate={{ rotate: openIdx === i ? 180 : 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    <svg
                      className="h-4 w-4 text-pink-500"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </motion.div>
                </button>
                <AnimatePresence initial={false}>
                  {openIdx === i && (
                    <motion.div
                      id={`faq-answer-${i}`}
                      key="answer"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-5 pl-14 text-[13px] leading-relaxed text-slate-400">
                        {f.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </StaggerItem>
          ))}
        </StaggerChildren>
      </div>

      <RoseGoldDivider className="mt-14" />
    </Section>
  );
}
