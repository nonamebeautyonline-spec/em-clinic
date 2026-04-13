"use client";

import { Section, Label, Title, Sub } from "./shared";
import { FadeIn, StaggerChildren, StaggerItem } from "./animations";

/* ═══════════════════════════════════════════════════════════════════════════
   コラム記事ピックアップ — LP→Pillar記事への内部リンク強化セクション
   SEO目的: 主要キーワードのPillar記事への導線を確保し、トピッククラスターを形成
   ═══════════════════════════════════════════════════════════════════════════ */

const pillarArticles = [
  {
    slug: "line-operation-guide",
    title: "クリニックでLINE公式アカウントを活用する方法【完全ガイド】",
    description: "導入手順・友だち集め・セグメント配信・予約管理・AI自動返信まで、クリニックのLINE公式アカウント運用の全てを解説。",
    category: "LINE運用",
    accent: "from-blue-500 to-sky-500",
  },
  {
    slug: "online-medical-line",
    title: "オンライン診療をLINEで始める方法",
    description: "予約・問診・ビデオ通話・決済をLINE公式アカウントで完結。LINEドクター終了後の最適な代替手段を紹介。",
    category: "オンライン診療",
    accent: "from-emerald-500 to-teal-500",
  },
  {
    slug: "clinic-line-case-studies",
    title: "クリニック LINE活用事例5選",
    description: "予約・問診・AI返信の導入成果を公開。実際のクリニックがLINE公式アカウントで業務効率化に成功した事例集。",
    category: "導入事例",
    accent: "from-violet-500 to-purple-500",
  },
  {
    slug: "lstep-vs-clinic-tool",
    title: "クリニック向けLINEツール比較 — Lステップ・Liny vs 専用ツール",
    description: "汎用LINE配信ツールとクリニック専用ツールの機能・費用・運用負荷を徹底比較。",
    category: "ツール比較",
    accent: "from-amber-500 to-orange-500",
  },
  {
    slug: "online-clinic-complete-guide",
    title: "オンライン診療×LINE公式アカウント完全ガイド",
    description: "届出手続き・システム選定・集患方法・運用ノウハウ・法規制まで網羅的に解説。",
    category: "オンライン診療",
    accent: "from-rose-500 to-pink-500",
  },
  {
    slug: "clinic-line-automation",
    title: "クリニック LINE自動化ガイド",
    description: "予約・問診・返信の手動業務をゼロにする方法。AI自動返信・ステップ配信・リマインドの設定術。",
    category: "業務効率化",
    accent: "from-cyan-500 to-blue-500",
  },
];

export default function ColumnPickup() {
  return (
    <Section id="column" className="bg-gradient-to-b from-slate-50 to-white">
      <div className="text-center">
        <Label>COLUMN</Label>
        <Title>クリニックのLINE公式アカウント運用に役立つコラム</Title>
        <Sub>クリニック経営者・院長向けに、LINE公式アカウントの活用方法・オンライン診療との連携・導入事例を詳しく解説しています。</Sub>
      </div>
      <StaggerChildren className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {pillarArticles.map((a) => (
          <StaggerItem key={a.slug}>
            <a
              href={`/clinic/column/${a.slug}`}
              className="group flex h-full flex-col rounded-2xl border border-slate-100 bg-white p-6 transition hover:border-blue-200 hover:shadow-lg hover:shadow-blue-50"
            >
              <span className={`mb-3 inline-flex w-fit rounded-full bg-gradient-to-r ${a.accent} px-3 py-1 text-[10px] font-bold text-white`}>
                {a.category}
              </span>
              <h3 className="mb-2 text-[15px] font-bold leading-snug tracking-tight text-slate-800 group-hover:text-blue-600 transition">
                {a.title}
              </h3>
              <p className="flex-1 text-[12px] leading-relaxed text-slate-400">{a.description}</p>
              <span className="mt-4 text-[12px] font-semibold text-blue-500 group-hover:text-blue-600 transition">
                記事を読む →
              </span>
            </a>
          </StaggerItem>
        ))}
      </StaggerChildren>
      <FadeIn delay={0.3}>
        <div className="mt-8 text-center">
          <a
            href="/clinic/column"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-8 py-3.5 text-[13px] font-bold text-slate-600 transition hover:border-blue-200 hover:text-blue-600"
          >
            コラム一覧を見る
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </a>
        </div>
      </FadeIn>
    </Section>
  );
}
