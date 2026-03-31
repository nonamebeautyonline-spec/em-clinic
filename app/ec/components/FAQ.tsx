"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Section, Label, Title } from "./shared";
import { FadeIn } from "./animations";

const faqs = [
  { q: "どのECカートと連携できますか？", a: "Shopify・BASE・STORES・EC-CUBE・MakeShopなど主要ECカートに対応しています。連携方法はAPI連携またはWebhook連携で、プランに応じた設定サポートをご提供します。" },
  { q: "LINE公式アカウントがなくても使えますか？", a: "はい。LINE公式アカウントの開設からMessaging API設定まで、導入サポートの中で代行いたします。" },
  { q: "カゴ落ち対策はどのような仕組みですか？", a: "カートに商品を残したまま一定時間経過した顧客にLINEで自動リマインドを送信します。商品画像付きメッセージやクーポン付きリマインドなど、複数のシナリオを設定可能です。" },
  { q: "既存のLINE公式アカウントの友だちデータは引き継げますか？", a: "はい。既存のLINE公式アカウントと連携するため、友だちリストはそのまま引き継がれます。タグやセグメントの移行サポートも行っています。" },
  { q: "Stripe決済連携とは何ですか？", a: "Stripeでの決済完了をトリガーに、注文確認・発送通知・レビュー依頼などのLINEメッセージを自動配信する機能です。ビジネスプラン以上でご利用いただけます。" },
  { q: "複数店舗の管理は可能ですか？", a: "エンタープライズプランでは、複数店舗・複数ブランドのLINEアカウントを一元管理できます。店舗ごとの配信・分析も個別に対応可能です。" },
  { q: "契約期間の縛りはありますか？", a: "最低契約期間はありません。月額課金で、いつでもプラン変更・解約が可能です。14日間の無料トライアルもご用意しています。" },
  { q: "導入にどれくらいの期間がかかりますか？", a: "最短3日で運用開始可能です。ECカートの種類や必要なカスタマイズの範囲によりますが、初期設定代行サービスを利用すれば、技術的な作業は基本的にすべてお任せいただけます。" },
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
    <Section id="faq" className="bg-gradient-to-b from-[#1a1a2e] to-[#16213e]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <div className="text-center">
        <Label>FAQ</Label>
        <Title>よくあるご質問</Title>
      </div>
      <FadeIn>
        <div className="mx-auto mt-8 max-w-3xl divide-y divide-slate-700/50">
          {faqs.map((f, i) => (
            <div key={i}>
              <button
                className="flex w-full items-center justify-between py-5 text-left"
                onClick={() => setOpenIdx(openIdx === i ? null : i)}
                aria-expanded={openIdx === i}
                aria-controls={`faq-answer-ec-${i}`}
              >
                <span className="flex items-start gap-3 text-[13px] font-semibold text-slate-200 md:text-[14px]">
                  <span className="mt-0.5 shrink-0 rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-400">Q</span>
                  {f.q}
                </span>
                <motion.svg
                  className="ml-3 h-4 w-4 shrink-0 text-slate-500"
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
                    id={`faq-answer-ec-${i}`}
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
