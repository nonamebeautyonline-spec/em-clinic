"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Section, Label, Title } from "./shared";
import { FadeIn } from "./animations";

/* ═══════════════════════════════════════════════════════════════════════════
   よくあるご質問
   ═══════════════════════════════════════════════════════════════════════════ */

const faqs = [
  { q: "LINE公式アカウントを持っていなくても導入できますか？", a: "はい。導入サポートの一環として、LINE公式アカウントの開設・Messaging APIの設定まで代行いたします。" },
  { q: "保険診療のクリニックでも使えますか？", a: "はい。自由診療・保険診療を問わずご利用いただけます。予約管理・患者CRM・リマインド配信など、診療形態に関わらず活用できます。" },
  { q: "導入にどのくらいの期間がかかりますか？", a: "最短2週間で運用開始が可能です。LINE連携設定・リッチメニュー構築・問診フォーム作成・スタッフ研修まで、導入チームがワンストップでサポートします。" },
  { q: "既存の予約システムや電子カルテとの連携は可能ですか？", a: "連携の可否はシステムによります。API連携・CSV連携など、貴院の既存システムに合わせた連携方法をご提案します。" },
  { q: "スタッフのITリテラシーが低くても運用できますか？", a: "はい。ノーコードのGUI操作で設計されているため、専門知識は不要です。導入時にスタッフ向け操作研修も実施します。" },
  { q: "患者データのセキュリティは大丈夫ですか？", a: "Row-Level Security・管理者認証・セッション管理・SSL/TLS暗号化を実装。個人情報保護法に準拠した運用が可能です。" },
  { q: "契約期間の縛りはありますか？", a: "最低契約期間は6ヶ月です。以降は月単位でのご契約となり、いつでも解約可能です。" },
  { q: "導入後のサポート体制を教えてください。", a: "専任の担当者が初期設定から運用開始後のフォローまで伴走します。LINE配信の企画相談やリッチメニューの改善提案など、運用面でもサポートいたします。" },
  { q: "Lステップなどの汎用LINE配信ツールとの違いは何ですか？", a: "Lステップ・Liny等の汎用ツールは飲食・EC向けに設計されており、医療特有の「問診→予約→診療→処方→フォロー」という導線に対応していません。Lオペ for CLINICは患者CRM・カルテ管理・配送追跡・決済管理までクリニック業務フローに完全特化しており、複数SaaSの費用を1本に集約できます。" },
  { q: "美容クリニックや歯科でも使えますか？", a: "はい。美容クリニック・歯科・皮膚科・内科など、あらゆる診療科でご利用いただけます。カウンセリング予約・定期検診リマインド・処方薬配送など、診療科ごとの業務フローに合わせた活用が可能です。" },
  { q: "既存の電子カルテと連携できますか？", a: "EHR連携機能でCSV/APIによる双方向同期に対応しています。電子カルテの患者データをLオペに取り込み、予約・問診・配信を一元管理できます。連携方法は貴院のシステムに合わせてご提案します。" },
];

/* FAQPage JSON-LD 構造化データ */
const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: {
      "@type": "Answer",
      text: f.a,
    },
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
                <span className="flex items-start gap-3 text-[13px] font-semibold text-slate-700 md:text-[14px]"><span className="mt-0.5 shrink-0 rounded bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">Q</span>{f.q}</span>
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
                    role="region"
                    aria-labelledby={`faq-question-${i}`}
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
