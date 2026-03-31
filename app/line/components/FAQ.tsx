"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Section, Label, Title } from "./shared";
import { FadeIn, StaggerChildren, StaggerItem } from "./animations";

/* ═══════════════════════════════════════════════════════════════════════════
   FAQ — アコーディオン + LINE緑アクセント
   ═══════════════════════════════════════════════════════════════════════════ */

const faqs = [
  { q: "LINE公式アカウントがなくても使えますか？", a: "はい。LINE公式アカウントの開設がまだの場合も、導入サポートの中でアカウント開設からMessaging API設定まで代行いたします。" },
  { q: "どんな業種で使えますか？", a: "飲食店・美容サロン・EC・不動産・教育・士業など、LINE公式アカウントを運用するあらゆる業種でご利用いただけます。業種に特化したテンプレートもご用意しています。" },
  { q: "無料で使い続けることはできますか？", a: "はい。月間5,000通までの配信は無料です。5,000通以内であれば、すべての機能を期間制限なく無料でご利用いただけます。" },
  { q: "Lステップやエルメとの違いは何ですか？", a: "Lオペ for LINEはセグメント配信・シナリオ配信・リッチメニュー・予約管理・フォーム・分析ダッシュボードをオールインワンで提供。使用料0円の従量課金制で、複数ツールの併用が不要になり、運用コストと管理工数を大幅に削減できます。" },
  { q: "既存のLINE公式アカウントの友だちデータは引き継げますか？", a: "はい。既存のLINE公式アカウントと連携するため、友だちリストはそのまま引き継がれます。タグやセグメントの移行サポートも行っています。" },
  { q: "契約期間の縛りはありますか？", a: "ありません。いつでも利用停止が可能で、最低契約期間の縛りはありません。" },
  { q: "セキュリティ対策について教えてください。", a: "SSL暗号化通信・データの暗号化保存・アクセス権限管理・監査ログ機能を標準搭載。個人情報保護法に準拠した運用体制を構築しています。" },
  { q: "導入にどのくらいの時間がかかりますか？", a: "最短3日で運用開始が可能です。LINE公式アカウントの連携、リッチメニュー・シナリオの初期構築まで、サポートチームが代行いたします。" },
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
    <Section id="faq" className="bg-gradient-to-b from-white to-slate-50/50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <div className="text-center">
        <Label>FAQ</Label>
        <Title>よくあるご質問</Title>
      </div>

      <FadeIn>
        <div className="mx-auto mt-10 max-w-3xl">
          <StaggerChildren className="space-y-3">
            {faqs.map((f, i) => (
              <StaggerItem key={i}>
                <div className={`overflow-hidden rounded-xl border transition ${openIdx === i ? "border-[#06C755]/30 bg-[#06C755]/[0.02] shadow-sm" : "border-slate-100 bg-white hover:border-slate-200"}`}>
                  <button
                    className="flex w-full items-center justify-between px-6 py-5 text-left"
                    onClick={() => setOpenIdx(openIdx === i ? null : i)}
                    aria-expanded={openIdx === i}
                    aria-controls={`faq-answer-${i}`}
                  >
                    <span className="flex items-start gap-3 text-[13px] font-semibold text-slate-700 md:text-[14px]">
                      <span className={`mt-0.5 shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold transition ${openIdx === i ? "bg-[#06C755] text-white" : "bg-[#06C755]/10 text-[#06C755]"}`}>Q</span>
                      {f.q}
                    </span>
                    <motion.div
                      className={`ml-3 flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition ${openIdx === i ? "bg-[#06C755] text-white" : "bg-slate-100 text-slate-400"}`}
                      animate={{ rotate: openIdx === i ? 180 : 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden="true">
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
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="px-6 pb-5 pl-[52px] text-[13px] leading-relaxed text-slate-500">{f.a}</div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </StaggerItem>
            ))}
          </StaggerChildren>
        </div>
      </FadeIn>
    </Section>
  );
}
