"use client";

import { motion } from "motion/react";
import { Section, Label, Title, Sub, ComingSoonBadge } from "./shared";
import { ScaleIn, FadeIn, GlowBorder, Shimmer } from "./animations";

/* ═══════════════════════════════════════════════════════════════════════════
   料金プラン — ローズゴールドアクセントのエレガントなデザイン
   Coming Soon表示を美しく組み込み
   ═══════════════════════════════════════════════════════════════════════════ */

/* JSON-LD 構造化データ */
const pricingJsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Lオペ for SALON",
  description: "サロン向けLINE公式アカウント運用プラットフォーム。予約管理・顧客管理・配信・スタンプカード・物販をオールインワンで提供。",
  brand: { "@type": "Brand", name: "Lオペ for SALON" },
  provider: { "@type": "Organization", name: "Lオペ", url: "https://l-ope.jp" },
  serviceType: "サロン向けLINE運用プラットフォーム",
  areaServed: { "@type": "Country", name: "JP" },
  url: "https://l-ope.jp/salon#pricing",
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Lオペ for SALON 料金プラン",
    itemListElement: [
      { "@type": "Offer", name: "ライトプラン", price: "9800", priceCurrency: "JPY", description: "月額9,800円・基本機能" },
      { "@type": "Offer", name: "スタンダードプラン", price: "19800", priceCurrency: "JPY", description: "月額19,800円・全機能+ホットペッパー連携" },
      { "@type": "Offer", name: "プレミアムプラン", price: "39800", priceCurrency: "JPY", description: "月額39,800円・複数店舗対応+API連携" },
    ],
  },
};

const plans = [
  {
    name: "ライト",
    price: "9,800",
    desc: "小規模サロン・まず試したい方に",
    popular: false,
    gradient: "from-slate-100 to-slate-50",
    borderColor: "border-slate-200",
    features: [
      "予約管理（LINE予約）",
      "顧客管理・来店履歴",
      "セグメント配信（月3,000通まで）",
      "リッチメニュー管理",
      "スタンプカード",
      "チャットサポート",
    ],
  },
  {
    name: "スタンダード",
    price: "19,800",
    desc: "成長中のサロンにおすすめ",
    popular: true,
    gradient: "from-pink-50 to-rose-50",
    borderColor: "border-pink-300",
    features: [
      "ライトプランの全機能",
      "ホットペッパー連携（予定）",
      "セグメント配信（月10,000通まで）",
      "物販・EC機能",
      "配信分析ダッシュボード",
      "専任サポート担当",
    ],
  },
  {
    name: "プレミアム",
    price: "39,800",
    desc: "複数店舗・本格運用の方に",
    popular: false,
    gradient: "from-slate-100 to-slate-50",
    borderColor: "border-slate-200",
    features: [
      "スタンダードプランの全機能",
      "複数店舗管理",
      "セグメント配信（無制限）",
      "API連携",
      "カスタムレポート",
      "導入・運用コンサルティング",
    ],
  },
];

export function Pricing() {
  return (
    <Section id="pricing" className="relative overflow-hidden bg-gradient-to-b from-white via-pink-50/10 to-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingJsonLd) }}
      />

      <div className="text-center">
        <Label>PRICING</Label>
        <Title>料金プラン</Title>
        <Sub>
          サロンの規模に合わせた3つのプラン。
          <br />
          すべて初期費用なし・月額固定で安心。
        </Sub>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan, i) => (
          <ScaleIn key={plan.name} delay={i * 0.1}>
            {plan.popular ? (
              <GlowBorder className="h-full">
                <PlanCard plan={plan} />
              </GlowBorder>
            ) : (
              <PlanCard plan={plan} />
            )}
          </ScaleIn>
        ))}
      </div>

      {/* 準備中バナー */}
      <FadeIn className="mt-12">
        <div className="mx-auto max-w-xl rounded-2xl border border-pink-200/60 bg-gradient-to-r from-pink-50/80 via-white to-rose-50/80 p-6 text-center shadow-sm">
          <ComingSoonBadge className="mb-3" />
          <p className="text-[14px] font-semibold text-slate-700">2026年夏リリース予定</p>
          <p className="mt-1 text-[12px] text-slate-400">事前登録で早期割引をご案内いたします</p>
        </div>
      </FadeIn>

      <p className="mt-8 text-center text-[12px] text-slate-400">
        ※ 税込表記。すべてのプランに初期費用なし・最低契約期間1ヶ月。
      </p>
    </Section>
  );
}

function PlanCard({ plan }: { plan: typeof plans[number] }) {
  return (
    <div
      className={`relative flex h-full flex-col rounded-2xl border-2 bg-gradient-to-b ${plan.gradient} p-7 ${plan.borderColor} ${
        plan.popular ? "" : "shadow-sm"
      }`}
    >
      {plan.popular && (
        <Shimmer className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-pink-500 via-rose-400 to-fuchsia-400 px-5 py-1.5 text-[11px] font-bold text-white shadow-lg shadow-pink-500/25">
          おすすめ
        </Shimmer>
      )}

      <div className="mb-6 text-center">
        <h3 className="text-[15px] font-bold text-slate-800">{plan.name}プラン</h3>
        <div className="mt-3">
          <span className="text-[11px] text-slate-400">月額</span>
          <span className={`ml-1 text-4xl font-extrabold ${plan.popular ? "bg-gradient-to-r from-pink-500 to-rose-400 bg-clip-text text-transparent" : "text-slate-900"}`}>
            {plan.price}
          </span>
          <span className="ml-1 text-[14px] text-slate-400">円</span>
        </div>
        <p className="mt-2 text-[12px] text-slate-400">{plan.desc}</p>
      </div>

      <div className="flex-1 space-y-3">
        {plan.features.map((f) => (
          <div key={f} className="flex items-center gap-2 text-[13px] text-slate-600">
            <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
              plan.popular ? "bg-pink-100 text-pink-600" : "bg-slate-200 text-slate-500"
            } text-[8px]`}>
              &#10003;
            </span>
            {f}
          </div>
        ))}
      </div>

      <motion.div
        className={`mt-6 block rounded-xl py-3.5 text-center text-[13px] font-bold transition ${
          plan.popular
            ? "bg-gradient-to-r from-pink-500 via-rose-400 to-fuchsia-400 text-white shadow-lg shadow-pink-500/20"
            : "bg-slate-100 text-slate-500"
        }`}
        whileHover={plan.popular ? { scale: 1.02 } : {}}
      >
        準備中
      </motion.div>
    </div>
  );
}
