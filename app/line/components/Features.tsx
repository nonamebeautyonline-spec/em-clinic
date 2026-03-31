"use client";

import { Section, Label, Title, Sub } from "./shared";
import { StaggerChildren, StaggerItem } from "./animations";

/* 主要6機能 */
const features = [
  {
    title: "セグメント配信",
    desc: "タグ・属性・行動履歴で配信対象を精密に絞り込み。必要な人に必要なメッセージだけを届け、ブロック率を低減。",
    icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
    color: "bg-emerald-50 text-[#06C755]",
  },
  {
    title: "シナリオ配信",
    desc: "友だち追加後のステップ配信やイベントトリガーに応じた自動メッセージで、顧客との関係構築を自動化。",
    icon: "M13 10V3L4 14h7v7l9-11h-7z",
    color: "bg-amber-50 text-amber-600",
  },
  {
    title: "リッチメニュー管理",
    desc: "ノーコードのビルダーで自由にリッチメニューを設計。ユーザーの属性に応じたメニュー出し分けにも対応。",
    icon: "M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z",
    color: "bg-violet-50 text-violet-600",
  },
  {
    title: "予約管理",
    desc: "LINE上で予約の受付・変更・キャンセルが完結。リマインド自動配信で無断キャンセルを防止。",
    icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    title: "フォーム作成",
    desc: "アンケート・申し込み・問い合わせフォームをノーコードで作成。回答データはCRMに自動連携。",
    icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    color: "bg-pink-50 text-pink-600",
  },
  {
    title: "分析ダッシュボード",
    desc: "配信の開封率・クリック率・CV率をリアルタイムで可視化。友だち推移やセグメント別の効果測定も。",
    icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
    color: "bg-green-50 text-green-600",
  },
];

export default function Features() {
  return (
    <Section id="features">
      <div className="text-center">
        <Label>FEATURES</Label>
        <Title>LINE運用に必要な機能を<br className="md:hidden" />オールインワンで</Title>
        <Sub>複数ツールを使い分ける必要はありません。Lオペなら1つの管理画面でLINE運用のすべてが完結します。</Sub>
      </div>
      <StaggerChildren className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <StaggerItem key={f.title}>
            <div className="group rounded-2xl border border-slate-100 bg-white p-6 transition hover:border-emerald-200 hover:shadow-lg">
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
