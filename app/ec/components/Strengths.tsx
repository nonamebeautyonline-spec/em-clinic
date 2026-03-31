"use client";

import { Section } from "./shared";
import { SlideIn } from "./animations";

export default function Strengths() {
  const cards = [
    {
      num: "01",
      title: "EC特化の設計思想",
      sub: "汎用ツールにはない購買データ連携",
      points: [
        "購買履歴・カート情報・配送ステータスとLINEを自動連携。ECサイトの顧客データをそのままLINE配信に活用できる",
        "RFM分析・LTV予測・離脱予兆スコアなど、EC特有の指標に基づくセグメント配信で、売上に直結するメッセージングを実現",
        "カゴ落ち通知・レビュー依頼・再購入リマインドなど、ECの購買サイクルに最適化された自動配信テンプレートを標準搭載",
      ],
    },
    {
      num: "02",
      title: "導入から成果まで最短距離",
      sub: "複雑な設定不要で即日運用開始",
      points: [
        "主要ECカート（Shopify・BASE・STORES・EC-CUBE等）とのワンクリック連携で、技術的な設定なしで導入可能",
        "業態別テンプレートを選ぶだけで、カゴ落ち対策・発送通知・リピート促進の自動配信シナリオが即座に稼働",
        "導入初月から平均15%のカゴ落ち回収率を達成。設定代行サポートで現場の負担をほぼゼロに",
      ],
    },
    {
      num: "03",
      title: "売上貢献を可視化",
      sub: "投資対効果がひと目でわかる",
      points: [
        "LINE経由の売上・注文数・客単価をリアルタイムで計測。配信施策ごとのROIが管理画面上で一目瞭然",
        "クーポン利用率・カゴ落ち回収金額・リピート率の推移をグラフで可視化。経営判断に必要なデータを常時提供",
        "月次レポートの自動生成で、マーケティング会議の準備工数を削減。過去施策との比較分析も容易に",
      ],
    },
  ];

  return (
    <Section id="strengths" className="bg-slate-900 text-white">
      <div className="text-center">
        <span className="mb-4 inline-block rounded-full bg-amber-500/10 px-4 py-1.5 text-[11px] font-semibold tracking-[.18em] text-amber-400 uppercase">STRENGTHS</span>
        <h2 className="mb-5 text-[1.7rem] font-extrabold leading-snug tracking-tight text-white md:text-4xl">Lオペ for ECが選ばれる<br className="md:hidden" />3つの理由</h2>
        <p className="mx-auto mb-16 max-w-2xl text-[14px] leading-relaxed text-slate-400">EC特化設計、かんたん導入、売上可視化。LINE運用でEC売上を最大化するための基盤がすべて揃っています。</p>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {cards.map((s, i) => (
          <SlideIn key={s.num} from={i % 2 === 0 ? "left" : "right"} delay={i * 0.1}>
            <div className="flex h-full flex-col rounded-2xl border border-slate-700/50 bg-slate-800/40 p-7 backdrop-blur">
              <div className="mb-3 bg-gradient-to-r from-amber-400 to-yellow-400 bg-clip-text text-3xl font-black text-transparent">{s.num}</div>
              <h3 className="mb-1 text-lg font-bold">{s.title}</h3>
              <p className="mb-5 text-[11px] font-semibold text-amber-400">{s.sub}</p>
              <ul className="flex-1 space-y-3">{s.points.map((p, pi) => <li key={pi} className="flex gap-3 text-[12px] leading-relaxed text-slate-300"><span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-[8px] text-amber-400">&#10003;</span>{p}</li>)}</ul>
            </div>
          </SlideIn>
        ))}
      </div>
    </Section>
  );
}
