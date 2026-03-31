"use client";

import { Section, Label, Title, Sub } from "./shared";
import { ScaleIn } from "./animations";

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
    <Section id="pricing" className="bg-gradient-to-b from-white to-stone-50/40">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingJsonLd) }}
      />
      <div className="text-center"><Label>PRICING</Label><Title>料金プラン</Title><Sub>事業規模に合わせた3つのプランをご用意。<br />すべてのプランで14日間の無料トライアルをご利用いただけます。</Sub></div>

      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((p, i) => (
          <ScaleIn key={p.name} delay={i * 0.08}>
            <div className={`relative flex h-full flex-col rounded-2xl border-2 bg-white p-7 shadow-sm ${
              p.popular ? "border-amber-600 shadow-amber-100/40" : "border-slate-200"
            }`}>
              {p.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-stone-700 to-amber-700 px-4 py-1 text-[11px] font-bold text-white shadow-sm">人気No.1</span>
              )}
              <div className="mb-6 text-center">
                <h3 className="text-[14px] font-bold text-slate-500">{p.name}プラン</h3>
                <div className="mt-3">
                  <span className="text-[11px] text-slate-400">月額</span>
                  <span className="ml-1 text-4xl font-extrabold text-slate-900">¥{p.price}</span>
                </div>
                <p className="mt-2 text-[12px] text-slate-400">{p.desc}</p>
              </div>
              <div className="flex-1 space-y-3">
                {p.features.map((f) => (
                  <div key={f} className="flex items-center gap-2 text-[13px] text-slate-600">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-100 text-[8px] text-amber-600">&#10003;</span>
                    {f}
                  </div>
                ))}
              </div>
              <a
                href="/ec/contact"
                className={`mt-6 block rounded-xl py-3 text-center text-[13px] font-bold transition ${
                  p.popular
                    ? "bg-gradient-to-r from-stone-700 to-amber-700 text-white shadow-lg shadow-stone-500/20 hover:shadow-xl"
                    : "bg-slate-100 text-slate-700 hover:bg-amber-50 hover:text-amber-700"
                }`}
              >
                事前登録はこちら
              </a>
            </div>
          </ScaleIn>
        ))}
      </div>

      <p className="mt-10 text-center text-[12px] text-slate-400">※ 税込表記。14日間の無料トライアル期間あり。契約期間の縛りはありません。</p>
      <p className="mt-2 text-center text-[12px] font-semibold text-yellow-700">※ リリース時の料金です。事前登録で割引あり。</p>
    </Section>
  );
}
