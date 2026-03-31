"use client";

import { Section, Label, Title, Sub } from "./shared";
import { ScaleIn } from "./animations";

/* JSON-LD 構造化データ */
const pricingJsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Lオペ",
  description: "LINE公式アカウントの配信・セグメント・リッチメニュー・フォーム・分析を管理できるプラットフォーム。使用料0円、メッセージ従量課金。",
  brand: { "@type": "Brand", name: "Lオペ" },
  provider: { "@type": "Organization", name: "Lオペ", url: "https://l-ope.jp" },
  serviceType: "LINE公式アカウント運用プラットフォーム",
  areaServed: { "@type": "Country", name: "JP" },
  url: "https://l-ope.jp/line#pricing",
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Lオペ料金体系",
    itemListElement: [
      { "@type": "Offer", name: "基本利用料", price: "0", priceCurrency: "JPY", description: "使用料0円・全機能利用可能" },
      { "@type": "Offer", name: "メッセージ配信", price: "0", priceCurrency: "JPY", description: "従量課金制・1通あたりの料金" },
      { "@type": "Offer", name: "AIオプション", priceCurrency: "JPY", description: "AI自動返信・AI分析等のオプション機能" },
    ],
  },
};

const messagePricing = [
  { range: "〜5,000通/月", price: "無料", note: "お試し利用に" },
  { range: "5,001〜15,000通", price: "¥3.0/通", note: "" },
  { range: "15,001〜45,000通", price: "¥2.5/通", note: "" },
  { range: "45,001通〜", price: "¥2.0/通", note: "大量配信ほどお得" },
];

const aiOptions = [
  { name: "AI自動返信", price: "¥5,500", unit: "/月", desc: "AIが自動で最適な返信を生成・学習" },
  { name: "AI分析レポート", price: "¥3,300", unit: "/月", desc: "配信効果をAIが自動分析・改善提案" },
  { name: "AIシナリオ生成", price: "¥3,300", unit: "/月", desc: "最適な配信シナリオをAIが自動設計" },
];

export function Pricing() {
  return (
    <Section id="pricing" className="bg-gradient-to-b from-white to-emerald-50/20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingJsonLd) }}
      />
      <div className="text-center"><Label>PRICING</Label><Title>料金体系</Title><Sub>使用料0円、メッセージ従量課金のシンプルな料金体系。<br />必要な分だけ、使った分だけお支払い。</Sub></div>

      {/* 基本料金 */}
      <div className="mx-auto max-w-2xl">
        <ScaleIn>
          <div className="rounded-2xl border-2 border-[#06C755] bg-white p-8 shadow-sm shadow-emerald-100/40">
            <div className="mb-6 text-center">
              <span className="rounded-full bg-emerald-50 px-4 py-1 text-[11px] font-bold text-[#06C755]">基本利用料</span>
              <div className="mt-4">
                <span className="text-5xl font-extrabold text-slate-900">0</span>
                <span className="ml-1 text-xl text-slate-400">円</span>
              </div>
              <p className="mt-2 text-[13px] text-slate-400">全機能利用可能・初期費用なし</p>
            </div>
            <div className="space-y-3">
              {["セグメント配信", "シナリオ配信", "リッチメニュー管理", "フォーム作成", "分析ダッシュボード", "チャットサポート"].map((f) => (
                <div key={f} className="flex items-center gap-2 text-[13px] text-slate-600">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[8px] text-[#06C755]">&#10003;</span>
                  {f}
                </div>
              ))}
            </div>
          </div>
        </ScaleIn>
      </div>

      {/* メッセージ従量課金 */}
      <div className="mx-auto mt-12 max-w-2xl">
        <h3 className="mb-6 text-center text-[18px] font-bold text-slate-800">メッセージ配信料金（従量課金）</h3>
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-[14px]">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-5 py-3 text-left font-semibold text-slate-600">月間配信数</th>
                <th className="px-5 py-3 text-center font-semibold text-slate-600">単価</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {messagePricing.map((m) => (
                <tr key={m.range} className="hover:bg-slate-50/50">
                  <td className="px-5 py-3 text-slate-700">{m.range}{m.note && <span className="ml-2 text-[11px] text-emerald-600">{m.note}</span>}</td>
                  <td className="px-5 py-3 text-center font-bold text-slate-900">{m.price}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* AIオプション */}
      <div className="mx-auto mt-12 max-w-3xl">
        <h3 className="mb-6 text-center text-[18px] font-bold text-slate-800">AIオプション（追加課金）</h3>
        <div className="grid gap-4 md:grid-cols-3">
          {aiOptions.map((o, i) => (
            <ScaleIn key={o.name} delay={i * 0.08}>
              <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5 transition hover:shadow-md">
                <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-[14px]">🤖</div>
                <h4 className="text-[14px] font-bold text-slate-800">{o.name}</h4>
                <p className="mt-1 flex-1 text-[12px] text-slate-400">{o.desc}</p>
                <div className="mt-3">
                  <span className="text-xl font-extrabold text-slate-900">{o.price}</span>
                  <span className="text-[12px] text-slate-400">{o.unit}</span>
                </div>
              </div>
            </ScaleIn>
          ))}
        </div>
      </div>

      <p className="mt-10 text-center text-[12px] text-slate-400">※ 税込表記。AIオプションは単体でも組み合わせでもご利用いただけます。</p>
    </Section>
  );
}
