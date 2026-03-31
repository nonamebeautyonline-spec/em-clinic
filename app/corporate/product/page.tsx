"use client";

import Link from "next/link";
import TextReveal from "../components/TextReveal";
import ScrollReveal from "../components/ScrollReveal";
import TiltCard from "../components/TiltCard";
import TextScramble from "../components/TextScramble";

/* ── サービス定義 ── */
const PRODUCTS = [
  {
    name: "Lオペ",
    desc: "LINE公式アカウントの高度な運用・自動化プラットフォーム",
    color: "#06C755",
    href: "/line/",
    status: "production" as const,
    features: [
      { label: "セグメント配信", desc: "属性・行動データに基づくターゲット配信" },
      { label: "自動応答", desc: "キーワード・AIによる24時間自動対応" },
      { label: "リッチメニュー", desc: "ユーザー別に出し分け可能な動的メニュー" },
      { label: "CRM", desc: "顧客情報の一元管理とタグ運用" },
    ],
  },
  {
    name: "Lオペ for CLINIC",
    desc: "クリニック特化のLINE運用プラットフォーム。予約・問診・決済・CRMをLINEに統合",
    color: "#3b82f6",
    href: "/clinic/",
    status: "production" as const,
    features: [
      { label: "予約管理", desc: "LINE上で予約の受付・変更・リマインドを自動化" },
      { label: "Web問診", desc: "来院前にLINEで問診を完了、待ち時間ゼロ" },
      { label: "オンライン診療", desc: "LINEビデオ通話で場所を選ばない診療体験" },
      { label: "決済", desc: "クレジット・銀行振込をLINE内で完結" },
      { label: "CRM", desc: "患者情報の一元管理とセグメント配信" },
      { label: "電子カルテ", desc: "SOAP形式、テンプレート、写真管理" },
      { label: "自動返信", desc: "患者メッセージに24時間自動対応" },
      { label: "アナリティクス", desc: "売上・患者動向をリアルタイム可視化" },
    ],
  },
  {
    name: "Lオペ for SALON",
    desc: "美容サロン・エステ向けのLINE予約・顧客管理プラットフォーム",
    color: "#ec4899",
    href: "/salon/",
    status: "coming" as const,
    features: [
      { label: "予約管理", desc: "スタイリスト別・メニュー別のLINE予約" },
      { label: "顧客カルテ", desc: "施術履歴・好みを記録し接客品質を向上" },
      { label: "リマインド", desc: "来店前日の自動通知で無断キャンセル防止" },
      { label: "リピート促進", desc: "来店周期に合わせた自動フォロー配信" },
    ],
  },
  {
    name: "Lオペ for EC",
    desc: "EC・小売向けのLINE CRM・販促プラットフォーム",
    color: "#8B7355",
    href: "/ec/",
    status: "coming" as const,
    features: [
      { label: "注文通知", desc: "購入・発送・配達をLINEでリアルタイム通知" },
      { label: "カゴ落ち防止", desc: "未購入ユーザーへの自動リマインド配信" },
      { label: "レビュー促進", desc: "購入後の自動レビュー依頼でUGCを増加" },
      { label: "LTV向上", desc: "購買データに基づくパーソナライズ配信" },
    ],
  },
];

export default function ProductPage() {
  return (
    <div className="pt-[72px]">
      {/* ── ヒーロー ── */}
      <section className="px-6 py-28 md:px-16 md:py-44">
        <div className="mx-auto max-w-7xl">
          <span className="inline-flex items-center gap-3 text-[11px] font-medium tracking-[0.3em] text-slate-400">
            <span className="h-px w-8 bg-slate-300" />
            Product
          </span>
          <div className="mt-8">
            <TextReveal as="h1" className="text-4xl font-black leading-[1.1] text-slate-900 md:text-7xl">
              Product
            </TextReveal>
          </div>
          <ScrollReveal delay={400}>
            <p className="mt-10 max-w-xl text-base leading-[1.9] text-slate-500 md:text-lg">
              業種ごとに最適化されたLINE運用プラットフォーム「Lオペ」シリーズ
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* ── プロダクトカード一覧 ── */}
      <section className="space-y-16 px-6 pb-20 md:px-16 md:pb-32">
        {PRODUCTS.map((product, idx) => (
          <div key={product.name} className="mx-auto max-w-6xl">
            <ScrollReveal direction="scale">
              <TiltCard className="rounded-[2rem] shadow-2xl shadow-slate-200/30" maxTilt={4}>
                <div className="overflow-hidden rounded-[2rem]">
                  {/* ダークヘッダー */}
                  <div className="relative bg-[#050608] px-8 py-16 md:px-16 md:py-24">
                    <div
                      className="pointer-events-none absolute inset-0 opacity-[0.03]"
                      style={{
                        backgroundImage: `linear-gradient(${product.color}4d 1px, transparent 1px), linear-gradient(90deg, ${product.color}4d 1px, transparent 1px)`,
                        backgroundSize: "40px 40px",
                      }}
                    />
                    <div className="relative">
                      <div className="flex flex-wrap items-center gap-3">
                        <span
                          className="rounded-full border px-4 py-1.5 text-[11px] font-bold"
                          style={{
                            borderColor: `${product.color}33`,
                            backgroundColor: `${product.color}1a`,
                            color: product.color,
                          }}
                        >
                          SaaS
                        </span>
                        {product.status === "production" ? (
                          <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-1.5 text-[11px] font-bold text-emerald-400">
                            Production
                          </span>
                        ) : (
                          <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-4 py-1.5 text-[11px] font-bold text-amber-400">
                            準備中
                          </span>
                        )}
                      </div>
                      <h2 className="mt-8 text-4xl font-black text-white md:text-6xl">
                        {product.name}
                      </h2>
                      <p className="mt-6 max-w-lg text-[15px] leading-[1.9] text-slate-400">
                        {product.desc}
                      </p>
                      {product.status === "production" ? (
                        <Link
                          href={product.href}
                          className="group mt-10 inline-flex items-center gap-2.5 rounded-full bg-white px-9 py-4 text-[13px] font-bold text-slate-900 transition-all duration-500 hover:shadow-[0_0_40px_rgba(59,130,246,0.15)]"
                          data-cursor-hover
                        >
                          サービスサイトへ
                          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3 w-3 transition-transform duration-500 group-hover:translate-x-1.5">
                            <path d="M3 8h10m-4-4 4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </Link>
                      ) : (
                        <span className="mt-10 inline-flex items-center gap-2 rounded-full border border-slate-700 px-9 py-4 text-[13px] font-medium text-slate-500">
                          Coming Soon
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 機能グリッド */}
                  <div className={`grid grid-cols-2 gap-px bg-slate-100 ${product.features.length > 4 ? "md:grid-cols-4" : "md:grid-cols-4"}`}>
                    {product.features.map((f, i) => (
                      <ScrollReveal key={f.label} delay={i * 40}>
                        <div className="h-full bg-white p-6 transition-colors duration-300 hover:bg-slate-50 md:p-8">
                          <p className="text-[13px] font-bold text-slate-900">{f.label}</p>
                          <p className="mt-2 text-[12px] leading-relaxed text-slate-500">{f.desc}</p>
                        </div>
                      </ScrollReveal>
                    ))}
                  </div>
                </div>
              </TiltCard>
            </ScrollReveal>
          </div>
        ))}
      </section>
    </div>
  );
}
