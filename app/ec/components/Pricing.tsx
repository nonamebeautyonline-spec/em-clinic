"use client";

import { motion } from "motion/react";
import { Section, Label, Title, Sub, ComingSoonBadge } from "./shared";
import { ScaleIn, GoldShimmer } from "./animations";

/* JSON-LD 構造化データ */
const pricingJsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Lオペ for EC",
  description: "EC・小売向けLINE公式アカウント運用プラットフォーム。カゴ落ち対策・発送通知・CRM・セグメント配信・クーポン管理をオールインワンで。",
  brand: { "@type": "Brand", name: "Lオペ for EC" },
  provider: { "@type": "Organization", name: "Lオペ", url: "https://l-ope.jp" },
  serviceType: "EC向けLINE運用プラットフォーム",
  areaServed: { "@type": "Country", name: "JP" },
  url: "https://l-ope.jp/ec#pricing",
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Lオペ for EC 料金プラン",
    itemListElement: [
      { "@type": "Offer", name: "スタートプラン", price: "9800", priceCurrency: "JPY", description: "月額9,800円・基本機能" },
      { "@type": "Offer", name: "ビジネスプラン", price: "24800", priceCurrency: "JPY", description: "月額24,800円・全機能+Stripe連携" },
      { "@type": "Offer", name: "エンタープライズプラン", price: "49800", priceCurrency: "JPY", description: "月額49,800円・複数店舗+API連携+専任担当" },
    ],
  },
};

const plans = [
  {
    name: "スタート",
    price: "9,800",
    desc: "まずはLINE運用を始めたいEC事業者様に",
    popular: false,
    features: [
      "セグメント配信",
      "カゴ落ち対策（基本）",
      "発送通知",
      "顧客CRM",
      "分析ダッシュボード",
      "リッチメニュー管理",
      "メールサポート",
    ],
  },
  {
    name: "ビジネス",
    price: "24,800",
    desc: "売上拡大を本格化したいEC事業者様に",
    popular: true,
    features: [
      "スタートプランの全機能",
      "カゴ落ち対策（高度）",
      "Stripe決済連携",
      "クーポン・ポイント管理",
      "RFM分析",
      "A/Bテスト配信",
      "チャットサポート（平日10-19時）",
    ],
  },
  {
    name: "エンタープライズ",
    price: "49,800",
    desc: "複数店舗・大規模ECを運営する事業者様に",
    popular: false,
    features: [
      "ビジネスプランの全機能",
      "複数店舗管理",
      "API連携（カスタム）",
      "専任担当者",
      "月次レポート・改善提案",
      "導入・移行の全面サポート",
      "SLA保証",
    ],
  },
];

export function Pricing() {
  return (
    <Section id="pricing" className="bg-slate-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingJsonLd) }}
      />
      <div className="text-center">
        <Label>PRICING</Label>
        <Title>料金プラン</Title>
        <Sub>事業規模に合わせた3つのプランをご用意。<br />すべてのプランで14日間の無料トライアルをご利用いただけます。</Sub>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((p, i) => (
          <ScaleIn key={p.name} delay={i * 0.08}>
            <div className={`relative flex h-full flex-col rounded-2xl border-2 p-7 ${
              p.popular
                ? "border-amber-500/50 bg-gradient-to-b from-amber-500/5 to-white shadow-lg shadow-amber-500/10"
                : "border-slate-200 bg-white"
            }`}>
              {p.popular && (
                <GoldShimmer className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-1.5 text-[11px] font-bold text-white shadow-lg shadow-amber-500/30">人気No.1</span>
                </GoldShimmer>
              )}

              <div className="mb-6 text-center">
                <h3 className="text-[14px] font-bold text-slate-500">{p.name}プラン</h3>
                <div className="mt-3">
                  <span className="text-[11px] text-slate-400">月額</span>
                  <span className={`ml-1 text-4xl font-extrabold ${p.popular ? "bg-gradient-to-r from-amber-500 to-yellow-500 bg-clip-text text-transparent" : "text-slate-900"}`}>
                    &yen;{p.price}
                  </span>
                </div>
                <p className="mt-2 text-[12px] text-slate-400">{p.desc}</p>
              </div>

              <div className="flex-1 space-y-3">
                {p.features.map((f) => (
                  <div key={f} className="flex items-center gap-2 text-[13px] text-slate-600">
                    <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[8px] ${p.popular ? "bg-amber-500/20 text-amber-600" : "bg-slate-100 text-slate-400"}`}>&#10003;</span>
                    {f}
                  </div>
                ))}
              </div>

              <a
                href="/ec/contact"
                className={`mt-6 block rounded-xl py-3 text-center text-[13px] font-bold transition ${
                  p.popular
                    ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/20 hover:shadow-xl hover:shadow-amber-500/30"
                    : "bg-slate-100 text-slate-600 hover:bg-amber-500/10 hover:text-amber-600"
                }`}
              >
                事前登録はこちら
              </a>
            </div>
          </ScaleIn>
        ))}
      </div>

      {/* Coming Soonと注釈 */}
      <div className="mt-10 flex flex-col items-center gap-3">
        <ComingSoonBadge size="default" />
        <p className="text-center text-[12px] text-slate-400">※ 税込表記。14日間の無料トライアル期間あり。契約期間の縛りはありません。</p>
        <p className="text-center text-[12px] font-semibold text-amber-600/70">※ リリース時の料金です。事前登録で割引あり。</p>
      </div>
    </Section>
  );
}
