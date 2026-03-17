"use client";

import { Section, Label, Title, Sub } from "./shared";
import { ScaleIn } from "./animations";

/* ═══════════════════════════════════════════════════════════════════════════
   料金プラン — 価格は非公開（問い合わせ後に案内）
   ═══════════════════════════════════════════════════════════════════════════ */

/* JSON-LD 構造化データ（価格非公開） */
const pricingJsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Lオペ for CLINIC",
  description: "LINE公式アカウントを活用したクリニック特化の業務DXプラットフォーム。患者CRM・予約管理・セグメント配信・AI自動返信・決済・配送管理をオールインワンで提供。",
  brand: { "@type": "Brand", name: "Lオペ" },
  provider: { "@type": "Organization", name: "Lオペ for CLINIC", url: "https://l-ope.jp" },
  serviceType: "クリニック向けLINE公式アカウント運用・業務DXサービス",
  areaServed: { "@type": "Country", name: "JP" },
  url: "https://l-ope.jp/lp#pricing",
};

export function Pricing() {
  /* ── 機能プラン ── */
  const funcPlans = [
    { name: "スタンダード", desc: "予約・カルテ・問診まで診療業務をカバー", features: ["LINE配信・CRM", "予約管理・問診", "カルテ・患者管理", "リッチメニュービルダー", "自動リマインド"], pop: true },
    { name: "プロ", desc: "決済・配送・分析まで業務をまるごとDX化", features: ["スタンダードの全機能", "決済管理（Square/GMO）", "配送管理・在庫管理", "D&Dダッシュボード", "売上分析・LTV分析"] },
  ];
  /* ── オプション ── */
  const options = [
    { name: "AI自動返信", desc: "AIがLINE問い合わせに自動返信。スタッフの修正を自動学習し、精度が向上" },
    { name: "音声カルテ", desc: "診察中の会話からSOAP形式のカルテを自動生成" },
    { name: "LINE公式アカウント初期構築", desc: "アカウント開設からMessaging API設定まで代行" },
    { name: "リッチメニュー作成", desc: "貴院に合わせたリッチメニューをデザイン・構築" },
    { name: "データ移行", desc: "既存システムからの患者データ移行をサポート" },
  ];
  return (
    <Section id="pricing" className="bg-gradient-to-b from-white to-blue-50/20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingJsonLd) }}
      />
      <div className="text-center"><Label>PRICING</Label><Title>料金プラン</Title><Sub>貴院の規模・診療科・運用体制に合わせた最適プランをご提案します。まずはお気軽にお問い合わせください。</Sub></div>

      {/* 機能プラン */}
      <div className="mx-auto mt-10 max-w-3xl">
        <h3 className="mb-4 text-center text-[15px] font-bold text-slate-700">機能プラン</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {funcPlans.map((p, i) => (
            <ScaleIn key={p.name} delay={i * 0.08}>
              <div className={`rounded-2xl border-2 bg-white p-6 text-center shadow-sm transition hover:shadow-lg ${p.pop ? "border-blue-500 shadow-blue-100/40 relative" : "border-slate-200"}`}>
                {p.pop && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3 py-0.5 text-[10px] font-bold text-white">人気</span>}
                <h3 className="text-[15px] font-bold text-slate-800">{p.name}</h3>
                <p className="mt-1 text-[11px] text-slate-400">{p.desc}</p>
                <ul className="mt-4 space-y-1.5 text-left">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-[12px] text-slate-600">
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[8px] text-blue-600">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </ScaleIn>
          ))}
        </div>
      </div>

      {/* メッセージ通数 */}
      <div className="mx-auto mt-12 max-w-3xl">
        <h3 className="mb-4 text-center text-[15px] font-bold text-slate-700">メッセージ通数プラン</h3>
        <p className="text-center text-[12px] text-slate-400 mb-4">月間配信量に応じて、5,000通〜1,000,000通まで柔軟に選択可能。大量配信ほどお得な通数単価でご利用いただけます。</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {["5,000通", "30,000通", "100,000通", "1,000,000通"].map((name, i) => (
            <ScaleIn key={name} delay={i * 0.05}>
              <div className={`rounded-xl border bg-white p-4 text-center shadow-sm ${i === 1 ? "border-blue-500 relative" : "border-slate-200"}`}>
                {i === 1 && <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-2 py-0.5 text-[9px] font-bold text-white">人気</span>}
                <div className="text-[13px] font-bold text-slate-800">{name}</div>
              </div>
            </ScaleIn>
          ))}
        </div>
      </div>

      {/* オプション */}
      <div className="mx-auto mt-12 max-w-3xl">
        <h3 className="mb-4 text-center text-[15px] font-bold text-slate-700">オプション</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {options.map((o) => (
            <div key={o.name} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h4 className="text-[13px] font-bold text-slate-800">{o.name}</h4>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{o.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-8 text-[12px] text-slate-400 text-center">※ 料金の詳細は、お問い合わせいただいた後にご案内いたします。</p>

      <div className="mt-8 text-center">
        <a href="#contact" className="inline-block rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 px-10 py-4 text-[13px] font-bold text-white shadow-lg shadow-blue-500/20 transition hover:shadow-xl">料金について問い合わせる</a>
      </div>
    </Section>
  );
}
