"use client";

import { Section, Label, Title, Sub } from "./shared";
import { StaggerChildren, StaggerItem } from "./animations";

/* 主要6機能 */
const features = [
  {
    title: "発送管理・配送通知",
    desc: "注文確認から発送完了・配達完了まで、配送ステータスの変更に応じてLINEで自動通知。顧客からの問い合わせを大幅に削減。",
    icon: "M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0",
    color: "bg-amber-50 text-amber-700",
  },
  {
    title: "カゴ落ち対策",
    desc: "カートに商品を残したまま離脱した顧客にLINEでリマインド通知。タイミングとメッセージを最適化し、カゴ落ち回収率を改善。",
    icon: "M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z",
    color: "bg-rose-50 text-rose-600",
  },
  {
    title: "顧客CRM・購買分析",
    desc: "購買履歴・金額・頻度・商品カテゴリで顧客を自動分類。RFM分析に基づくセグメント管理で、最適なアプローチを実現。",
    icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
    color: "bg-stone-50 text-stone-600",
  },
  {
    title: "セグメント配信",
    desc: "購買金額・商品カテゴリ・購入頻度・最終購入日などEC特有の条件で配信対象を絞り込み。ブロック率を下げながらCV率を向上。",
    icon: "M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z",
    color: "bg-violet-50 text-violet-600",
  },
  {
    title: "クーポン・ポイント管理",
    desc: "誕生日クーポン・初回購入特典・ランクアップ通知など、シナリオに応じたクーポンを自動発行。リピート率を効率的に引き上げ。",
    icon: "M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z",
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    title: "分析ダッシュボード",
    desc: "売上推移・配信効果・セグメント別CV率・リピート率をリアルタイムで可視化。データドリブンなEC運営を支援。",
    icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
    color: "bg-sky-50 text-sky-600",
  },
];

export default function Features() {
  return (
    <Section id="features">
      <div className="text-center">
        <Label>FEATURES</Label>
        <Title>ECに必要なLINE機能を<br className="md:hidden" />オールインワンで</Title>
        <Sub>複数ツールを使い分ける必要はありません。Lオペ for ECなら1つの管理画面でEC向けLINE運用のすべてが完結します。</Sub>
      </div>
      <StaggerChildren className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <StaggerItem key={f.title}>
            <div className="group rounded-2xl border border-slate-100 bg-white p-6 transition hover:border-amber-200 hover:shadow-lg">
              <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${f.color}`}>
                <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true"><path d={f.icon} /></svg>
              </div>
              <h3 className="mb-2 text-[15px] font-bold text-slate-800">{f.title}</h3>
              <p className="text-[13px] leading-relaxed text-slate-400">{f.desc}</p>
            </div>
          </StaggerItem>
        ))}
      </StaggerChildren>
    </Section>
  );
}
