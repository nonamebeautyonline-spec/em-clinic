"use client";

import { useState, useMemo } from "react";
import { motion } from "motion/react";
import { Section, Label, Title, Sub } from "./shared";
import { FadeIn, ScaleIn, GradientText } from "./animations";

/* ═══════════════════════════════════════════════════════════════════════════
   料金セクション — スライダー型インタラクティブ料金シミュレーター
   CLINICの3プラン構成とは完全に異なる独自デザイン
   ═══════════════════════════════════════════════════════════════════════════ */

/* JSON-LD 構造化データ */
const pricingJsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Lオペ for LINE",
  description: "LINE公式アカウントの配信・セグメント・リッチメニュー・フォーム・分析を管理できるプラットフォーム。使用料0円、メッセージ従量課金。",
  brand: { "@type": "Brand", name: "Lオペ for LINE" },
  provider: { "@type": "Organization", name: "Lオペ for LINE", url: "https://l-ope.jp" },
  serviceType: "LINE公式アカウント運用プラットフォーム",
  areaServed: { "@type": "Country", name: "JP" },
  url: "https://l-ope.jp/line#pricing",
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Lオペ for LINE料金体系",
    itemListElement: [
      { "@type": "Offer", name: "基本利用料", price: "0", priceCurrency: "JPY", description: "使用料0円・全機能利用可能" },
      { "@type": "Offer", name: "メッセージ配信", price: "0", priceCurrency: "JPY", description: "従量課金制・1通あたりの料金" },
      { "@type": "Offer", name: "AIオプション", priceCurrency: "JPY", description: "AI自動返信・AI分析等のオプション機能" },
    ],
  },
};

/* 料金テーブル — 従量課金 */
function calcMonthlyPrice(messages: number): number {
  if (messages <= 5000) return 0;
  let total = 0;
  let remaining = messages;
  // 〜5,000通: 無料
  remaining -= 5000;
  // 5,001〜15,000通: 3.0円
  const tier2 = Math.min(remaining, 10000);
  total += tier2 * 3.0;
  remaining -= tier2;
  // 15,001〜45,000通: 2.5円
  const tier3 = Math.min(remaining, 30000);
  total += tier3 * 2.5;
  remaining -= tier3;
  // 45,001通〜: 2.0円
  if (remaining > 0) total += remaining * 2.0;
  return Math.round(total);
}

const sliderSteps = [1000, 3000, 5000, 10000, 15000, 25000, 45000, 70000, 100000];

const aiOptions = [
  { id: "ai-reply", name: "AI自動返信", price: 5500, desc: "AIが自動で最適な返信を生成・学習" },
  { id: "ai-analytics", name: "AI分析レポート", price: 3300, desc: "配信効果をAIが自動分析・改善提案" },
  { id: "ai-scenario", name: "AIシナリオ生成", price: 3300, desc: "最適な配信シナリオをAIが自動設計" },
];

const includedFeatures = [
  "セグメント配信",
  "シナリオ配信",
  "リッチメニュー管理",
  "予約管理",
  "フォーム作成",
  "分析ダッシュボード",
  "チャットサポート",
  "友だちCRM",
];

