"use client";

import { Section, Label, Title, Sub } from "./shared";
import { StaggerChildren, StaggerItem } from "./animations";

/* 主要6機能 */
const features = [
  {
    title: "予約管理",
    desc: "LINE上で予約の受付・変更・キャンセルが完結。ホットペッパー連携（予定）で予約を一元管理。リマインド自動配信で無断キャンセルを防止。",
    icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
    color: "bg-pink-50 text-pink-600",
  },
  {
    title: "顧客管理・来店履歴",
    desc: "お客様の来店回数・施術履歴・担当スタッフ・好みのメニューを一元管理。次回来店時に最適な提案ができる環境を構築。",
    icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
    color: "bg-violet-50 text-violet-600",
  },
  {
    title: "セグメント配信",
    desc: "来店回数・メニュー・担当スタッフ・最終来店日などで配信対象を絞り込み。リピート促進や休眠顧客の掘り起こしに最適。",
    icon: "M13 10V3L4 14h7v7l9-11h-7z",
    color: "bg-amber-50 text-amber-600",
  },
  {
    title: "リッチメニュー管理",
    desc: "ノーコードのビルダーでリッチメニューを自由に設計。予約・クーポン・スタンプカードへの導線をLINE画面に常時表示。",
    icon: "M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z",
    color: "bg-sky-50 text-sky-600",
  },
  {
    title: "スタンプカード・ポイント",
    desc: "紙のポイントカードをLINEでデジタル化。来店ごとに自動スタンプ付与。特典設定でリピート来店を促進。",
    icon: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z",
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    title: "物販・EC機能",
    desc: "サロン専売品やホームケア商品をLINE上で販売。在庫管理・発送管理まで一元化。施術後のクロスセルで客単価アップ。",
    icon: "M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z",
    color: "bg-rose-50 text-rose-600",
  },
];

export default function Features() {
  return (
    <Section id="features">
      <div className="text-center">
        <Label>FEATURES</Label>
        <Title>サロン運営に必要な機能を<br className="md:hidden" />オールインワンで</Title>
        <Sub>予約管理から物販まで。Lオペ for SALONなら1つの管理画面でサロンのLINE運用がすべて完結します。</Sub>
      </div>
      <StaggerChildren className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <StaggerItem key={f.title}>
            <div className="group rounded-2xl border border-slate-100 bg-white p-6 transition hover:border-pink-200 hover:shadow-lg">
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
