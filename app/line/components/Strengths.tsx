"use client";

import { Section } from "./shared";
import { SlideIn } from "./animations";

export default function Strengths() {
  const cards = [
    {
      num: "01",
      title: "直感的なUI設計",
      sub: "ITに詳しくなくても即戦力",
      points: [
        "ドラッグ&ドロップ操作を中心としたノーコード設計。リッチメニュー・シナリオ・フォームをマウス操作だけで構築可能",
        "初回ログインから5分で配信開始できる導線設計。チュートリアルやテンプレートが充実しており、はじめてのLINE運用でも迷わない",
        "管理画面はスマホ・タブレットにも完全対応。外出先からでも配信状況の確認やメッセージ送信が可能",
      ],
    },
    {
      num: "02",
      title: "圧倒的な低コスト",
      sub: "フリープランから始められる",
      points: [
        "月額0円のフリープランで基本機能をすべて利用可能。友だち数の増加に合わせてプランを段階的にアップグレード",
        "配信ツール・予約ツール・フォームツール・分析ツールを個別契約すると月5〜15万円。Lオペならオールインワンでコストを大幅に削減",
        "従量課金なし。月額固定で予算管理がしやすく、配信数の増加に伴う想定外のコスト発生を防止",
      ],
    },
    {
      num: "03",
      title: "手厚いサポート体制",
      sub: "導入から運用まで伴走",
      points: [
        "専任担当者がLINE公式アカウントの初期設定からリッチメニュー構築、配信戦略の立案までサポート。導入の負担をほぼゼロに",
        "チャットサポートは平日10時〜19時対応。操作方法だけでなく、配信内容の相談や効果改善の提案にも対応",
        "導入事例やベストプラクティスをもとにした運用改善の提案を定期的に実施。成果が出る運用を一緒に作り上げます",
      ],
    },
  ];

  return (
    <Section id="strengths" className="bg-slate-900 text-white">
      <div className="text-center">
        <span className="mb-4 inline-block rounded-full bg-emerald-500/10 px-4 py-1.5 text-[11px] font-semibold tracking-[.18em] text-emerald-400 uppercase">STRENGTHS</span>
        <h2 className="mb-5 text-[1.7rem] font-extrabold leading-snug tracking-tight text-white md:text-4xl">Lオペが選ばれる<br className="md:hidden" />3つの理由</h2>
        <p className="mx-auto mb-16 max-w-2xl text-[14px] leading-relaxed text-slate-400">直感的なUI、低コスト、手厚いサポート。LINE運用を成功に導くための基盤がLオペにはすべて揃っています。</p>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {cards.map((s, i) => (
          <SlideIn key={s.num} from={i % 2 === 0 ? "left" : "right"} delay={i * 0.1}>
            <div className="flex h-full flex-col rounded-2xl border border-slate-700/50 bg-slate-800/40 p-7 backdrop-blur">
              <div className="mb-3 bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-3xl font-black text-transparent">{s.num}</div>
              <h3 className="mb-1 text-lg font-bold">{s.title}</h3>
              <p className="mb-5 text-[11px] font-semibold text-emerald-400">{s.sub}</p>
              <ul className="flex-1 space-y-3">{s.points.map((p, pi) => <li key={pi} className="flex gap-3 text-[12px] leading-relaxed text-slate-300"><span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-[8px] text-emerald-400">&#10003;</span>{p}</li>)}</ul>
            </div>
          </SlideIn>
        ))}
      </div>
    </Section>
  );
}