export function Pricing() {
  const [messageCount, setMessageCount] = useState(5000);
  const [enabledAI, setEnabledAI] = useState<Set<string>>(new Set());

  const messageCost = useMemo(() => calcMonthlyPrice(messageCount), [messageCount]);
  const aiCost = useMemo(() => {
    let total = 0;
    enabledAI.forEach((id) => {
      const opt = aiOptions.find((o) => o.id === id);
      if (opt) total += opt.price;
    });
    return total;
  }, [enabledAI]);
  const totalCost = messageCost + aiCost;

  const toggleAI = (id: string) => {
    setEnabledAI((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /* スライダーのステップ位置を計算 */
  const sliderIndex = sliderSteps.findIndex((s) => s >= messageCount);
  const sliderPercent = ((sliderIndex === -1 ? sliderSteps.length - 1 : sliderIndex) / (sliderSteps.length - 1)) * 100;

  return (
    <Section id="pricing" className="bg-gradient-to-b from-slate-50/30 to-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingJsonLd) }}
      />
      <div className="text-center">
        <Label>PRICING</Label>
        <Title>料金シミュレーター</Title>
        <Sub>使用料0円、メッセージ従量課金のシンプルな料金体系。<br />スライダーで配信数を選んで、月額料金をシミュレーションできます。</Sub>
      </div>

      <FadeIn>
        <div className="mx-auto max-w-4xl">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/30">
            {/* ヘッダー: 合計金額 */}
            <div className="bg-gradient-to-r from-[#06C755] to-[#00B900] px-8 py-8 text-center text-white">
              <div className="text-[13px] font-semibold text-white/80">月額料金（税込）</div>
              <motion.div
                key={totalCost}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="mt-2 flex items-baseline justify-center gap-1"
              >
                <span className="text-[11px] text-white/70">&#165;</span>
                <span className="text-5xl font-black md:text-6xl">{totalCost.toLocaleString()}</span>
                <span className="text-[14px] text-white/70">/月</span>
              </motion.div>
              <div className="mt-2 flex items-center justify-center gap-3 text-[11px] text-white/70">
                <span>基本料: &#165;0</span>
                <span className="h-3 w-px bg-white/20" />
                <span>配信: &#165;{messageCost.toLocaleString()}</span>
                <span className="h-3 w-px bg-white/20" />
                <span>AI: &#165;{aiCost.toLocaleString()}</span>
              </div>
            </div>

            <div className="p-6 md:p-8">
              {/* 配信数スライダー */}
              <div className="mb-8">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-[15px] font-bold text-slate-800">月間配信数</h3>
                  <div className="rounded-lg bg-[#06C755]/10 px-3 py-1.5">
                    <span className="text-[18px] font-black text-[#06C755]">{messageCount.toLocaleString()}</span>
                    <span className="ml-1 text-[12px] text-[#06C755]/70">通</span>
                  </div>
                </div>

                <div className="relative px-1">
                  {/* カスタムスライダートラック */}
                  <div className="relative h-3 rounded-full bg-slate-100">
                    <motion.div
                      className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-[#06C755] to-[#00B900]"
                      style={{ width: `${sliderPercent}%` }}
                      layout
                      transition={{ duration: 0.2 }}
                    />
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={sliderSteps.length - 1}
                    value={sliderIndex === -1 ? sliderSteps.length - 1 : sliderIndex}
                    onChange={(e) => setMessageCount(sliderSteps[parseInt(e.target.value)])}
                    className="absolute inset-0 h-3 w-full cursor-pointer opacity-0"
                    aria-label="月間配信数"
                  />
                </div>

                {/* 目盛りラベル */}
                <div className="mt-2 flex justify-between text-[9px] text-slate-300">
                  <span>1千</span>
                  <span>5千</span>
                  <span>1.5万</span>
                  <span>4.5万</span>
                  <span>10万</span>
                </div>

                {/* 料金テーブル */}
                <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
                  {[
                    { range: "〜5,000通", price: "無料", active: messageCount <= 5000 },
                    { range: "〜15,000通", price: "3.0円/通", active: messageCount > 5000 && messageCount <= 15000 },
                    { range: "〜45,000通", price: "2.5円/通", active: messageCount > 15000 && messageCount <= 45000 },
                    { range: "45,001通〜", price: "2.0円/通", active: messageCount > 45000 },
                  ].map((tier) => (
                    <div
                      key={tier.range}
                      className={`rounded-xl border px-3 py-2.5 text-center transition ${
                        tier.active
                          ? "border-[#06C755]/30 bg-[#06C755]/5"
                          : "border-slate-100 bg-slate-50/50"
                      }`}
                    >
                      <div className={`text-[11px] font-semibold ${tier.active ? "text-[#06C755]" : "text-slate-400"}`}>{tier.range}</div>
                      <div className={`mt-0.5 text-[13px] font-bold ${tier.active ? "text-[#06C755]" : "text-slate-500"}`}>{tier.price}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* AIオプション トグル */}
              <div className="mb-8 border-t border-slate-100 pt-6">
                <h3 className="mb-4 text-[15px] font-bold text-slate-800">AIオプション（追加課金）</h3>
                <div className="space-y-3">
                  {aiOptions.map((opt) => {
                    const enabled = enabledAI.has(opt.id);
                    return (
                      <button
                        key={opt.id}
                        onClick={() => toggleAI(opt.id)}
                        className={`flex w-full items-center gap-4 rounded-xl border px-4 py-3.5 text-left transition ${
                          enabled
                            ? "border-[#06C755]/30 bg-[#06C755]/5"
                            : "border-slate-100 bg-white hover:border-slate-200"
                        }`}
                      >
                        {/* トグル */}
                        <div className={`relative h-6 w-11 shrink-0 rounded-full transition ${enabled ? "bg-[#06C755]" : "bg-slate-200"}`}>
                          <motion.div
                            className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm"
                            animate={{ left: enabled ? "calc(100% - 22px)" : "2px" }}
                            transition={{ duration: 0.2 }}
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-bold text-slate-700">{opt.name}</span>
                            <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[9px] font-semibold text-violet-600">AI</span>
                          </div>
                          <div className="mt-0.5 text-[11px] text-slate-400">{opt.desc}</div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="text-[15px] font-bold text-slate-800">&#165;{opt.price.toLocaleString()}</div>
                          <div className="text-[10px] text-slate-400">/月</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 含まれる機能一覧 */}
              <div className="border-t border-slate-100 pt-6">
                <h3 className="mb-4 text-[13px] font-bold text-slate-600">基本料&#165;0で含まれる機能</h3>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  {includedFeatures.map((f) => (
                    <div key={f} className="flex items-center gap-2 text-[12px] text-slate-500">
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#06C755]/10 text-[8px] text-[#06C755]">&#10003;</span>
                      {f}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </FadeIn>

      <p className="mt-10 text-center text-[12px] text-slate-400">※ 税込表記。AIオプションは単体でも組み合わせでもご利用いただけます。</p>
    </Section>
  );
}
