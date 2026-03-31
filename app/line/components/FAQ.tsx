"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Section, Label, Title } from "./shared";
import { FadeIn } from "./animations";

const faqs = [
  { q: "LINE公式アカウントがなくても使えますか？", a: "はい。LINE公式アカウントの開設がまだの場合も、導入サポートの中でアカウント開設からMessaging API設定まで代行いたします。" },
  { q: "どんな業種で使えますか？", a: "飲食店・美容サロン・EC・不動産・教育・士業など、LINE公式アカウントを運用するあらゆる業種でご利用いただけます。業種に特化したテンプレートもご用意しています。" },
  { q: "フリープランからスタンダードへのアップグレードはいつでもできますか？", a: "はい。管理画面からいつでもプラン変更が可能です。アップグレードは即時反映、ダウングレードは次月から適用されます。" },
  { q: "Lステップやエルメとの違いは何ですか？", a: "Lオペはセグメント配信・シナリオ配信・リッチメニュー・予約管理・フォーム・分析ダッシュボードをオールインワンで提供。複数ツールの併用が不要になり、運用コストと管理工数を大幅に削減できます。" },
  { q: "既存のLINE公式アカウントの友だちデータは引き継げますか？", a: "はい。既存のLINE公式アカウントと連携するため、友だちリストはそのまま引き継がれます。タグやセグメントの移行サポートも行っています。" },
  { q: "契約期間の縛りはありますか？", a: "フリープランは期間制限なし。有料プランの最低契約期間は1ヶ月で、いつでも解約・プラン変更が可能です。" },
  { q: "セキュリティ対策について教えてください。", a: "SSL暗号化通信・データの暗号化保存・アクセス権限管理・監査ログ機能を標準搭載。個人情報保護法に準拠した運用体制を構築しています。" },
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
                <span className="flex items-start gap-3 text-[13px] font-semibold text-slate-700 md:text-[14px]"><span className="mt-0.5 shrink-0 rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Q</span>{f.q}</span>
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
