"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Section, Label, Title } from "./shared";
import { FadeIn } from "./animations";

const faqs = [
  { q: "LINE公式アカウントがなくても使えますか？", a: "はい。LINE公式アカウントの開設がまだの場合も、導入サポートの中でアカウント開設からMessaging API設定まで代行いたします。" },
  { q: "ホットペッパーとの連携はいつからできますか？", a: "現在開発中です。リリース時期が決まり次第、ご登録いただいたメールアドレスにご案内いたします。連携前でもLINE予約機能は単体でご利用いただけます。" },
  { q: "スタッフがITに詳しくなくても使えますか？", a: "はい。管理画面はスマホ・タブレットにも対応しており、直感的に操作できます。初期設定はサポートチームが代行するため、現場の負担はほぼゼロです。" },
  { q: "既存の紙のポイントカードからの移行はできますか？", a: "はい。デジタルスタンプカードへの移行をサポートします。既存のポイント残高の引き継ぎ方法もご案内いたします。" },
  { q: "複数店舗での利用は可能ですか？", a: "プレミアムプランで複数店舗管理に対応しています。店舗ごとの顧客管理・配信・予約を一元的に管理できます。" },
  { q: "契約期間の縛りはありますか？", a: "最低契約期間は1ヶ月で、いつでもプラン変更・解約が可能です。アップグレードは即時反映、ダウングレードは次月から適用されます。" },
  { q: "物販機能で何が売れますか？", a: "サロン専売品・ホームケア商品・ギフト券など、LINE上で販売可能です。在庫管理・発送管理も管理画面から一元管理できます。" },
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
    <Section id="faq" className="bg-slate-50/50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <div className="text-center"><Label>FAQ</Label><Title>よくあるご質問</Title></div>
      <FadeIn>
        <div className="mx-auto mt-8 max-w-3xl divide-y divide-slate-200/80">
          {faqs.map((f, i) => (
            <div key={i}>
              <button
                className="flex w-full items-center justify-between py-5 text-left"
                onClick={() => setOpenIdx(openIdx === i ? null : i)}
                aria-expanded={openIdx === i}
                aria-controls={`faq-answer-${i}`}
              >
                <span className="flex items-start gap-3 text-[13px] font-semibold text-slate-700 md:text-[14px]"><span className="mt-0.5 shrink-0 rounded bg-pink-100 px-2 py-0.5 text-[10px] font-bold text-pink-700">Q</span>{f.q}</span>
                <motion.svg
                  className="ml-3 h-4 w-4 shrink-0 text-slate-400"
                  fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
                  animate={{ rotate: openIdx === i ? 180 : 0 }}
                  transition={{ duration: 0.25 }}
                  aria-hidden="true"
                >
                  <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
                </motion.svg>
              </button>
              <AnimatePresence initial={false}>
                {openIdx === i && (
                  <motion.div
                    id={`faq-answer-${i}`}
                    key="answer"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="pb-5 pl-9 text-[13px] leading-relaxed text-slate-400">{f.a}</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </FadeIn>
    </Section>
  );
}
