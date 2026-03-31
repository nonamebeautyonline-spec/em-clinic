"use client";

import { Section } from "./shared";
import { SlideIn } from "./animations";

export default function Strengths() {
  const cards = [
    {
      num: "01",
      title: "サロン業態に特化した設計",
      sub: "汎用ツールでは実現できない専門機能",
      points: [
        "美容室・ネイル・エステ・まつげ・脱毛など、サロン業態ごとの運用パターンをテンプレート化。導入初日から最適な運用を開始できます",
        "スタンプカード・来店履歴・担当スタッフ管理など、サロン特有の機能を標準搭載。汎用ツールのカスタマイズ不要で即戦力",
        "ホットペッパー連携（予定）でWeb予約とLINE予約を一元管理。予約管理の二重運用から解放されます",
      ],
    },
    {
      num: "02",
      title: "リピート率を劇的に改善",
      sub: "データに基づく再来店施策",
      points: [
        "来店回数・メニュー・最終来店日に基づくセグメント配信で、一人ひとりに最適なタイミングでアプローチ。休眠顧客の掘り起こしも自動化",
        "デジタルスタンプカードで来店動機を創出。特典の自動付与でスタッフの手間もゼロ。リピート率を平均20%向上",
        "施術後のフォローメッセージ・次回予約の案内・誕生日クーポンなど、関係構築シナリオを自動配信",
      ],
    },
    {
      num: "03",
      title: "導入も運用もかんたん",
      sub: "ITが苦手でも安心のサポート体制",
      points: [
        "専任担当者がLINE公式アカウントの設定からリッチメニュー構築、配信シナリオの設計までをサポート。導入の手間はほぼゼロ",
        "管理画面はスマホ・タブレットに完全対応。施術の合間にも予約確認や顧客情報の閲覧が可能",
        "チャットサポートは平日10時〜19時対応。操作方法だけでなく、リピート施策の相談にも対応します",
      ],
    },
  ];

  return (
    <Section id="strengths" className="bg-slate-900 text-white">
      <div className="text-center">
        <span className="mb-4 inline-block rounded-full bg-pink-500/10 px-4 py-1.5 text-[11px] font-semibold tracking-[.18em] text-pink-400 uppercase">STRENGTHS</span>
        <h2 className="mb-5 text-[1.7rem] font-extrabold leading-snug tracking-tight text-white md:text-4xl">Lオペ for SALONが<br className="md:hidden" />選ばれる3つの理由</h2>
        <p className="mx-auto mb-16 max-w-2xl text-[14px] leading-relaxed text-slate-400">サロン特化の専門設計、リピート率の改善、かんたん導入。サロン経営を次のステージへ導く基盤がすべて揃っています。</p>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {cards.map((s, i) => (
          <SlideIn key={s.num} from={i % 2 === 0 ? "left" : "right"} delay={i * 0.1}>
            <div className="flex h-full flex-col rounded-2xl border border-slate-700/50 bg-slate-800/40 p-7 backdrop-blur">
              <div className="mb-3 bg-gradient-to-r from-pink-400 to-rose-400 bg-clip-text text-3xl font-black text-transparent">{s.num}</div>
              <h3 className="mb-1 text-lg font-bold">{s.title}</h3>
              <p className="mb-5 text-[11px] font-semibold text-pink-400">{s.sub}</p>
              <ul className="flex-1 space-y-3">{s.points.map((p, pi) => <li key={pi} className="flex gap-3 text-[12px] leading-relaxed text-slate-300"><span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-pink-500/20 text-[8px] text-pink-400">&#10003;</span>{p}</li>)}</ul>
            </div>
          </SlideIn>
        ))}
      </div>
    </Section>
  );
}
